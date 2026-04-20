// app/(tabs)/diary.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS, MEAL_TYPES } from "../../lib/constants";
import { FoodCard } from "../../components/FoodCard";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { calculateTotals, getDateString, getLast7Days } from "../../lib/nutrition";
import { FoodLog } from "../../lib/types";

export default function DiaryScreen() {
  const { userId } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(getDateString());

  const deleteFoodLog = useMutation(api.foodLogs.deleteFoodLog);

  const logs = useQuery(
    api.foodLogs.getFoodLogsByDate,
    userId ? { userId: userId as Id<"users">, logDate: selectedDate } : "skip"
  );

  const days = useMemo(() => {
    return getLast7Days().map((dateStr) => {
      const d = new Date(dateStr);
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const isToday = dateStr === getDateString();
      return {
        date: dateStr,
        day: dayNames[d.getDay()],
        num: d.getDate(),
        isToday,
      };
    });
  }, []);

  const totals = useMemo(() => calculateTotals((logs as FoodLog[]) ?? []), [logs]);

  const groupedLogs = useMemo(() => {
    const result: Record<string, FoodLog[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    ((logs as FoodLog[]) ?? []).forEach((log) => {
      if (result[log.mealType]) result[log.mealType].push(log);
    });
    return result;
  }, [logs]);

  const handleDelete = async (logId: string) => {
    Alert.alert("Hapus Log", "Yakin ingin menghapus log ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFoodLog({ logId: logId as Id<"foodLogs"> });
          } catch {
            Alert.alert("Error", "Gagal menghapus log");
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const today = getDateString();
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return getDateString(d);
    })();
    if (dateStr === today) return "Hari Ini";
    if (dateStr === yesterday) return "Kemarin";
    return new Date(dateStr).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📓 Diary Makanan</Text>
        <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>
      </View>

      {/* Date picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.datePicker}
        contentContainerStyle={styles.datePickerContent}
      >
        {days.map((d) => (
          <TouchableOpacity
            key={d.date}
            style={[styles.dayChip, selectedDate === d.date && styles.dayChipActive]}
            onPress={() => setSelectedDate(d.date)}
          >
            <Text style={[styles.dayName, selectedDate === d.date && styles.dayNameActive]}>
              {d.isToday ? "Hari ini" : d.day}
            </Text>
            <Text style={[styles.dayNum, selectedDate === d.date && styles.dayNumActive]}>
              {d.num}
            </Text>
            {d.isToday && <View style={styles.todayDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Daily totals bar */}
      <View style={styles.totalsBar}>
        <View style={styles.totalItem}>
          <Text style={styles.totalValue}>{Math.round(totals.calories)}</Text>
          <Text style={styles.totalLabel}>kkal</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalValue, { color: COLORS.macro.protein }]}>
            {Math.round(totals.protein)}g
          </Text>
          <Text style={styles.totalLabel}>Protein</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalValue, { color: COLORS.macro.carbs }]}>
            {Math.round(totals.carbs)}g
          </Text>
          <Text style={styles.totalLabel}>Karbo</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalValue, { color: COLORS.macro.fat }]}>
            {Math.round(totals.fat)}g
          </Text>
          <Text style={styles.totalLabel}>Lemak</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MEAL_TYPES.map((mealType) => {
          const mealLogs = groupedLogs[mealType.id] ?? [];
          const mealCal = mealLogs.reduce((s, l) => s + l.calories, 0);

          return (
            <View key={mealType.id} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealIcon}>{mealType.icon}</Text>
                  <Text style={styles.mealName}>{mealType.label}</Text>
                  {mealLogs.length > 0 && (
                    <View style={[styles.mealCalBadge, { backgroundColor: mealType.color + "20" }]}>
                      <Text style={[styles.mealCalText, { color: mealType.color }]}>
                        {Math.round(mealCal)} kkal
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {mealLogs.length === 0 ? (
                <View style={styles.emptyMeal}>
                  <Text style={styles.emptyMealText}>Belum ada log {mealType.label.toLowerCase()}</Text>
                </View>
              ) : (
                mealLogs.map((log) => (
                  <FoodCard key={log._id} log={log} onDelete={handleDelete} />
                ))
              )}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text.primary },
  dateLabel: { fontSize: 13, color: COLORS.text.muted, marginTop: 2 },
  datePicker: { maxHeight: 80 },
  datePickerContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    flexDirection: "row",
  },
  dayChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 56,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayName: { fontSize: 10, color: COLORS.text.muted, fontWeight: "600" },
  dayNameActive: { color: "rgba(255,255,255,0.8)" },
  dayNum: { fontSize: 18, fontWeight: "800", color: COLORS.text.primary },
  dayNumActive: { color: "#fff" },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primaryLight,
    marginTop: 2,
  },
  totalsBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  totalItem: { flex: 1, alignItems: "center" },
  totalValue: { fontSize: 16, fontWeight: "800", color: COLORS.text.primary },
  totalLabel: { fontSize: 10, color: COLORS.text.muted, marginTop: 2 },
  totalDivider: { width: 1, backgroundColor: COLORS.border },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  mealSection: { marginBottom: 20 },
  mealHeader: { marginBottom: 8 },
  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealIcon: { fontSize: 20 },
  mealName: { fontSize: 15, fontWeight: "700", color: COLORS.text.primary, flex: 1 },
  mealCalBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mealCalText: { fontSize: 12, fontWeight: "700" },
  emptyMeal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyMealText: { fontSize: 13, color: COLORS.text.muted },
});
