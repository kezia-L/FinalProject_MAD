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
    currentTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Inisialisasi Model Langsung
    const apiKey = process.env.GEMINI_API_KEY_SCAN || "";
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
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 1.0, // Meningkatkan variasi jawaban
        topP: 0.95,
      }
    });
    const targetCal = args.userProfile.dailyCalorieTarget ?? 2000;

    const prompt = `
    Anda adalah Pakar Nutrisi AI yang cerdas, kreatif, dan sangat paham dengan kuliner Indonesia. 
    Buat rencana makan harian yang unik dan bervariasi untuk user dengan target ${targetCal} kkal.
    
    KONTEKS PENTING:
    - Profil User: ${JSON.stringify(args.userProfile)}.
    - Waktu & Lokasi: ${args.currentTime || "Indonesia"}. 
    (Gunakan offset waktu tersebut untuk menentukan lokasi user: +07:00 adalah WIB/Barat, +08:00 adalah WITA/Tengah, +09:00 adalah WIT/Timur).
    
    ANDA WAJIB MENGIKUTI ATURAN INI:
    1. LOKASI: Sesuaikan menu dengan ketersediaan bahan makanan di lokasi user berdasarkan zona waktu tersebut. Jangan berikan menu yang sulit dicari di daerah tersebut.
    2. VARIASI MENU: Berikan menu yang berbeda dan kreatif setiap kali permintaan dibuat. JANGAN mengulangi menu yang membosankan.
    3. SPESIFIK: Berikan NAMA MAKANAN yang lengkap dan menggugah selera dalam Bahasa Indonesia.
    4. NUTRISI: Berikan angka protein, carbs, dan fat yang REALISTIS (JANGAN 0).
    5. CATATAN: Berikan catatan singkat (notes) tentang mengapa kombinasi menu ini sehat dan cocok untuk tujuan user.

    Keluarkan HANYA JSON dengan struktur ini:
    {
      "breakfast": [{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "portion": string}],
      "lunch": [...],
      "dinner": [...],
      "snacks": [...],
      "totalCalories": number,
      "notes": string
    }
    `;

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
