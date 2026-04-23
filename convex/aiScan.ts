"use node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const FOOD_ANALYSIS_PROMPT = `Analyze this food image and return ONLY a valid JSON object with exactly these fields:
{
  "detectedFood": "name of the food in Indonesian",
  "confidence": 0.95,
  "portionGram": 100,
  "calories": 250,
  "protein": 12,
  "carbs": 35,
  "fat": 8,
  "fiber": 3,
  "healthScore": 4,
  "description": "brief description of the food in Indonesian",
  "healthTips": ["tip 1 in Indonesian", "tip 2 in Indonesian", "tip 3 in Indonesian"]
}

Rules:
- confidence: 0.0 to 1.0
- portionGram: estimated portion size in grams
- calories, protein, carbs, fat, fiber: nutritional values per the estimated portion
- healthScore: 1 (very unhealthy) to 5 (very healthy)
- healthTips: 3 practical tips about this food
- All text fields must be in Indonesian (Bahasa Indonesia)
- Return ONLY the JSON, no markdown, no extra text
- CRITICAL: If the image does NOT contain any food or drink (e.g. furniture, tools, pets, random objects), set "detectedFood" to "Bukan Makanan", "confidence" to 0, and "description" to "Objek bukan makanan".`;

export const analyzeFood = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.optional(v.string()),
    customModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Inisialisasi Model Langsung
    const apiKey = process.env.GEMINI_API_KEY_SCAN ?? "";
    if (!apiKey || apiKey === "MOCK") {
      // MOCK FALLBACK
      console.log("Using Mock for analyzeFood");
      const mockData = {
        detectedFood: "Abon",
        confidence: 0.92,
        portionGram: 100,
        calories: 280,
        protein: 9.2,
        carbs: 0,
        fat: 28.4,
        fiber: 0,
        healthScore: 3,
        description: "Data diambil dari Mock Fallback.",
        healthTips: ["Imbangi dengan sayuran untuk serat"]
      };
      return { success: true, isFood: true, data: mockData, rawResponse: JSON.stringify(mockData) };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = args.customModel || "gemini-3-flash-preview";
    const model = genAI.getGenerativeModel({ model: modelName });
    const mimeType = args.mimeType ?? "image/jpeg";
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: args.imageBase64,
          },
        },
        FOOD_ANALYSIS_PROMPT,
      ]);

      const text = result.response.text();
      const cleaned = text.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      if (parsed.detectedFood === "Bukan Makanan") {
        return { success: true, isFood: false, data: parsed, rawResponse: cleaned };
      }

      // DATABASE OVERRIDE
      const dbFood = await ctx.runQuery(internal.foods.searchFoodByName, { 
        name: parsed.detectedFood
      });

      if (dbFood) {
        const multiplier = parsed.portionGram / 100;
        parsed.detectedFood = dbFood.name; 
        parsed.calories = Math.round(dbFood.calories * multiplier);
        parsed.protein = Number((dbFood.protein * multiplier).toFixed(1));
        parsed.carbs = Number((dbFood.carbs * multiplier).toFixed(1));
        parsed.fat = Number((dbFood.fat * multiplier).toFixed(1));
        parsed.description = `Data divalidasi dari Database Nutrisi (kecocokan: ${dbFood.name}). AI mengestimasi porsi ${parsed.portionGram}g.`;
      } else {
        parsed.description = parsed.description + " (Data estimasi AI, tidak ditemukan di database)";
      }

      return { success: true, isFood: true, data: parsed, rawResponse: cleaned };
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      throw new Error(`Gagal menganalisis gambar: ${error.message}`);
    }
  },
});
