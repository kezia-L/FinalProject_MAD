// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#F0FDF4" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F0FDF4" },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}
