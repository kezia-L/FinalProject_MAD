// app/meal-plan.tsx
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../convex/_generated/api";
import { COLORS, MEAL_TYPES, GOAL_OPTIONS } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";
import { Id } from "../convex/_generated/dataModel";
import { MealPlan, MealPlanItem } from "../lib/types";

export default function MealPlanScreen() {
  const router = useRouter();
  const { userId } = useAppStore();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const generateMealPlan = useAction(api.aiPlanner.generateMealPlan);
  const userProfile = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const handleGenerate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateMealPlan({
        userProfile: {
          goal: userProfile?.goal,
          dailyCalorieTarget: userProfile?.dailyCalorieTarget,
          weight: userProfile?.weight,
          height: userProfile?.height,
          age: userProfile?.age,
        },
      });
      if (result.success && result.data) {
        setPlan(result.data as MealPlan);
        setNotes((result.data as { notes?: string }).notes ?? "");
      } else {
        Alert.alert("Gagal", "Tidak bisa membuat rencana makan. Coba lagi.");
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Terjadi kesalahan. Coba lagi.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMealSection = (key: keyof MealPlan) => {
    if (!plan || key === "totalCalories") return [];
    const val = plan[key];
    if (!Array.isArray(val)) return [];
    return val as MealPlanItem[];
  };

  const totalCalories = plan?.totalCalories ?? 0;

  const mealSections = [
    { key: "breakfast" as const, icon: "sunny-outline", label: "Sarapan", color: "#F59E0B" },
    { key: "lunch" as const, icon: "restaurant-outline", label: "Makan Siang", color: COLORS.primary },
    { key: "dinner" as const, icon: "moon-outline", label: "Makan Malam", color: "#6366F1" },
    { key: "snacks" as const, icon: "nutrition-outline", label: "Camilan", color: "#EC4899" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rencana Makan AI</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* User profile summary */}
        {userProfile && (
          <View style={styles.profileCard}>
            <Text style={styles.profileCardTitle}>Dibuat untuk profil kamu:</Text>
            <View style={styles.profileChips}>
              {userProfile.goal && (
                <View style={styles.chip}>
                  <Ionicons name={(GOAL_OPTIONS.find(g => g.id === userProfile.goal) as any)?.iconName ?? "leaf-outline"} size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.chipText}>
                    {userProfile.goal.replace(/_/g, " ")}
                  </Text>
                </View>
              )}
              {userProfile.dailyCalorieTarget && (
                <View style={styles.chip}>
                  <Ionicons name="flame-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.chipText}>
                    {userProfile.dailyCalorieTarget} kkal/hari
                  </Text>
                </View>
              )}
              {userProfile.weight && (
                <View style={styles.chip}>
                  <Ionicons name="scale-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.chipText}>{userProfile.weight} kg</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.generateBtnInner}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateBtnText}>Membuat rencana makan...</Text>
            </View>
          ) : (
            <View style={styles.generateBtnInner}>
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>
                {plan ? "Buat Ulang Rencana Makan" : "Buat Rencana Makan"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Empty / loading state */}
        {!plan && !loading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada rencana makan</Text>
            <Text style={styles.emptyDesc}>
              Tekan tombol di atas untuk membuat rencana makan harian yang dipersonalisasi oleh AI
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>AI sedang merancang makan sehat...</Text>
            <Text style={styles.loadingDesc}>Ini mungkin membutuhkan beberapa detik</Text>
          </View>
        )}

        {/* Meal plan result */}
        {plan && !loading && (
          <>
            {/* Total calories banner */}
            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>Total Kalori Rencana</Text>
              <Text style={styles.totalBannerValue}>{totalCalories} kkal</Text>
              {userProfile?.dailyCalorieTarget && (
                <Text style={styles.totalBannerDiff}>
                  {totalCalories > userProfile.dailyCalorieTarget
                    ? `+${totalCalories - userProfile.dailyCalorieTarget} dari target`
                    : `${userProfile.dailyCalorieTarget - totalCalories} di bawah target`}
                </Text>
              )}
            </View>

            {/* Notes */}
            {notes ? (
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <Ionicons name="bulb-outline" size={18} color="#92400E" />
                  <Text style={styles.notesTitle}>Catatan AI</Text>
                </View>
                <Text style={styles.notesText}>{notes}</Text>
              </View>
            ) : null}

            {/* Meal sections */}
            {mealSections.map(({ key, icon, label, color }) => {
              const items = getMealSection(key);
              if (!items.length) return null;
              const sectionCal = items.reduce((s, i) => s + (i.calories ?? 0), 0);
              return (
                <View key={key} style={styles.mealSection}>
                  <View style={styles.mealSectionHeader}>
                    <View style={[styles.mealIconCircle, { backgroundColor: color + "15" }]}>
                      <Ionicons name={icon as any} size={20} color={color} />
                    </View>
                    <Text style={styles.mealSectionTitle}>{label}</Text>
                    <View style={[styles.mealCalBadge, { backgroundColor: color + "20" }]}>
                      <Text style={[styles.mealCalText, { color }]}>
                        {Math.round(sectionCal)} kkal
                      </Text>
                    </View>
                  </View>
                  {items.map((item, idx) => (
                    <View key={idx} style={styles.mealItem}>
                      <View style={styles.mealItemLeft}>
                        <Text style={styles.mealItemName}>{item.name}</Text>
                        {item.portion && (
                          <Text style={styles.mealItemPortion}>{item.portion}</Text>
                        )}
                      </View>
                      <View style={styles.mealItemRight}>
                        <Text style={[styles.mealItemCal, { color }]}>
                          {Math.round(item.calories ?? 0)} kkal
                        </Text>
                        <View style={styles.mealItemMacros}>
                          <Text style={styles.mealItemMacro}>
                            P:{Math.round(item.protein ?? 0)}g
                          </Text>
                          <Text style={styles.mealItemMacro}>
                            K:{Math.round(item.carbs ?? 0)}g
                          </Text>
                          <Text style={styles.mealItemMacro}>
                            L:{Math.round(item.fat ?? 0)}g
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 18, color: COLORS.text.secondary },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text.primary, letterSpacing: -0.5 },
  container: { padding: 16 },
  profileCard: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  profileCardTitle: { fontSize: 13, color: COLORS.text.muted, marginBottom: 12, fontWeight: "600" },
  profileChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: COLORS.primaryBg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: "row", alignItems: "center",
  },
  chipText: { fontSize: 12, color: COLORS.primary, fontWeight: "700" },
  generateBtn: {
    backgroundColor: COLORS.primary, borderRadius: 24, paddingVertical: 18,
    marginBottom: 24, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  generateBtnText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text.primary, marginBottom: 10 },
  emptyDesc: { fontSize: 14, color: COLORS.text.secondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  loadingState: { alignItems: "center", paddingVertical: 60, gap: 16 },
  loadingTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text.primary },
  loadingDesc: { fontSize: 14, color: COLORS.text.muted },
  totalBanner: {
    backgroundColor: COLORS.primary, borderRadius: 24, padding: 24,
    alignItems: "center", marginBottom: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 15, elevation: 8,
  },
  totalBannerLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 8, fontWeight: "600" },
  totalBannerValue: { fontSize: 44, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  totalBannerDiff: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 8, fontWeight: "500" },
  notesCard: {
    backgroundColor: "#FFFBEB", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#FDE68A", marginBottom: 20,
    shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10,
  },
  notesHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  notesTitle: { fontSize: 15, fontWeight: "800", color: "#92400E" },
  notesText: { fontSize: 14, color: "#78350F", lineHeight: 22 },
  mealSection: {
    backgroundColor: COLORS.white, borderRadius: 24, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12,
  },
  mealSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mealIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mealSectionTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: COLORS.text.primary, letterSpacing: -0.4 },
  mealCalBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  mealCalText: { fontSize: 12, fontWeight: "800" },
  mealItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray[50],
  },
  mealItemLeft: { flex: 1, marginRight: 12 },
  mealItemName: { fontSize: 15, fontWeight: "700", color: COLORS.text.primary, marginBottom: 2 },
  mealItemPortion: { fontSize: 13, color: COLORS.text.muted },
  mealItemRight: { alignItems: "flex-end" },
  mealItemCal: { fontSize: 16, fontWeight: "800" },
  mealItemMacros: { flexDirection: "row", gap: 8, marginTop: 4 },
  mealItemMacro: { fontSize: 11, color: COLORS.text.muted, fontWeight: "500" },
});
