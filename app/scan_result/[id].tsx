// app/scan_result/[id].tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS, MEAL_TYPES } from "../../lib/constants";
import { NutritionBar } from "../../components/NutritionBar";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { FoodAnalysis } from "../../lib/types";
import { getDateString } from "../../lib/nutrition";

const HEALTH_SCORE_COLORS = ["", COLORS.danger, "#F97316", COLORS.accent, "#84CC16", COLORS.primary];
const HEALTH_SCORE_LABELS = ["", "Sangat Buruk", "Buruk", "Cukup", "Baik", "Sangat Baik"];

export default function ScanResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAppStore();
  const [selectedMeal, setSelectedMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [saving, setSaving] = useState(false);

  const scan = useQuery(
    api.scanHistory.getScanById,
    id ? { scanId: id as Id<"scanHistory"> } : "skip"
  );

  const addFoodLog = useMutation(api.foodLogs.addFoodLog);
  const markSaved = useMutation(api.scanHistory.markScanAsSaved);

  if (!scan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat hasil analisis...</Text>
        </View>
      </SafeAreaView>
    );
  }

  let analysis: FoodAnalysis | null = null;
  try {
    analysis = JSON.parse(scan.aiAnalysis);
  } catch {}

  const healthScore = analysis?.healthScore ?? 3;
  const healthTips = analysis?.healthTips ?? [];
  const description = analysis?.description ?? "";
  const fiber = analysis?.fiber ?? 0;

  const handleSave = async () => {
    if (!userId || !scan) return;
    setSaving(true);
    try {
      await addFoodLog({
        userId: userId as Id<"users">,
        foodName: scan.detectedFood,
        calories: scan.calories,
        protein: scan.protein,
        carbs: scan.carbs,
        fat: scan.fat,
        portionGram: scan.portionGram,
        mealType: selectedMeal,
        logDate: getDateString(),
        logTimestamp: Date.now(),
        fromScan: true,
        scanId: scan._id,
      });
      await markSaved({ scanId: scan._id });
      Alert.alert("Berhasil! 🎉", "Makanan berhasil ditambahkan ke diary", [
        {
          text: "Lihat Diary",
          onPress: () => router.replace("/(tabs)/diary"),
        },
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch {
      Alert.alert("Error", "Gagal menyimpan ke diary");
    } finally {
      setSaving(false);
    }
  };

  const confidencePercent = Math.round(scan.confidence * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hasil Analisis</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* Food name & confidence */}
        <View style={styles.foodNameCard}>
          <Text style={styles.foodEmoji}>🍽️</Text>
          <Text style={styles.foodName}>{scan.detectedFood}</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidencePercent >= 80 ? "#D1FAE5" : "#FEF3C7" }]}>
            <Text style={[styles.confidenceText, { color: confidencePercent >= 80 ? COLORS.primary : "#B45309" }]}>
              {confidencePercent}% akurasi
            </Text>
          </View>
          <Text style={styles.portionText}>Porsi estimasi: {scan.portionGram}g</Text>
          {description && <Text style={styles.descText}>{description}</Text>}
        </View>

        {/* Calorie highlight */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieMain}>
            <Text style={styles.calorieValue}>{Math.round(scan.calories)}</Text>
            <Text style={styles.calorieUnit}>kkal</Text>
          </View>
          <View style={styles.macroChips}>
            <View style={[styles.macroChip, { backgroundColor: "#EFF6FF" }]}>
              <Text style={[styles.macroChipValue, { color: COLORS.macro.protein }]}>
                {Math.round(scan.protein)}g
              </Text>
              <Text style={styles.macroChipLabel}>Protein</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: "#FFFBEB" }]}>
              <Text style={[styles.macroChipValue, { color: COLORS.macro.carbs }]}>
                {Math.round(scan.carbs)}g
              </Text>
              <Text style={styles.macroChipLabel}>Karbo</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.macroChipValue, { color: COLORS.macro.fat }]}>
                {Math.round(scan.fat)}g
              </Text>
              <Text style={styles.macroChipLabel}>Lemak</Text>
            </View>
            {fiber > 0 && (
              <View style={[styles.macroChip, { backgroundColor: "#F5F3FF" }]}>
                <Text style={[styles.macroChipValue, { color: COLORS.macro.fiber }]}>
                  {Math.round(fiber)}g
                </Text>
                <Text style={styles.macroChipLabel}>Serat</Text>
              </View>
            )}
          </View>
        </View>

        {/* Nutrition bars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detail Nutrisi</Text>
          <NutritionBar label="Protein" current={scan.protein} target={50} color={COLORS.macro.protein} />
          <NutritionBar label="Karbohidrat" current={scan.carbs} target={250} color={COLORS.macro.carbs} />
          <NutritionBar label="Lemak" current={scan.fat} target={65} color={COLORS.macro.fat} />
          {fiber > 0 && (
            <NutritionBar label="Serat" current={fiber} target={25} color={COLORS.macro.fiber} />
          )}
        </View>

        {/* Health Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skor Kesehatan</Text>
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { borderColor: HEALTH_SCORE_COLORS[healthScore] }]}>
              <Text style={[styles.scoreValue, { color: HEALTH_SCORE_COLORS[healthScore] }]}>
                {healthScore}/5
              </Text>
            </View>
            <View style={styles.scoreBars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.scoreBar,
                    {
                      backgroundColor:
                        s <= healthScore ? HEALTH_SCORE_COLORS[healthScore] : COLORS.gray[200],
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.scoreLabel, { color: HEALTH_SCORE_COLORS[healthScore] }]}>
              {HEALTH_SCORE_LABELS[healthScore]}
            </Text>
          </View>
        </View>

        {/* Health tips */}
        {healthTips.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Tips Kesehatan</Text>
            {healthTips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meal type selection */}
        {!scan.isSaved && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tambah ke Diary sebagai:</Text>
            <View style={styles.mealGrid}>
              {MEAL_TYPES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.mealChip,
                    selectedMeal === m.id && { backgroundColor: m.color, borderColor: m.color },
                  ]}
                  onPress={() => setSelectedMeal(m.id as typeof selectedMeal)}
                >
                  <Text style={styles.mealChipIcon}>{m.icon}</Text>
                  <Text
                    style={[
                      styles.mealChipLabel,
                      selectedMeal === m.id && { color: "#fff", fontWeight: "700" },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Save button */}
        {scan.isSaved ? (
          <View style={styles.savedBanner}>
            <Text style={styles.savedBannerText}>✅ Sudah disimpan ke diary</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>💾 Simpan ke Diary</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: COLORS.text.secondary, fontSize: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  backText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text.primary },
  foodNameCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  foodEmoji: { fontSize: 48, marginBottom: 8 },
  foodName: { fontSize: 22, fontWeight: "800", color: COLORS.text.primary, marginBottom: 8, textAlign: "center" },
  confidenceBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  confidenceText: { fontSize: 13, fontWeight: "700" },
  portionText: { fontSize: 13, color: COLORS.text.muted },
  descText: { fontSize: 13, color: COLORS.text.secondary, textAlign: "center", marginTop: 8, lineHeight: 20 },
  calorieCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  calorieMain: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 16 },
  calorieValue: { fontSize: 52, fontWeight: "900", color: "#fff" },
  calorieUnit: { fontSize: 18, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  macroChips: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  macroChip: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center", minWidth: 70 },
  macroChipValue: { fontSize: 16, fontWeight: "800" },
  macroChipLabel: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text.primary, marginBottom: 12 },
  scoreContainer: { alignItems: "center", gap: 12 },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { fontSize: 22, fontWeight: "900" },
  scoreBars: { flexDirection: "row", gap: 6 },
  scoreBar: { width: 32, height: 8, borderRadius: 4 },
  scoreLabel: { fontSize: 16, fontWeight: "700" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 6 },
  tipText: { flex: 1, fontSize: 13, color: COLORS.text.secondary, lineHeight: 20 },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  mealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    minWidth: "46%",
  },
  mealChipIcon: { fontSize: 16 },
  mealChipLabel: { fontSize: 13, fontWeight: "500", color: COLORS.text.secondary },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  savedBanner: {
    backgroundColor: "#D1FAE5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  savedBannerText: { color: COLORS.primary, fontSize: 15, fontWeight: "700" },
});
