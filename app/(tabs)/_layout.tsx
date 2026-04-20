// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../lib/constants";

function TabIcon({
  emoji,
  label,
  focused,
}: {
  emoji: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Beranda" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📓" label="Diary" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.scanBtn}>
              <Text style={styles.scanEmoji}>📷</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Progress" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  tabItemActive: {
    backgroundColor: COLORS.primaryBg,
  },
  tabEmoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.text.muted,
    fontWeight: "500",
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  scanEmoji: {
    fontSize: 26,
  },
});
