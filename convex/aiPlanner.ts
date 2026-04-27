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
    const modelName = args.customModel || "gemma-3-1b-it";
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 1.0, // Meningkatkan variasi jawaban
        topP: 0.95,
      }
    });
    const targetCal = args.userProfile.dailyCalorieTarget ?? 2000;

    const prompt = `
    Anda adalah Pakar Nutrisi AI Profesional yang ahli dalam kuliner sehat Indonesia. 
    Tugas Anda adalah merancang rencana makan harian yang SEHAT, BERGIZI, dan LEZAT untuk user dengan target ${targetCal} kkal.
    
    DATA USER:
    - Profil: ${JSON.stringify(args.userProfile)}.
    - Lokasi & Waktu: ${args.currentTime || "Indonesia"}.

    ATURAN NUTRISI SEHAT (WAJIB):
    1. CARA MASAK: Utamakan Kukus, Rebus, Bakar/Panggang, atau Pepes. Hindari Gorengan (deep-fried) dan penggunaan santan kental yang berlebihan.
    2. SUMBER KARBO: Utamakan karbohidrat kompleks seperti Nasi Merah, Nasi Hitam, Ubi, atau Gandum.
    3. PROTEIN: Fokus pada Dada Ayam, Ikan, Tempe, Tahu, atau Daging Tanpa Lemak. Berikan rincian Protein (P), Karbohidrat (K), dan Lemak (L) yang akurat.
    4. SERAT: WAJIB menyertakan sayuran (vegetables) pada setiap menu utama (Breakfast, Lunch, Dinner).
    5. CEMILAN: Berupa buah-buahan segar, yogurt, atau kacang-kacangan sehat.
    6. LOKASI: Sesuaikan menu dengan daerah user (WIB/WITA/WIT). Pastikan bahan mudah ditemukan di pasar lokal.
    7. VARIASI: Berikan 3 OPSI menu untuk setiap kategori (breakfast, lunch, dinner, snacks) agar user memiliki pilihan.

    Keluarkan HANYA JSON murni (tanpa tag markdown):
    {
      "breakfast": [{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number, "portion": string}],
      "lunch": [...],
      "dinner": [...],
      "snacks": [...],
      "totalCalories": number (rata-rata kombinasi),
      "notes": string (berikan tips gizi terkait menu yang Anda buat)
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
