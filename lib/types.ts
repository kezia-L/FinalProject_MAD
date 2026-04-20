// lib/types.ts
import { Id } from "../convex/_generated/dataModel";

export interface UserProfile {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "user" | "admin";
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
  dailyCalorieTarget?: number;
  createdAt: number;
}

export interface FoodItem {
  _id: Id<"foods">;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  category?: string;
  isCustom?: boolean;
}

export interface FoodLog {
  _id: Id<"foodLogs">;
  userId: Id<"users">;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionGram?: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  logDate: string;
  logTimestamp: number;
  fromScan?: boolean;
  scanId?: Id<"scanHistory">;
}

export interface ScanHistory {
  _id: Id<"scanHistory">;
  userId: Id<"users">;
  detectedFood: string;
  confidence: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionGram: number;
  aiAnalysis: string;
  scanTimestamp: number;
  isSaved: boolean;
}

export interface FoodAnalysis {
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

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeeklyData {
  date: string;
  calories: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface MealPlan {
  breakfast: MealPlanItem[];
  lunch: MealPlanItem[];
  dinner: MealPlanItem[];
  snacks: MealPlanItem[];
  totalCalories: number;
}

export interface MealPlanItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type UserRole = "user" | "admin";
export type GoalType = "lose_weight" | "maintain" | "gain_muscle" | "be_healthy";
