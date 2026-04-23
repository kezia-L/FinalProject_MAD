"use node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { action } from "./_generated/server";

export const generateMealPlan = action({
  args: {
    userProfile: v.object({
      goal: v.optional(v.string()),
      dailyCalorieTarget: v.optional(v.number()),
      weight: v.optional(v.number()),
      height: v.optional(v.number()),
      age: v.optional(v.number()),
    }),
    customModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Inisialisasi Model Langsung
    const apiKey = process.env.GEMINI_API_KEY_RECOM || process.env.GEMINI_API_KEY_SCAN || "";
    if (!apiKey || apiKey === "MOCK") {
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = args.customModel || "gemini-2.5-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelName });
    const targetCal = args.userProfile.dailyCalorieTarget ?? 2000;

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
