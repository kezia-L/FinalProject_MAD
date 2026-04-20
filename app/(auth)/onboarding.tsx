// app/(auth)/onboarding.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS, GOAL_OPTIONS } from "../../lib/constants";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { calculateBMR, calculateTDEE } from "../../lib/nutrition";

type Step = 0 | 1 | 2;

export default function OnboardingScreen() {
  const router = useRouter();
  const updateProfile = useMutation(api.users.updateProfile);
  const { userId } = useAppStore();

  const [step, setStep] = useState<Step>(0);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("be_healthy");
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const ageNum = parseInt(age) || 25;
      const weightNum = parseFloat(weight) || 65;
      const heightNum = parseFloat(height) || 165;

      const bmr = calculateBMR(weightNum, heightNum, ageNum);
      const tdee = calculateTDEE(bmr);
      const goalMult = GOAL_OPTIONS.find((g) => g.id === goal)?.calorieMultiplier ?? 1.0;
      const dailyCalorieTarget = Math.round(tdee * goalMult);

      await updateProfile({
        userId: userId as Id<"users">,
        age: ageNum,
        weight: weightNum,
        height: heightNum,
        goal,
        dailyCalorieTarget,
      });

      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Gagal menyimpan profil");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Data Tubuh Kamu",
      emoji: "📏",
      content: (
        <View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usia (tahun)</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Contoh: 25"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Berat Badan (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="Contoh: 65"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tinggi Badan (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder="Contoh: 170"
              placeholderTextColor={COLORS.gray[400]}
            />
          </View>
        </View>
      ),
    },
    {
      title: "Tujuan Kesehatanmu",
      emoji: "🎯",
      content: (
        <View style={styles.goalGrid}>
          {GOAL_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.goalCard, goal === g.id && styles.goalCardActive]}
              onPress={() => setGoal(g.id)}
            >
              <Text style={styles.goalIcon}>{g.icon}</Text>
              <Text style={[styles.goalLabel, goal === g.id && styles.goalLabelActive]}>
                {g.label}
              </Text>
              <Text style={styles.goalDesc}>{g.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      title: "Siap Mulai!",
      emoji: "🚀",
      content: (
        <View style={styles.readyContainer}>
          <Text style={styles.readyEmoji}>🎉</Text>
          <Text style={styles.readyTitle}>Profil kamu sudah lengkap!</Text>
          <Text style={styles.readyDesc}>
            Kami akan menghitung target kalori harianmu berdasarkan data yang kamu berikan.
            Mulai scan makananmu sekarang!
          </Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryItem}>🎯 Tujuan: {GOAL_OPTIONS.find(g => g.id === goal)?.label}</Text>
            {weight ? <Text style={styles.summaryItem}>⚖️ Berat: {weight} kg</Text> : null}
            {height ? <Text style={styles.summaryItem}>📏 Tinggi: {height} cm</Text> : null}
            {age ? <Text style={styles.summaryItem}>🎂 Usia: {age} tahun</Text> : null}
          </View>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>{steps[step].emoji}</Text>
        <Text style={styles.stepTitle}>{steps[step].title}</Text>
        {steps[step].content}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => (s - 1) as Step)}>
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.btnDisabled]}
          onPress={step === 2 ? handleFinish : () => setStep((s) => (s + 1) as Step)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextText}>{step === 2 ? "Mulai!" : "Lanjut →"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[300],
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotDone: {
    backgroundColor: COLORS.primaryLight,
  },
  container: {
    flexGrow: 1,
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text.primary,
    textAlign: "center",
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  goalGrid: {
    gap: 10,
  },
  goalCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0FDF4",
  },
  goalIcon: {
    fontSize: 28,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text.primary,
    flex: 1,
  },
  goalLabelActive: {
    color: COLORS.primary,
  },
  goalDesc: {
    fontSize: 11,
    color: COLORS.text.muted,
    flex: 2,
  },
  readyContainer: {
    alignItems: "center",
  },
  readyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  readyDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text.secondary,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
