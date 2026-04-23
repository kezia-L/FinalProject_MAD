// components/FoodCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, MEAL_TYPES } from "../lib/constants";
import { FoodLog } from "../lib/types";

interface FoodCardProps {
  log: FoodLog;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function FoodCard({ log, onDelete, compact = false }: FoodCardProps) {
  const mealType = MEAL_TYPES.find((m) => m.id === log.mealType);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.left}>
        <View style={[styles.iconContainer, { backgroundColor: mealType?.color + "20" }]}>
          <Ionicons
            name={(mealType as any)?.iconName ?? "restaurant-outline"}
            size={20}
            color={mealType?.color ?? COLORS.primary}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.foodName} numberOfLines={1}>
            {log.foodName}
          </Text>
          {!compact && (
            <View style={styles.macros}>
              <Text style={styles.macro}>
                <Text style={{ color: COLORS.macro.protein }}>P</Text> {Math.round(log.protein)}g
              </Text>
              <Text style={styles.macroDot}>·</Text>
              <Text style={styles.macro}>
                <Text style={{ color: COLORS.macro.carbs }}>K</Text> {Math.round(log.carbs)}g
              </Text>
              <Text style={styles.macroDot}>·</Text>
              <Text style={styles.macro}>
                <Text style={{ color: COLORS.macro.fat }}>L</Text> {Math.round(log.fat)}g
              </Text>
              {log.portionGram ? (
                <>
                  <Text style={styles.macroDot}>·</Text>
                  <Text style={styles.macro}>{log.portionGram}g</Text>
                </>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.calories}>{Math.round(log.calories)}</Text>
        <Text style={styles.kcal}>kkal</Text>
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(log._id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardCompact: {
    padding: 8,
    marginVertical: 2,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text.primary,
  },
  macros: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    flexWrap: "wrap",
  },
  macro: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  macroDot: {
    fontSize: 11,
    color: COLORS.gray[300],
    marginHorizontal: 3,
  },
  right: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  calories: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  kcal: {
    fontSize: 10,
    color: COLORS.text.muted,
  },
  deleteBtn: {
    marginTop: 4,
    padding: 4,
  },
});
