// components/ScanOverlay.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { COLORS } from "../lib/constants";

interface ScanOverlayProps {
  isScanning?: boolean;
}

export function ScanOverlay({ isScanning = false }: ScanOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cornerSize = 24;
  const cornerWidth = 3;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isScanning, pulseAnim]);

  const cornerStyle = {
    position: "absolute" as const,
    width: cornerSize,
    height: cornerSize,
  };

  const hLine = {
    position: "absolute" as const,
    width: cornerSize,
    height: cornerWidth,
    backgroundColor: COLORS.primary,
    borderRadius: cornerWidth,
  };

  const vLine = {
    position: "absolute" as const,
    width: cornerWidth,
    height: cornerSize,
    backgroundColor: COLORS.primary,
    borderRadius: cornerWidth,
  };

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Dark edges */}
      <View style={styles.topBar} />
      <View style={styles.middleRow}>
        <View style={styles.sideBar} />
        {/* Scan frame */}
        <Animated.View style={[styles.frame, { opacity: pulseAnim }]}>
          {/* Top-left */}
          <View style={{ ...cornerStyle, top: 0, left: 0 }}>
            <View style={{ ...hLine, top: 0, left: 0 }} />
            <View style={{ ...vLine, top: 0, left: 0 }} />
          </View>
          {/* Top-right */}
          <View style={{ ...cornerStyle, top: 0, right: 0 }}>
            <View style={{ ...hLine, top: 0, right: 0 }} />
            <View style={{ ...vLine, top: 0, right: 0 }} />
          </View>
          {/* Bottom-left */}
          <View style={{ ...cornerStyle, bottom: 0, left: 0 }}>
            <View style={{ ...hLine, bottom: 0, left: 0 }} />
            <View style={{ ...vLine, bottom: 0, left: 0 }} />
          </View>
          {/* Bottom-right */}
          <View style={{ ...cornerStyle, bottom: 0, right: 0 }}>
            <View style={{ ...hLine, bottom: 0, right: 0 }} />
            <View style={{ ...vLine, bottom: 0, right: 0 }} />
          </View>
        </Animated.View>
        <View style={styles.sideBar} />
      </View>
      <View style={styles.bottomBar}>
        <Text style={styles.hint}>
          {isScanning ? "Menganalisis makanan..." : "Arahkan kamera ke makanan"}
        </Text>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  topBar: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  middleRow: {
    flexDirection: "row",
    height: FRAME_SIZE,
  },
  sideBar: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    backgroundColor: "transparent",
    position: "relative",
  },
  bottomBar: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    paddingTop: 20,
  },
  hint: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(22,163,74,0.8)",
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
});
