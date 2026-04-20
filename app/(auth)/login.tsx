// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS } from "../../lib/constants";
import { verifyPassword } from "../../lib/auth";
import { useAppStore } from "../../store/useAppStore";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [activeRole, setActiveRole] = useState<"user" | "admin">("user");

  const { setUser } = useAppStore();

  // We can't conditionally call useQuery with user input, so we query based on email
  // But we need to trigger this only on submit - use a separate pattern
  const [queryEmail, setQueryEmail] = useState<string | null>(null);
  const userResult = useQuery(
    api.users.getUserByEmail,
    queryEmail ? { email: queryEmail } : "skip"
  );

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email dan password harus diisi");
      return;
    }
    setLoading(true);
    try {
      // Trigger the query by setting queryEmail
      setQueryEmail(email.trim().toLowerCase());
    } catch {
      setLoading(false);
    }
  };

  // React to userResult changes
  React.useEffect(() => {
    if (queryEmail === null) return;
    if (userResult === undefined) return; // still loading

    const processLogin = async () => {
      if (!userResult) {
        Alert.alert("Login Gagal", "Email tidak terdaftar");
        setQueryEmail(null);
        setLoading(false);
        return;
      }

      const valid = await verifyPassword(password, queryEmail, userResult.passwordHash);
      if (!valid) {
        Alert.alert("Login Gagal", "Password salah");
        setQueryEmail(null);
        setLoading(false);
        return;
      }

      // Check if user is trying to login with wrong role
      if (userResult.role !== activeRole) {
        Alert.alert(
          "Akses Ditolak",
          `Akun ini terdaftar sebagai ${userResult.role}, bukan ${activeRole}.`
        );
        setQueryEmail(null);
        setLoading(false);
        return;
      }

      await setUser(userResult._id, userResult.name, userResult.role);
      setLoading(false);
      setQueryEmail(null);

      if (userResult.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/(tabs)");
      }
    };

    processLogin();
  }, [userResult, queryEmail, activeRole]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🥗</Text>
            </View>
            <Text style={styles.appName}>HealthMate</Text>
            <Text style={styles.tagline}>Hidup Sehat Dimulai dari Piring</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Selamat Datang</Text>
            <Text style={styles.subtitle}>Masuk ke akun kamu</Text>

            {/* Role Selector */}
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleTab, activeRole === "user" && styles.roleTabActive]}
                onPress={() => setActiveRole("user")}
              >
                <Text style={[styles.roleTabText, activeRole === "user" && styles.roleTabTextActive]}>
                  👤 User
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleTab, activeRole === "admin" && styles.roleTabActive]}
                onPress={() => setActiveRole("admin")}
              >
                <Text style={[styles.roleTabText, activeRole === "admin" && styles.roleTabTextActive]}>
                  👑 Admin
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email {activeRole === "admin" ? "Admin" : ""}</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@contoh.com"
                  placeholderTextColor={COLORS.gray[400]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  placeholderTextColor={COLORS.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPass ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginBtn,
                loading && styles.loginBtnDisabled,
                activeRole === "admin" && { backgroundColor: "#8B5CF6" }
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>
                  Masuk sebagai {activeRole === "admin" ? "Admin" : "User"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.registerText}>
                Belum punya akun?{" "}
                <Text style={styles.registerHighlight}>Daftar Sekarang</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  dividerText: {
    marginHorizontal: 12,
    color: COLORS.text.muted,
    fontSize: 13,
  },
  registerLink: {
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  registerHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  roleSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text.muted,
  },
  roleTabTextActive: {
    color: COLORS.primary,
  },
});
