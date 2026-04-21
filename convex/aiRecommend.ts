"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { internal } from "./_generated/api";

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
- Return ONLY the JSON, no markdown, no extra text`;

// Helper to get the model or return null if key is missing/invalid
function getAIModel(feature: "scan" | "chat" | "recom") {
  let apiKey = "";
  if (feature === "scan") apiKey = process.env.GEMINI_API_KEY_SCAN ?? "";
  if (feature === "chat") apiKey = process.env.GEMINI_API_KEY_SCAN ?? "";
  if (feature === "recom") {
    // FALLBACK: Kunci recom terkena error 403 Forbidden dari Google, jadi kita pinjam kunci scan
    apiKey = process.env.GEMINI_API_KEY_SCAN ?? "";
  }
  
  if (!apiKey || apiKey === "MOCK") {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

export const analyzeFood = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getAIModel("scan");
    const mimeType = args.mimeType ?? "image/jpeg";

    if (!model) {
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
        healthTips: [
          "Imbangi dengan sayuran untuk serat"
        ]
      };
      return { success: true, data: mockData, rawResponse: JSON.stringify(mockData) };
    }

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
      
      // DATABASE OVERRIDE
      // We look up the food in the database
      const dbFood = await ctx.runQuery(internal.foods.searchFoodByName, { 
        name: parsed.detectedFood
      });

      if (dbFood) {
        // If found in DB, override the AI's hallucinated macros with accurate dataset values!
        // We assume dataset values are per 100g, so if the AI estimated portion is 100g, it matches nicely.
        // If portionGram is different, we adjust it relative to 100g.
        
        const multiplier = parsed.portionGram / 100;
        
        parsed.detectedFood = dbFood.name; // Use accurate name
        parsed.calories = Math.round(dbFood.calories * multiplier);
        parsed.protein = Number((dbFood.protein * multiplier).toFixed(1));
        parsed.carbs = Number((dbFood.carbs * multiplier).toFixed(1));
        parsed.fat = Number((dbFood.fat * multiplier).toFixed(1));
        parsed.description = `Data divalidasi dari Database Nutrisi (kecocokan: ${dbFood.name}). AI mengestimasi porsi ${parsed.portionGram}g.`;
      } else {
        parsed.description = parsed.description + " (Data estimasi AI, tidak ditemukan di database)";
      }

      return { success: true, data: parsed, rawResponse: cleaned };
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      throw new Error(`Gagal menganalisis gambar: ${error.message}`);
    }
  },
});

export const chatWithAI = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("model")),
        parts: v.array(v.object({ text: v.string() })),
      })
    ),
    userProfile: v.optional(
      v.object({
        goal: v.optional(v.string()),
        dailyCalorieTarget: v.optional(v.number()),
        weight: v.optional(v.number()),
        height: v.optional(v.number()),
        age: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const model = getAIModel("chat");
    const lastMessage = args.messages[args.messages.length - 1].parts[0].text;

    if (!model) {
      // MOCK FALLBACK
      let response = "Saya HealthMate AI. Maaf, saat ini saya dalam mode simulasi karena API Key belum siap.";
      if (lastMessage.toLowerCase().includes("makan")) response = "Pola makan sehat adalah kunci kebugaran. Pastikan konsumsi protein dan sayuran cukup!";
      if (lastMessage.toLowerCase().includes("diet")) response = "Untuk diet, fokuslah pada defisit kalori yang sehat dan tetap penuhi nutrisi mikro.";
      return { success: true, response };
    }

    const systemInstruction = `Kamu adalah HealthMate AI. Bantu pengguna dengan nutrisi/kesehatan dalam Bahasa Indonesia. ${
      args.userProfile ? `Profil: ${JSON.stringify(args.userProfile)}` : ""
    }`;

    try {
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "model", parts: [{ text: "Siap, saya mengerti profil pengguna." }] },
          ...args.messages.slice(0, -1)
        ],
      });

      const result = await chat.sendMessage(lastMessage);
      return { success: true, response: result.response.text() };
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      return { success: false, response: "Terjadi kesalahan saat berbincang dengan AI." };
    }
  },
});

export const generateMealPlan = action({
  args: {
    userProfile: v.object({
      goal: v.optional(v.string()),
      dailyCalorieTarget: v.optional(v.number()),
      weight: v.optional(v.number()),
      height: v.optional(v.number()),
      age: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const model = getAIModel("recom");
    const targetCal = args.userProfile.dailyCalorieTarget ?? 2000;

    if (!model) {
      // MOCK FALLBACK
      const mockPlan = {
        breakfast: [{ name: "Oatmeal Buah", calories: 300, protein: 10, carbs: 45, fat: 5, portion: "1 mangkuk" }],
        lunch: [{ name: "Ayam Bakar & Nasi", calories: 600, protein: 35, carbs: 70, fat: 15, portion: "1 porsi" }],
        dinner: [{ name: "Ikan Panggang", calories: 400, protein: 30, carbs: 10, fat: 20, portion: "150g" }],
        snacks: [{ name: "Apel", calories: 100, protein: 0, carbs: 25, fat: 0, portion: "1 buah" }],
        totalCalories: 1400,
        notes: "Ini adalah rencana makan simulasi. Segera masukkan API Key untuk hasil nyata."
      };
      return { success: true, data: mockPlan };
    }

    const prompt = `Buat rencana makan harian (${targetCal} kkal) dalam JSON untuk: ${JSON.stringify(args.userProfile)}.
Format: { "breakfast": [], "lunch": [], "dinner": [], "snacks": [], "totalCalories": number, "notes": string }.
Gunakan Bahasa Indonesia. Return ONLY JSON.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json\n?|```/g, "").trim();
      return { success: true, data: JSON.parse(cleaned) };
    } catch (error: any) {
      console.error("Meal Plan Error:", error);
      return { success: false, data: null };
    }
  },
});
