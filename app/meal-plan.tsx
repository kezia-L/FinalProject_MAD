// app/meal-plan.tsx
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { COLORS, MEAL_TYPES } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";
import { Id } from "../convex/_generated/dataModel";
import { MealPlan, MealPlanItem } from "../lib/types";

export default function MealPlanScreen() {
  const router = useRouter();
  const { userId } = useAppStore();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const generateMealPlan = useAction(api.aiRecommend.generateMealPlan);
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
    { key: "breakfast" as const, icon: "🌅", label: "Sarapan", color: "#F59E0B" },
    { key: "lunch" as const, icon: "☀️", label: "Makan Siang", color: COLORS.primary },
    { key: "dinner" as const, icon: "🌙", label: "Makan Malam", color: "#6366F1" },
    { key: "snacks" as const, icon: "🍎", label: "Camilan", color: "#EC4899" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Rencana Makan AI</Text>
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
                  <Text style={styles.chipText}>
                    🎯 {userProfile.goal.replace(/_/g, " ")}
                  </Text>
                </View>
              )}
              {userProfile.dailyCalorieTarget && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    🔥 {userProfile.dailyCalorieTarget} kkal/hari
                  </Text>
                </View>
              )}
              {userProfile.weight && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>⚖️ {userProfile.weight} kg</Text>
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
              <Text style={styles.generateBtnIcon}>✨</Text>
              <Text style={styles.generateBtnText}>
                {plan ? "Buat Ulang Rencana Makan" : "Buat Rencana Makan"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Empty / loading state */}
        {!plan && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥗</Text>
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
                <Text style={styles.notesTitle}>💡 Catatan AI</Text>
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
                    <Text style={styles.mealSectionIcon}>{icon}</Text>
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary },
  container: { padding: 16 },
  profileCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  profileCardTitle: { fontSize: 12, color: COLORS.text.muted, marginBottom: 8 },
  profileChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: COLORS.primaryBg, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  generateBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    marginBottom: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  generateBtnIcon: { fontSize: 20 },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text.primary, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: COLORS.text.secondary, textAlign: "center", lineHeight: 20 },
  loadingState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text.primary },
  loadingDesc: { fontSize: 13, color: COLORS.text.muted },
  totalBanner: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 20,
    alignItems: "center", marginBottom: 12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  totalBannerLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  totalBannerValue: { fontSize: 36, fontWeight: "900", color: "#fff" },
  totalBannerDiff: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  notesCard: {
    backgroundColor: "#FFFBEB", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#FDE68A", marginBottom: 12,
  },
  notesTitle: { fontSize: 13, fontWeight: "700", color: "#92400E", marginBottom: 6 },
  notesText: { fontSize: 13, color: "#78350F", lineHeight: 20 },
  mealSection: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  mealSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mealSectionIcon: { fontSize: 20 },
  mealSectionTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.text.primary },
  mealCalBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  mealCalText: { fontSize: 12, fontWeight: "700" },
  mealItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  mealItemLeft: { flex: 1, marginRight: 8 },
  mealItemName: { fontSize: 14, fontWeight: "600", color: COLORS.text.primary },
  mealItemPortion: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  mealItemRight: { alignItems: "flex-end" },
  mealItemCal: { fontSize: 14, fontWeight: "800" },
  mealItemMacros: { flexDirection: "row", gap: 6, marginTop: 2 },
  mealItemMacro: { fontSize: 10, color: COLORS.text.muted },
});
