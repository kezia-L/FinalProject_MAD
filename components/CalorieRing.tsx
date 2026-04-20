// components/CalorieRing.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "../lib/constants";

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

export function CalorieRing({
  consumed,
  target,
  size = 180,
  strokeWidth = 14,
}: CalorieRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(consumed / Math.max(target, 1), 1);
  const strokeDashoffset = circumference * (1 - percentage);
  const remaining = Math.max(target - consumed, 0);
  const center = size / 2;

  const ringColor =
    percentage >= 1
      ? COLORS.danger
      : percentage >= 0.9
      ? COLORS.accent
      : COLORS.primary;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text style={styles.consumedText}>{Math.round(consumed)}</Text>
        <Text style={styles.label}>kkal dimakan</Text>
        <View style={styles.divider} />
        <Text style={styles.remainingText}>{Math.round(remaining)}</Text>
        <Text style={styles.remainingLabel}>
          {consumed > target ? "kkal lebih" : "kkal tersisa"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  textContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  consumedText: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text.primary,
    lineHeight: 36,
  },
  label: {
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  divider: {
    width: 30,
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: 6,
  },
  remainingText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  remainingLabel: {
    fontSize: 10,
    color: COLORS.text.muted,
    marginTop: 1,
  },
});
