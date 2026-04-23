// app/(tabs)/progress.tsx
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS, DEFAULT_DAILY_TARGETS } from "../../lib/constants";
import { useAppStore } from "../../store/useAppStore";
import { Id } from "../../convex/_generated/dataModel";
import { getLast7Days, getDateString, getFormattedDateTime } from "../../lib/nutrition";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 160;
const BAR_PADDING = 8;

export default function ProgressScreen() {
  const { userId } = useAppStore();
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const generateInsight = useAction(api.aiProgress.generateWeeklyInsight);
  
  const days = useMemo(() => getLast7Days(), []);

  const userProfile = useQuery(
    api.users.getUserById,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const weeklyData = useQuery(
    api.foodLogs.getWeeklyCalories,
    userId ? { userId: userId as Id<"users">, dates: days } : "skip"
  );

  const target = userProfile?.dailyCalorieTarget ?? DEFAULT_DAILY_TARGETS.calories;

  const chartData = useMemo(() => {
    if (!weeklyData) return days.map((d) => ({ date: d, calories: 0 }));
    return days.map((d) => ({ date: d, calories: weeklyData[d] ?? 0 }));
  }, [weeklyData, days]);

  const maxCal = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.calories), target);
    return max * 1.2;
  }, [chartData, target]);

  const totalThisWeek = useMemo(
    () => chartData.reduce((s, d) => s + d.calories, 0),
    [chartData]
  );

  const avgDaily = useMemo(
    () => Math.round(totalThisWeek / 7),
    [totalThisWeek]
  );

  const daysOnTarget = useMemo(
    () => chartData.filter((d) => d.calories > 0 && Math.abs(d.calories - target) / target < 0.15).length,
    [chartData, target]
  );

  const today = getDateString();
  const todayIndex = days.indexOf(today);
  const todayCalories = chartData[todayIndex]?.calories ?? 0;

  const barWidth = CHART_WIDTH / 7 - BAR_PADDING;
  const targetY = CHART_HEIGHT - (target / maxCal) * CHART_HEIGHT;
  const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Manual Generate AI Insight
  async function handleFetchInsight() {
    if (!weeklyData || !userProfile || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const dataForAI = days.map(d => ({
        date: d,
        calories: weeklyData[d] ?? 0
      }));

      const result = await generateInsight({
        userName: userProfile.name,
        goal: userProfile.goal,
        dailyTarget: target,
        weeklyData: dataForAI,
        currentTime: getFormattedDateTime()
      });
      setAiInsight(result);
    } catch (err) {
      console.error(err);
      setAiInsight("Gagal mendapatkan analisis. Silakan coba lagi nanti.");
    } finally {
      setIsGenerating(false);
    }
  }

  const getAnalysis = () => {
    if (avgDaily === 0 && !aiInsight) return "Mulai catat makananmu untuk melihat analisis progress!";
    return aiInsight || "Klik tombol di atas untuk mendapatkan analisis AI khusus untukmu.";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.titleIconCircle}>
            <Ionicons name="bar-chart" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Progress Mingguan</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="flame" size={18} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>{Math.round(totalThisWeek).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total kkal</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: "#F0F9FF" }]}>
              <Ionicons name="trending-up" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.statValue}>{avgDaily.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Rata-rata/hari</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: "#FDF4FF" }]}>
              <Ionicons name="ribbon" size={18} color="#A855F7" />
            </View>
            <Text style={styles.statValue}>{daysOnTarget}/7</Text>
            <Text style={styles.statLabel}>Target Tercapai</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kalori 7 Hari Terakhir</Text>
          <View style={styles.chartContainer}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 30}>
              {/* Target line */}
              <Line
                x1={0}
                y1={targetY}
                x2={CHART_WIDTH}
                y2={targetY}
                stroke={COLORS.danger}
                strokeWidth={1.5}
                strokeDasharray="6,4"
              />
              <SvgText
                x={CHART_WIDTH - 4}
                y={targetY - 4}
                fontSize={9}
                fill={COLORS.danger}
                textAnchor="end"
              >
                Target
              </SvgText>

              {chartData.map((d, i) => {
                const barH = maxCal > 0 ? (d.calories / maxCal) * CHART_HEIGHT : 0;
                const x = i * (CHART_WIDTH / 7) + BAR_PADDING / 2;
                const y = CHART_HEIGHT - barH;
                const isToday = d.date === today;
                const color = isToday
                  ? COLORS.primary
                  : d.calories > target * 1.1
                  ? COLORS.danger
                  : d.calories === 0
                  ? COLORS.gray[200]
                  : COLORS.primaryLight;
                const dateObj = new Date(d.date);
                const dayLabel = dayLabels[dateObj.getDay()];

                return (
                  <React.Fragment key={d.date}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barH, 2)}
                      rx={4}
                      fill={color}
                      opacity={isToday ? 1 : 0.75}
                    />
                    {d.calories > 0 && (
                      <SvgText
                        x={x + barWidth / 2}
                        y={y - 4}
                        fontSize={8}
                        fill={COLORS.text.secondary}
                        textAnchor="middle"
                      >
                        {Math.round(d.calories)}
                      </SvgText>
                    )}
                    <SvgText
                      x={x + barWidth / 2}
                      y={CHART_HEIGHT + 18}
                      fontSize={10}
                      fill={isToday ? COLORS.primary : COLORS.text.muted}
                      textAnchor="middle"
                      fontWeight={isToday ? "bold" : "normal"}
                    >
                      {isToday ? "Hari ini" : dayLabel}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Hari ini</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primaryLight }]} />
              <Text style={styles.legendText}>Hari lain</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.legendText}>Melebihi target</Text>
            </View>
          </View>
        </View>

        {/* AI Analysis */}
        <View style={[styles.analysisCard, isGenerating && { opacity: 0.9 }]}>
          <View style={styles.analysisHeader}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.aiIconCircle}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.analysisTitle}>AI Progress Insight</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.refreshBtn} 
              onPress={handleFetchInsight}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.analysisText}>
            {getAnalysis()}
          </Text>
          
          {!aiInsight && !isGenerating && (
            <TouchableOpacity style={styles.generateActionBtn} onPress={handleFetchInsight}>
              <Text style={styles.generateActionText}>Mulai Analisis AI</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Today summary */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Hari Ini</Text>
            <Text
              style={[
                styles.todayStatus,
                {
                  color:
                    todayCalories > target * 1.1
                      ? COLORS.danger
                      : todayCalories >= target * 0.9
                      ? COLORS.primary
                      : COLORS.accent,
                },
              ]}
            >
              {todayCalories > target * 1.1
                ? "Melebihi target"
                : todayCalories >= target * 0.9
                ? "Target tercapai ✓"
                : "Di bawah target"}
            </Text>
          </View>
          <View style={styles.todayProgress}>
            <View style={styles.todayTrack}>
              <View
                style={[
                  styles.todayFill,
                  {
                    width: `${Math.min((todayCalories / target) * 100, 100)}%` as `${number}%`,
                    backgroundColor: todayCalories > target ? COLORS.danger : COLORS.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.todayNumbers}>
              {Math.round(todayCalories)} / {target} kkal
            </Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 10 },
  titleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.text.primary, letterSpacing: -0.5 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: "900", color: COLORS.text.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: COLORS.text.muted, textAlign: "center", marginTop: 4, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text.primary, marginBottom: 20, letterSpacing: -0.3 },
  chartContainer: { alignItems: "center" },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.text.muted },
  aiIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  analysisCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  analysisHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  generateActionBtn: {
    marginTop: 16,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateActionText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  analysisTitle: { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  analysisText: { fontSize: 14, color: "rgba(255,255,255,0.95)", lineHeight: 22, fontWeight: "500" },
  todayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  todayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  todayTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text.primary },
  todayStatus: { fontSize: 13, fontWeight: "600" },
  todayProgress: {},
  todayTrack: {
    height: 12,
    backgroundColor: COLORS.gray[100],
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  todayFill: { height: "100%", borderRadius: 6 },
  todayNumbers: { fontSize: 13, color: COLORS.text.secondary, textAlign: "right" },
});
