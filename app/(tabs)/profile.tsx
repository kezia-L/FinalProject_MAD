// app/(tabs)/profile.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS, GOAL_OPTIONS } from "../../lib/constants";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { calculateBMR, calculateTDEE } from "../../lib/nutrition";

export default function ProfileScreen() {
  const router = useRouter();
  const { userId, clearUser } = useAppStore();
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const userProfile = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const updateProfile = useMutation(api.users.updateProfile);

  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editGoal, setEditGoal] = useState("be_healthy");

  const openEdit = () => {
    if (userProfile) {
      setEditName(userProfile.name);
      setEditAge(userProfile.age?.toString() ?? "");
      setEditWeight(userProfile.weight?.toString() ?? "");
      setEditHeight(userProfile.height?.toString() ?? "");
      setEditGoal(userProfile.goal ?? "be_healthy");
    }
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const age = parseInt(editAge) || undefined;
      const weight = parseFloat(editWeight) || undefined;
      const height = parseFloat(editHeight) || undefined;

      let dailyCalorieTarget: number | undefined;
      if (age && weight && height) {
        const bmr = calculateBMR(weight, height, age);
        const tdee = calculateTDEE(bmr);
        const mult = GOAL_OPTIONS.find((g) => g.id === editGoal)?.calorieMultiplier ?? 1;
        dailyCalorieTarget = Math.round(tdee * mult);
      }

      await updateProfile({
        userId: userId as Id<"users">,
        name: editName.trim(),
        age,
        weight,
        height,
        goal: editGoal,
        dailyCalorieTarget,
      });
      setEditVisible(false);
      Alert.alert("Berhasil", "Profil berhasil diperbarui");
    } catch {
      Alert.alert("Error", "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin ingin keluar dari akun?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await clearUser();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const bmi =
    userProfile?.weight && userProfile?.height
      ? (userProfile.weight / ((userProfile.height / 100) ** 2)).toFixed(1)
      : null;

  const getBMILabel = (bmi: number) => {
    if (bmi < 18.5) return { label: "Kurus", color: COLORS.secondary };
    if (bmi < 25) return { label: "Normal", color: COLORS.primary };
    if (bmi < 30) return { label: "Gemuk", color: COLORS.accent };
    return { label: "Obesitas", color: COLORS.danger };
  };

  const bmiInfo = bmi ? getBMILabel(parseFloat(bmi)) : null;
  const goalInfo = GOAL_OPTIONS.find((g) => g.id === (userProfile?.goal ?? "be_healthy"));

  const menuItems = [
    { icon: "restaurant-outline", color: "#F59E0B", label: "Rencana Makan AI", onPress: () => router.push("/meal-plan") },
    { icon: "chatbubble-ellipses-outline", color: "#6366F1", label: "Chat dengan AI", onPress: () => router.push("/ai-chat") },
    { icon: "bar-chart-outline", color: "#16A34A", label: "Progress Mingguan", onPress: () => router.push("/(tabs)/progress") },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>
              {userProfile?.name?.[0]?.toUpperCase() ?? "U"}
            </Text>
          </View>
          <Text style={styles.profileName}>{userProfile?.name ?? "..."}</Text>
          <Text style={styles.profileEmail}>{userProfile?.email ?? ""}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Ionicons name="pencil" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.editBtnText}>Edit Profil</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            {userProfile?.age && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile.age}</Text>
                <Text style={styles.statLabel}>Tahun</Text>
              </View>
            )}
            {userProfile?.weight && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile.weight}</Text>
                <Text style={styles.statLabel}>kg</Text>
              </View>
            )}
            {userProfile?.height && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile.height}</Text>
                <Text style={styles.statLabel}>cm</Text>
              </View>
            )}
            {bmi && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: bmiInfo?.color }]}>{bmi}</Text>
                <Text style={[styles.statLabel, { color: bmiInfo?.color }]}>BMI {bmiInfo?.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Goal & Calorie target */}
        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View style={[styles.goalIconCircle, { backgroundColor: (goalInfo as any)?.color ? (goalInfo as any).color + "15" : COLORS.primaryBg }]}>
              <Ionicons name={(goalInfo as any)?.iconName ?? "leaf-outline"} size={24} color={(goalInfo as any)?.color ?? COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalTitle}>{goalInfo?.label ?? "Tujuan Kesehatan"}</Text>
              <Text style={styles.goalDesc}>{goalInfo?.description}</Text>
            </View>
          </View>
          {userProfile?.dailyCalorieTarget && (
            <View style={styles.calTarget}>
              <Text style={styles.calTargetValue}>{userProfile.dailyCalorieTarget}</Text>
              <Text style={styles.calTargetLabel}>kkal target harian</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: item.color + "15" }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.text.muted} />
            </TouchableOpacity>
          ))}
        </View>


        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.modalCancel}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profil</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSave}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {[
              { label: "Nama", value: editName, onChange: setEditName, keyboard: "default" as const },
              { label: "Usia (tahun)", value: editAge, onChange: setEditAge, keyboard: "numeric" as const },
              { label: "Berat Badan (kg)", value: editWeight, onChange: setEditWeight, keyboard: "decimal-pad" as const },
              { label: "Tinggi Badan (cm)", value: editHeight, onChange: setEditHeight, keyboard: "decimal-pad" as const },
            ].map((field) => (
              <View key={field.label} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType={field.keyboard}
                  placeholderTextColor={COLORS.gray[400]}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Tujuan Kesehatan</Text>
            {GOAL_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalOption, editGoal === g.id && styles.goalOptionActive]}
                onPress={() => setEditGoal(g.id)}
              >
                <View style={[styles.modalGoalIconCircle, { backgroundColor: (g as any).color + "15" }]}>
                  <Ionicons name={g.iconName} size={20} color={(g as any).color} />
                </View>
                <Text style={[styles.goalOptionLabel, editGoal === g.id && styles.goalOptionLabelActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  profileHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarEmoji: { fontSize: 32, color: "#fff", fontWeight: "800" },
  profileName: { fontSize: 20, fontWeight: "800", color: COLORS.text.primary, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: COLORS.text.muted, marginBottom: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
  },
  editBtnText: { color: COLORS.primary, fontWeight: "800", fontSize: 14 },
  statsCard: {
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
  statRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.text.primary },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  goalCard: {
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
  goalRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  goalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  goalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text.primary, letterSpacing: -0.3 },
  goalDesc: { fontSize: 13, color: COLORS.text.muted, marginTop: 4, lineHeight: 18 },
  calTarget: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  calTargetValue: { fontSize: 24, fontWeight: "800", color: COLORS.primary },
  calTargetLabel: { fontSize: 12, color: COLORS.text.muted, marginTop: 2 },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.text.primary },
  logoutBtn: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 8,
  },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: "800" },
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text.primary },
  modalCancel: { fontSize: 15, color: COLORS.text.muted },
  modalSave: { fontSize: 15, color: COLORS.primary, fontWeight: "700" },
  modalContent: { padding: 16, gap: 0 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text.secondary, marginBottom: 8 },
  fieldInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  goalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  goalOptionActive: { borderColor: COLORS.primary, backgroundColor: "#F0FDF4" },
  modalGoalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  goalOptionLabel: { fontSize: 15, fontWeight: "700", color: COLORS.text.secondary },
  goalOptionLabelActive: { color: COLORS.primary },
});
