// lib/constants.ts
export const COLORS = {
  primary: "#16A34A",
  primaryLight: "#22C55E",
  primaryDark: "#15803D",
  primaryBg: "#F0FDF4",
  secondary: "#0EA5E9",
  accent: "#F59E0B",
  danger: "#EF4444",
  warning: "#F97316",
  success: "#16A34A",
  white: "#FFFFFF",
  black: "#000000",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  card: "#FFFFFF",
  background: "#F0FDF4",
  border: "#D1FAE5",
  text: {
    primary: "#111827",
    secondary: "#4B5563",
    muted: "#9CA3AF",
  },
  macro: {
    protein: "#3B82F6",
    carbs: "#F59E0B",
    fat: "#EF4444",
    fiber: "#8B5CF6",
  },
};

export const DEFAULT_DAILY_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 25,
};

export const MEAL_TYPES = [
  { id: "breakfast", label: "Sarapan", icon: "🌅", iconName: "sunny-outline", color: "#F59E0B" },
  { id: "lunch", label: "Makan Siang", icon: "☀️", iconName: "restaurant-outline", color: "#16A34A" },
  { id: "dinner", label: "Makan Malam", icon: "🌙", iconName: "moon-outline", color: "#6366F1" },
  { id: "snack", label: "Camilan", icon: "🍎", iconName: "nutrition-outline", color: "#EC4899" },
] as const;

export const GOAL_OPTIONS = [
  {
    id: "lose_weight",
    label: "Turunkan Berat Badan",
    icon: "📉",
    iconName: "trending-down-outline",
    color: "#F97316",
    description: "Defisit kalori untuk membakar lemak",
    calorieMultiplier: 0.8,
  },
  {
    id: "maintain",
    label: "Jaga Berat Badan",
    icon: "⚖️",
    iconName: "scale-outline",
    color: "#0EA5E9",
    description: "Pertahankan berat badan ideal",
    calorieMultiplier: 1.0,
  },
  {
    id: "gain_muscle",
    label: "Bangun Otot",
    icon: "💪",
    iconName: "fitness-outline",
    color: "#8B5CF6",
    description: "Surplus kalori untuk membangun otot",
    calorieMultiplier: 1.15,
  },
  {
    id: "be_healthy",
    label: "Hidup Sehat",
    icon: "🌿",
    iconName: "leaf-outline",
    color: "#16A34A",
    description: "Pola makan seimbang dan bergizi",
    calorieMultiplier: 1.0,
  },
] as const;

export const HEALTH_SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Sangat Buruk", color: "#EF4444" },
  2: { label: "Buruk", color: "#F97316" },
  3: { label: "Cukup", color: "#F59E0B" },
  4: { label: "Baik", color: "#84CC16" },
  5: { label: "Sangat Baik", color: "#16A34A" },
};

export const QUICK_QUESTIONS = [
  "Berapa kalori yang dibutuhkan per hari?",
  "Makanan apa yang bagus untuk diet?",
  "Apa itu protein dan fungsinya?",
  "Bagaimana cara menghitung BMI?",
  "Makanan apa yang kaya serat?",
  "Apa perbedaan karbohidrat baik dan buruk?",
];
