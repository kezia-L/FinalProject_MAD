"use node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import { action } from "./_generated/server";

const AVAILABLE_MODELS = {
  "gemini-3.1-flash-lite": "gemini-3.1-flash-lite-preview",
  "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "gemma-4-31b": "gemma-4-31b-it",
  "gemma-4-26b": "gemma-4-26b-a4b-it",
};

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
    customModel: v.optional(v.string()),
    currentTime: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Inisialisasi Model Langsung
    const apiKey = process.env.GEMINI_API_KEY_CHAT || process.env.GEMINI_API_KEY_SCAN || "";
    if (!apiKey || apiKey === "MOCK") return { success: false, response: "AI Mode simulasi (API Key tidak ditemukan)." };

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Logika pemetaan model di Backend
    const selectedKey = args.customModel || "gemini-3.1-flash-lite";
    const modelName = AVAILABLE_MODELS[selectedKey as keyof typeof AVAILABLE_MODELS] || AVAILABLE_MODELS["gemma-4-31b"];
    
    const model = genAI.getGenerativeModel({ model: modelName });

    const lastMessage = args.messages[args.messages.length - 1].parts[0].text;

    const systemInstruction = `Kamu adalah HealthMate AI. Bantu pengguna dengan nutrisi/kesehatan dalam Bahasa Indonesia. 
    Waktu lokal sekarang: ${args.currentTime || "Tidak diketahui"}.
    ${args.userProfile ? `Profil User: ${JSON.stringify(args.userProfile)}` : ""}`;

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
