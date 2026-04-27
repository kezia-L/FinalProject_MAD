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
import { Ionicons } from "@expo/vector-icons";
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
  
  const activePlan = useQuery(
    api.mealPlans.getActiveMealPlan,
    userId ? { userId: userId as Id<"users"> } : "skip"
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
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{userName ?? "Pengguna"}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
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
            <View style={styles.quickIconWrapper}>
              <Ionicons name="camera-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.quickBtnLabel}>Scan Makanan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: "#6366F1" }]}
            onPress={() => router.push("/meal-plan")}
          >
            <View style={styles.quickIconWrapper}>
              <Ionicons name="calendar-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.quickBtnLabel}>Rencana Makan</Text>
          </TouchableOpacity>
        </View>

        {/* Active Meal Plan Section */}
        {activePlan && (activePlan as any).planData && (
          <View style={styles.planSection}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Menu Sehat Hari Ini</Text>
              <TouchableOpacity onPress={() => router.push("/meal-plan")}>
                <Text style={styles.seeAll}>Ganti Rencana</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.planCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planScroll}>
                {[
                  { key: 'breakfast', label: 'Sarapan', icon: 'sunny-outline', color: '#F59E0B' },
                  { key: 'lunch', label: 'Makan Siang', icon: 'restaurant-outline', color: COLORS.primary },
                  { key: 'dinner', label: 'Makan Malam', icon: 'moon-outline', color: '#6366F1' },
                  { key: 'snacks', label: 'Cemilan', icon: 'nutrition-outline', color: '#EC4899' },
                ].map((item) => {
                  const mealItems = ((activePlan as any).planData[item.key] as any[]) || [];
                  const firstMeal = mealItems[0];
                  return (
                    <View key={item.key} style={styles.planItem}>
                      <View style={[styles.planIconWrapper, { backgroundColor: item.color + "15" }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <Text style={styles.planItemLabel}>{item.label}</Text>
                      {firstMeal ? (
                        <>
                          <Text style={styles.planItemName} numberOfLines={2}>{firstMeal.name}</Text>
                          <Text style={[styles.planItemCal, { color: item.color }]}>
                            {Math.round(firstMeal.calories)} kkal
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.planItemEmpty}>Tidak ada menu</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

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
                  <View style={[styles.mealIconWrapper, { backgroundColor: meal.color + "15" }]}>
                    <Ionicons name={meal.iconName} size={20} color={meal.color} />
                  </View>
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
            <View style={styles.emptyIconCircle}>
              <Ionicons name="fast-food-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada log hari ini</Text>
            <Text style={styles.emptyDesc}>
              Scan makananmu atau tambah manual lewat Diary
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(tabs)/scan")}
            >
              <Ionicons name="scan-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.emptyBtnText}>Scan Sekarang</Text>
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
    marginTop: 10,
  },
  greeting: { fontSize: 13, color: COLORS.text.muted, fontWeight: "500" },
  userName: { fontSize: 24, fontWeight: "900", color: COLORS.text.primary, letterSpacing: -0.5 },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text.primary, letterSpacing: -0.3 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  ringContainer: { alignItems: "center", marginBottom: 24 },
  ringStats: {
    flexDirection: "row",
    marginTop: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "900", color: COLORS.text.primary },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 4, fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  macroSection: { marginTop: 12 },
  quickActions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  quickIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  quickBtnLabel: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  mealBreakdown: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text.primary, marginBottom: 16, letterSpacing: -0.4 },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  mealChip: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    width: "48%",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  mealIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  mealChipLabel: { fontSize: 13, color: COLORS.text.secondary, fontWeight: "600" },
  mealChipCal: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  recentSection: { marginBottom: 24 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: "700" },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text.primary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.text.muted, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  planSection: { marginBottom: 24 },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  planScroll: { gap: 12 },
  planItem: {
    width: 140,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  planItemLabel: { fontSize: 12, color: COLORS.text.muted, fontWeight: "600", marginBottom: 4 },
  planItemName: { fontSize: 14, fontWeight: "700", color: COLORS.text.primary, textAlign: "center", height: 40, marginBottom: 4 },
  planItemCal: { fontSize: 13, fontWeight: "800" },
  planItemEmpty: { fontSize: 12, color: COLORS.text.muted, fontStyle: "italic", marginTop: 10 },
});
