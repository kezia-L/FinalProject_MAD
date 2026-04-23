// convex/aiProgress.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { action } from "./_generated/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SCAN || "");

export const generateWeeklyInsight = action({
  args: {
    userName: v.string(),
    goal: v.optional(v.string()),
    dailyTarget: v.number(),
    weeklyData: v.array(v.object({
      date: v.string(),
      calories: v.number(),
    })),
    currentTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY_CHAT || process.env.GEMINI_API_KEY_SCAN || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const dataSummary = args.weeklyData
      .map(d => `${d.date}: ${d.calories} kkal`)
      .join("\n");

    const prompt = `
      Anda adalah HealthMate AI, asisten nutrisi personal untuk ${args.userName}.
      Tujuan user: ${args.goal || "Hidup sehat"}.
      Target kalori harian: ${args.dailyTarget} kkal.
      Waktu lokal sekarang: ${args.currentTime || "Tidak diketahui"}.

      Data asupan kalori user (mungkin kurang dari 7 hari):
      ${dataSummary}

      Berdasarkan data yang tersedia (walaupun belum lengkap 7 hari), berikan analisis singkat (maksimal 3-4 kalimat) tentang progress user. 
      Berikan nasihat yang mendalam, saran perbaikan, dan kata-kata penyemangat yang profesional namun ramah.
      Jangan mempermasalahkan data yang belum lengkap, fokus saja pada apa yang sudah ada.
      Gunakan Bahasa Indonesia yang natural. JANGAN gunakan format Markdown seperti bintang-bintang atau pagar. Berikan teks polos saja.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Bersihkan Markdown (** dan #)
      text = text.replace(/\*\*|#/g, "").trim();
      
      return text;
    } catch (error) {
      console.error("AI Insight Error:", error);
      return "Gagal mendapatkan analisis AI saat ini. Tetap semangat menjaga pola makanmu!";
    }
  },
});
