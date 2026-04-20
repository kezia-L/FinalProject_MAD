// app/index.tsx
// This file intentionally left as a redirect entry point.
// Routing is handled by app/_layout.tsx based on auth state.
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
