// components/NutritionBar.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../lib/constants";

interface NutritionBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
}

export function NutritionBar({
  label,
  current,
  target,
  unit = "g",
  color,
}: NutritionBarProps) {
  const percentage = Math.min((current / Math.max(target, 1)) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          <Text style={[styles.current, { color }]}>{Math.round(current)}</Text>
          <Text style={styles.target}>
            /{Math.round(target)}
            {unit}
          </Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percentage}%` as `${number}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: "500",
  },
  values: {
    fontSize: 13,
  },
  current: {
    fontWeight: "700",
    fontSize: 14,
  },
  target: {
    color: COLORS.text.muted,
    fontSize: 12,
  },
  track: {
    height: 8,
    backgroundColor: COLORS.gray[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
