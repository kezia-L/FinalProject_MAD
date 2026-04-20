// lib/nutrition.ts
import { DailyNutrition, FoodLog } from "./types";
import { COLORS } from "./constants";

export function calculateBMR(
  weight: number, // kg
  height: number, // cm
  age: number,
  gender: "male" | "female" = "male"
): number {
  // Mifflin-St Jeor Equation
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: number = 1.375): number {
  return Math.round(bmr * activityLevel);
}

export function calculateTotals(logs: FoodLog[]): DailyNutrition {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function getPercentage(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export function getCalorieStatus(
  consumed: number,
  target: number
): { label: string; color: string } {
  const percent = (consumed / target) * 100;
  if (percent < 50) return { label: "Di Bawah Target", color: COLORS.secondary };
  if (percent < 90) return { label: "Bagus!", color: COLORS.primary };
  if (percent < 100) return { label: "Hampir Tercapai", color: COLORS.accent };
  if (percent < 110) return { label: "Target Tercapai!", color: COLORS.primary };
  return { label: "Melebihi Target", color: COLORS.danger };
}

export function formatCalories(calories: number): string {
  return Math.round(calories).toString();
}

export function getMacroPercentages(protein: number, carbs: number, fat: number) {
  const totalCal = protein * 4 + carbs * 4 + fat * 9;
  if (totalCal === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((protein * 4 / totalCal) * 100),
    carbs: Math.round((carbs * 4 / totalCal) * 100),
    fat: Math.round((fat * 9 / totalCal) * 100),
  };
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDateString(d));
  }
  return days;
}
