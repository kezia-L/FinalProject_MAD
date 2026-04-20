// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "../store/useAppStore";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function RootLayoutNav() {
  const { userId, userRole, isLoaded, loadFromStorage } = useAppStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inAdminGroup = segments[0] === "admin";
    const inTabsGroup = segments[0] === "(tabs)";

    if (!userId) {
      // Not logged in: force to auth group
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      // Logged in: redirect if in auth group or if in wrong role-based group
      if (inAuthGroup) {
        if (userRole === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/(tabs)");
        }
      } else if (userRole === "admin" && inTabsGroup) {
        // Admin shouldn't be in User tabs
        router.replace("/admin");
      } else if (userRole === "user" && inAdminGroup) {
        // User shouldn't be in Admin dashboard
        router.replace("/(tabs)");
      }
    }
  }, [isLoaded, userId, userRole, segments]);

  return (
    <>
      <StatusBar style="dark" backgroundColor="#F0FDF4" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="ai-chat" options={{ presentation: "modal" }} />
        <Stack.Screen name="meal-plan" options={{ presentation: "modal" }} />
        <Stack.Screen name="scan_result/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <RootLayoutNav />
    </ConvexProvider>
  );
}
