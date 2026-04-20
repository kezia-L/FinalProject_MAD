// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export interface FoodAnalysisResult {
  detectedFood: string;
  confidence: number;
  portionGram: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  healthScore: number;
  description: string;
  healthTips: string[];
}

export interface ChatMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export async function analyzeFoodImage(
  imageBase64: string,
  mimeType: string = "image/jpeg",
): Promise<FoodAnalysisResult> {
  const prompt = `Analyze this food image and return ONLY a valid JSON object with exactly these fields:
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
- confidence: 0.0 to 1.0 (how confident you are about the food)
- portionGram: estimated portion size in grams
- calories, protein, carbs, fat, fiber: nutritional values per the estimated portion
- healthScore: 1 (very unhealthy) to 5 (very healthy)
- healthTips: 3 practical tips about this food
- All text fields must be in Indonesian (Bahasa Indonesia)
- Return ONLY the JSON, no markdown, no extra text`;

  try {
    const result = await geminiModel.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean the response
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error("Error analyzing food image:", error);
    throw new Error("Failed to analyze food image");
  }
}

export async function chatWithAI(
  messages: ChatMessage[],
  userProfile?: any,
): Promise<string> {
  const systemInstruction = `Kamu adalah asisten nutrisi cerdas bernama HealthMate AI.
Kamu membantu pengguna dengan pertanyaan seputar nutrisi, diet, kesehatan, dan gaya hidup sehat.
Berikan jawaban yang akurat, praktis, dan mudah dipahami dalam Bahasa Indonesia.
Jika ada informasi profil pengguna, pertimbangkan dalam jawabanmu.
${userProfile ? `Profil pengguna: ${JSON.stringify(userProfile)}` : ""}
Selalu berikan saran yang positif dan memotivasi.`;

  try {
    const chat = geminiModel.startChat({
      history: messages.slice(0, -1), // Exclude the last message as it's the new user input
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error chatting with AI:", error);
    throw new Error("Failed to get AI response");
  }
}

export async function generateMealPlan(userProfile: any): Promise<any> {
  const { goal, dailyCalorieTarget, weight, height, age } = userProfile;
  const targetCal = dailyCalorieTarget ?? 2000;

  const prompt = `Buat rencana makan harian dalam Bahasa Indonesia untuk seseorang dengan profil berikut:
- Tujuan: ${goal ?? "hidup sehat"}
- Target kalori harian: ${targetCal} kkal
- Berat badan: ${weight ?? "tidak diketahui"} kg
- Tinggi badan: ${height ?? "tidak diketahui"} cm
- Usia: ${age ?? "tidak diketahui"} tahun

Kembalikan HANYA JSON valid dengan format berikut:
{
  "breakfast": [{"name": "nama makanan", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "portion": "ukuran porsi"}],
  "lunch": [...],
  "dinner": [...],
  "snacks": [...],
  "totalCalories": 0,
  "notes": "catatan singkat tentang rencana makan ini"
}

Pastikan total kalori mendekati ${targetCal} kkal.
Gunakan makanan Indonesia yang mudah didapat.
Return ONLY the JSON, no markdown.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw new Error("Failed to generate meal plan");
  }
}
