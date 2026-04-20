"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const FOOD_ANALYSIS_PROMPT = `Analyze this food image and return ONLY a valid JSON object with exactly these fields:
{
  "detectedFood": "name of the food in Indonesian",
  "confidence": 0.95,
  "portionGram": 150,
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
function getAIModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "AIzaSyCb1dXGRBt9Kv6UctAQyV8kYLS7x5QX-yI" || apiKey === "MOCK") {
    // If key is missing or is the placeholder/mock key, return null to trigger mock fallback
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

export const analyzeFood = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = getAIModel();
    const mimeType = args.mimeType ?? "image/jpeg";

    if (!model) {
      // MOCK FALLBACK
      console.log("Using Mock for analyzeFood");
      const mockData = {
        detectedFood: "Nasi Putih",
        confidence: 0.92,
        portionGram: 150,
        calories: 205,
        protein: 4.3,
        carbs: 44.5,
        fat: 0.4,
        fiber: 0.6,
        healthScore: 3,
        description: "Nasi putih adalah makanan pokok sumber karbohidrat utama.",
        healthTips: [
          "Imbangi dengan sayuran untuk serat",
          "Tambahkan protein seperti telur atau ayam",
          "Kontrol porsi jika sedang diet"
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
    const model = getAIModel();
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
    const model = getAIModel();
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
