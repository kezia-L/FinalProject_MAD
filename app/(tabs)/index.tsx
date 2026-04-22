// app/(tabs)/index.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS, DEFAULT_DAILY_TARGETS, MEAL_TYPES } from "../../lib/constants";
import { CalorieRing } from "../../components/CalorieRing";
import { NutritionBar } from "../../components/NutritionBar";
import { FoodCard } from "../../components/FoodCard";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { calculateTotals, getDateString, getCalorieStatus } from "../../lib/nutrition";
import { FoodLog } from "../../lib/types";

export default function DashboardScreen() {
  const router = useRouter();
  const { userId, userName } = useAppStore();
  const today = getDateString();

  const userProfile = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const todayLogs = useQuery(
    api.foodLogs.getFoodLogsByDate,
    userId ? { userId: userId as Id<"users">, logDate: today } : "skip"
  );

  const targets = useMemo(() => ({
    calories: userProfile?.dailyCalorieTarget ?? DEFAULT_DAILY_TARGETS.calories,
    protein: DEFAULT_DAILY_TARGETS.protein,
    carbs: DEFAULT_DAILY_TARGETS.carbs,
    fat: DEFAULT_DAILY_TARGETS.fat,
  }), [userProfile]);

  const totals = useMemo(
    () => calculateTotals((todayLogs as FoodLog[]) ?? []),
    [todayLogs]
  );

  const calorieStatus = getCalorieStatus(totals.calories, targets.calories);

  const recentLogs = useMemo(
    () => ((todayLogs as FoodLog[]) ?? []).slice(-3).reverse(),
    [todayLogs]
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat Pagi";
    if (h < 17) return "Selamat Siang";
    return "Selamat Malam";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}, 👋</Text>
            <Text style={styles.userName}>{userName ?? "Pengguna"}</Text>
          </View>
        </View>

        {/* Calorie Ring Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Kalori Hari Ini</Text>
            <View style={[styles.statusBadge, { backgroundColor: calorieStatus.color + "20" }]}>
              <Text style={[styles.statusText, { color: calorieStatus.color }]}>
                {calorieStatus.label}
              </Text>
            </View>
          </View>

          <View style={styles.ringContainer}>
            <CalorieRing
              consumed={totals.calories}
              target={targets.calories}
              size={190}
            />
            <View style={styles.ringStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(targets.calories)}</Text>
                <Text style={styles.statLabel}>Target</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{(todayLogs ?? []).length}</Text>
                <Text style={styles.statLabel}>Log Makanan</Text>
              </View>
            </View>
          </View>

          {/* Macros */}
          <View style={styles.macroSection}>
            <NutritionBar
              label="Protein"
              current={totals.protein}
              target={targets.protein}
              color={COLORS.macro.protein}
            />
            <NutritionBar
              label="Karbohidrat"
              current={totals.carbs}
              target={targets.carbs}
              color={COLORS.macro.carbs}
            />
            <NutritionBar
              label="Lemak"
              current={totals.fat}
              target={targets.fat}
              color={COLORS.macro.fat}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push("/(tabs)/scan")}
          >
            <Text style={styles.quickBtnIcon}>📷</Text>
            <Text style={styles.quickBtnLabel}>Scan Makanan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: "#6366F1" }]}
            onPress={() => router.push("/meal-plan")}
          >
            <Text style={styles.quickBtnIcon}>📋</Text>
            <Text style={styles.quickBtnLabel}>Rencana Makan</Text>
          </TouchableOpacity>
        </View>

        {/* Meal breakdown */}
        <View style={styles.mealBreakdown}>
          <Text style={styles.sectionTitle}>Ringkasan Waktu Makan</Text>
          <View style={styles.mealGrid}>
            {MEAL_TYPES.map((meal) => {
              const mealLogs = ((todayLogs as FoodLog[]) ?? []).filter(
                (l) => l.mealType === meal.id
              );
              const mealCal = mealLogs.reduce((s, l) => s + l.calories, 0);
              return (
                <View key={meal.id} style={styles.mealChip}>
                  <Text style={styles.mealChipIcon}>{meal.icon}</Text>
                  <Text style={styles.mealChipLabel}>{meal.label}</Text>
                  <Text style={[styles.mealChipCal, { color: meal.color }]}>
                    {Math.round(mealCal)} kkal
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Log Terakhir</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/diary")}>
                <Text style={styles.seeAll}>Lihat Semua →</Text>
              </TouchableOpacity>
            </View>
            {recentLogs.map((log) => (
              <FoodCard key={log._id} log={log} compact />
            ))}
          </View>
        )}

        {/* Empty state */}
        {(todayLogs ?? []).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>Belum ada log hari ini</Text>
            <Text style={styles.emptyDesc}>
              Scan makananmu atau tambah manual lewat Diary
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(tabs)/scan")}
            >
              <Text style={styles.emptyBtnText}>📷 Scan Sekarang</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 13, color: COLORS.text.muted },
  userName: { fontSize: 22, fontWeight: "800", color: COLORS.text.primary },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  ringContainer: { alignItems: "center", marginBottom: 20 },
  ringStats: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    width: "80%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: COLORS.text.primary },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },
  macroSection: { marginTop: 8 },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickBtnIcon: { fontSize: 28, marginBottom: 4 },
  quickBtnLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  mealBreakdown: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary, marginBottom: 12 },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mealChip: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    width: "48%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealChipIcon: { fontSize: 20, marginBottom: 4 },
  mealChipLabel: { fontSize: 12, color: COLORS.text.secondary, fontWeight: "500" },
  mealChipCal: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  recentSection: { marginBottom: 16 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: COLORS.text.muted, textAlign: "center", marginBottom: 16 },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
