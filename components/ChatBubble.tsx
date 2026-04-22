import React, { useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Text, View, Animated } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { COLORS } from "../lib/constants";
import { useAppStore } from "../store/useAppStore";

export function ChatBubble() {
  const router = useRouter();
  const segments = useSegments();
  const { userId } = useAppStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (userId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [userId]);

  // Jangan tampilkan jika:
  // 1. Belum login
  // 2. Berada di dalam grup auth
  // 3. Sedang berada di halaman chat itu sendiri
  const isAuthGroup = segments[0] === "(auth)";
  const isChatPage = segments[0] === "ai-chat";
  const isScanPage = segments[0] === "(tabs)" && segments[1] === "scan";
  
  if (!userId || isAuthGroup || isChatPage || isScanPage) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.bubble}
      onPress={() => router.push("/ai-chat")}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>🤖</Text>
      </View>
      <View style={styles.badge}>
        <Animated.View 
          style={[
            styles.pulse,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    right: 20,
    bottom: 90, // Di atas tab bar (biasanya tab bar sekitar 60-80px)
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 28,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  pulse: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    opacity: 0.6,
  },
});
