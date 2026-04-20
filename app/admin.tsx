// app/admin.tsx
import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { COLORS } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";
import { Id } from "../convex/_generated/dataModel";

const { width: SW } = Dimensions.get("window");
type TabId = "overview" | "users" | "scans" | "foods";

export default function AdminScreen() {
  const router = useRouter();
  const { userId, userRole, clearUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");
  const [addFoodVisible, setAddFoodVisible] = useState(false);

  // Redirect non-admins
  React.useEffect(() => {
    if (userRole !== null && userRole !== "admin") {
      router.replace("/(tabs)");
    }
  }, [userRole]);

  // Convex queries
  const allUsers = useQuery(api.users.getAllUsers);
  const allScans = useQuery(api.scanHistory.getAllScans);
  const foods = useQuery(api.foods.getFoods, { search: search || undefined });

  // Convex mutations
  const addFood = useMutation(api.foods.addFood);
  const deleteFood = useMutation(api.foods.deleteFood);

  // Food form state
  const [foodForm, setFoodForm] = useState({
    name: "", calories: "", protein: "", carbs: "", fat: "", category: "",
  });
  const [savingFood, setSavingFood] = useState(false);

  // Stats
  const stats = useMemo(() => ({
    totalUsers: allUsers?.length ?? 0,
    totalScans: allScans?.length ?? 0,
    savedScans: allScans?.filter(s => s.isSaved).length ?? 0,
    totalFoods: foods?.length ?? 0,
  }), [allUsers, allScans, foods]);

  const filteredUsers = useMemo(() => {
    if (!search || activeTab !== "users") return allUsers ?? [];
    const q = search.toLowerCase();
    return (allUsers ?? []).filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [allUsers, search, activeTab]);

  const handleAddFood = async () => {
    if (!foodForm.name || !foodForm.calories) {
      Alert.alert("Error", "Nama dan kalori harus diisi");
      return;
    }
    setSavingFood(true);
    try {
      await addFood({
        name: foodForm.name,
        calories: parseFloat(foodForm.calories),
        protein: parseFloat(foodForm.protein) || 0,
        carbs: parseFloat(foodForm.carbs) || 0,
        fat: parseFloat(foodForm.fat) || 0,
        category: foodForm.category || "custom",
        isCustom: true,
      });
      setFoodForm({ name: "", calories: "", protein: "", carbs: "", fat: "", category: "" });
      setAddFoodVisible(false);
      Alert.alert("Berhasil", "Makanan berhasil ditambahkan");
    } catch {
      Alert.alert("Error", "Gagal menambahkan makanan");
    } finally {
      setSavingFood(false);
    }
  };

  const handleDeleteFood = (foodId: string, name: string) => {
    Alert.alert("Hapus Makanan", `Yakin hapus "${name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          try { await deleteFood({ foodId: foodId as Id<"foods"> }); }
          catch { Alert.alert("Error", "Gagal menghapus"); }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar", style: "destructive",
        onPress: async () => { await clearUser(); router.replace("/(auth)/login"); },
      },
    ]);
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "scans", label: "Scan Log", icon: "📷" },
    { id: "foods", label: "Database", icon: "🥗" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Admin Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}><Text style={styles.adminBadgeEmoji}>👑</Text></View>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSub}>HealthMate Control Panel</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => { setActiveTab(tab.id); setSearch(""); }}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>

        {/* ============ OVERVIEW ============ */}
        {activeTab === "overview" && (
          <>
            <Text style={styles.sectionTitle}>Statistik Aplikasi</Text>
            <View style={styles.statsGrid}>
              {[
                { label: "Total User", value: stats.totalUsers, icon: "👥", color: "#3B82F6" },
                { label: "Total Scan", value: stats.totalScans, icon: "📷", color: COLORS.primary },
                { label: "Scan Tersimpan", value: stats.savedScans, icon: "💾", color: "#8B5CF6" },
                { label: "Database Makanan", value: stats.totalFoods, icon: "🥗", color: "#F59E0B" },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>User Terbaru</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Nama</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Role</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Target</Text>
              </View>
              {(allUsers ?? []).slice(0, 5).map(u => (
                <View key={u._id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableCellPrimary} numberOfLines={1}>{u.name}</Text>
                    <Text style={styles.tableCellSub} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: u.role === "admin" ? "#FEF9C3" : "#DCFCE7" }]}>
                    <Text style={[styles.roleBadgeText, { color: u.role === "admin" ? "#B45309" : COLORS.primary }]}>
                      {u.role}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {u.dailyCalorieTarget ?? "-"} kkal
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Scan Terbaru</Text>
            <View style={styles.tableCard}>
              {(allScans ?? []).slice(0, 5).map(s => (
                <View key={s._id} style={styles.scanRow}>
                  <View style={styles.scanRowLeft}>
                    <Text style={styles.scanFood}>{s.detectedFood}</Text>
                    <Text style={styles.scanMeta}>
                      {new Date(s.scanTimestamp).toLocaleDateString("id-ID")} · {Math.round(s.calories)} kkal
                    </Text>
                  </View>
                  <View style={[styles.savedBadge, { backgroundColor: s.isSaved ? "#D1FAE5" : "#F3F4F6" }]}>
                    <Text style={[styles.savedBadgeText, { color: s.isSaved ? COLORS.primary : COLORS.text.muted }]}>
                      {s.isSaved ? "✓ Saved" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ============ USERS ============ */}
        {activeTab === "users" && (
          <>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau email..."
                placeholderTextColor={COLORS.gray[400]}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <Text style={styles.resultCount}>{filteredUsers.length} user ditemukan</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Pengguna</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Role</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Target</Text>
              </View>
              {filteredUsers.map(u => (
                <View key={u._id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableCellPrimary} numberOfLines={1}>{u.name}</Text>
                    <Text style={styles.tableCellSub} numberOfLines={1}>{u.email}</Text>
                    {u.goal && <Text style={styles.tableCellMeta}>{u.goal}</Text>}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: u.role === "admin" ? "#FEF9C3" : "#DCFCE7" }]}>
                    <Text style={[styles.roleBadgeText, { color: u.role === "admin" ? "#B45309" : COLORS.primary }]}>
                      {u.role === "admin" ? "👑 admin" : "user"}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {u.dailyCalorieTarget ? `${u.dailyCalorieTarget} kkal` : "-"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ============ SCANS ============ */}
        {activeTab === "scans" && (
          <>
            <Text style={styles.resultCount}>{(allScans ?? []).length} scan ditemukan</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Makanan</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Kalori</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
              </View>
              {(allScans ?? []).map(s => (
                <View key={s._id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableCellPrimary} numberOfLines={1}>{s.detectedFood}</Text>
                    <Text style={styles.tableCellSub}>
                      {new Date(s.scanTimestamp).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                    <Text style={styles.tableCellMeta}>
                      Akurasi: {Math.round(s.confidence * 100)}% · {s.portionGram}g
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={styles.tableCellPrimary}>{Math.round(s.calories)}</Text>
                    <Text style={styles.tableCellSub}>kkal</Text>
                  </View>
                  <View style={[
                    styles.savedBadge,
                    { flex: 1, backgroundColor: s.isSaved ? "#D1FAE5" : "#F3F4F6" }
                  ]}>
                    <Text style={[styles.savedBadgeText, { color: s.isSaved ? COLORS.primary : COLORS.text.muted }]}>
                      {s.isSaved ? "✓ Saved" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
              {(allScans ?? []).length === 0 && (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyRowText}>Belum ada data scan</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ============ FOODS DATABASE ============ */}
        {activeTab === "foods" && (
          <>
            <View style={styles.foodTopRow}>
              <View style={[styles.searchBar, { flex: 1 }]}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari makanan..."
                  placeholderTextColor={COLORS.gray[400]}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddFoodVisible(true)}>
                <Text style={styles.addBtnText}>+ Tambah</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.resultCount}>{(foods ?? []).length} makanan</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Makanan</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Kalori</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Aksi</Text>
              </View>
              {(foods ?? []).map(f => (
                <View key={f._id} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableCellPrimary} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.tableCellSub}>
                      P:{Math.round(f.protein)}g · K:{Math.round(f.carbs)}g · L:{Math.round(f.fat)}g
                    </Text>
                    {f.category && <Text style={styles.tableCellMeta}>{f.category}</Text>}
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={styles.tableCellPrimary}>{Math.round(f.calories)}</Text>
                    <Text style={styles.tableCellSub}>kkal</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteFood(f._id, f.name)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {(foods ?? []).length === 0 && (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyRowText}>Belum ada data makanan</Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add Food Modal */}
      <Modal
        visible={addFoodVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddFoodVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddFoodVisible(false)}>
              <Text style={styles.modalCancel}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tambah Makanan</Text>
            <TouchableOpacity onPress={handleAddFood} disabled={savingFood}>
              {savingFood
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={styles.modalSave}>Simpan</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {[
              { label: "Nama Makanan *", key: "name", keyboard: "default" as const },
              { label: "Kalori (kkal) *", key: "calories", keyboard: "decimal-pad" as const },
              { label: "Protein (g)", key: "protein", keyboard: "decimal-pad" as const },
              { label: "Karbohidrat (g)", key: "carbs", keyboard: "decimal-pad" as const },
              { label: "Lemak (g)", key: "fat", keyboard: "decimal-pad" as const },
              { label: "Kategori", key: "category", keyboard: "default" as const },
            ].map(field => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={foodForm[field.key as keyof typeof foodForm]}
                  onChangeText={v => setFoodForm(prev => ({ ...prev, [field.key]: v }))}
                  keyboardType={field.keyboard}
                  placeholder={field.label.replace(" *", "")}
                  placeholderTextColor={COLORS.gray[400]}
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  adminBadge: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  adminBadgeEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.75)" },
  headerRight: { flexDirection: "row", gap: 8 },
  userBtn: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  userBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  logoutBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tabBar: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarContent: { paddingHorizontal: 8, paddingVertical: 4, gap: 4, flexDirection: "row" },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: COLORS.primaryBg },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text.muted },
  tabLabelActive: { color: COLORS.primary },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text.primary, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: (SW - 52) / 2, backgroundColor: COLORS.white,
    borderRadius: 14, padding: 16, alignItems: "center",
    borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: "900" },
  statLabel: { fontSize: 11, color: COLORS.text.muted, marginTop: 4, textAlign: "center" },
  resultCount: { fontSize: 12, color: COLORS.text.muted, marginBottom: 8 },
  tableCard: {
    backgroundColor: COLORS.white, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: "row", backgroundColor: COLORS.gray[50],
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableHeaderCell: { fontSize: 12, fontWeight: "700", color: COLORS.text.muted },
  tableRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  tableCell: { fontSize: 13, color: COLORS.text.secondary },
  tableCellPrimary: { fontSize: 14, fontWeight: "600", color: COLORS.text.primary },
  tableCellSub: { fontSize: 11, color: COLORS.text.muted, marginTop: 1 },
  tableCellMeta: { fontSize: 10, color: COLORS.primary, marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8, alignItems: "center" },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  scanRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray[100],
  },
  scanRowLeft: { flex: 1, marginRight: 8 },
  scanFood: { fontSize: 14, fontWeight: "600", color: COLORS.text.primary },
  scanMeta: { fontSize: 11, color: COLORS.text.muted, marginTop: 2 },
  savedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" },
  savedBadgeText: { fontSize: 11, fontWeight: "700" },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white,
    borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 2, marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text.primary, paddingVertical: 10 },
  foodTopRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },
  emptyRow: { padding: 24, alignItems: "center" },
  emptyRowText: { fontSize: 14, color: COLORS.text.muted },
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text.primary },
  modalCancel: { fontSize: 15, color: COLORS.text.muted },
  modalSave: { fontSize: 15, color: COLORS.primary, fontWeight: "700" },
  modalContent: { padding: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text.secondary, marginBottom: 8 },
  fieldInput: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, padding: 12, fontSize: 15, color: COLORS.text.primary,
  },
});
