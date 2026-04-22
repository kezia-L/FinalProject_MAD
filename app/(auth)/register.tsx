// app/(auth)/register.tsx
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { COLORS } from "../../lib/constants";
import { hashPassword } from "../../lib/auth";
import { useAppStore } from "../../store/useAppStore";

export default function RegisterScreen() {
  const router = useRouter();
  const registerMutation = useMutation(api.users.register);
  const { setUser } = useAppStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Semua field harus diisi");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Konfirmasi password tidak cocok");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(password, email.trim().toLowerCase());
      const result = await registerMutation({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        goal: "be_healthy", // Default goal
      });

      await setUser(result.userId, name.trim(), "user");
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registrasi gagal";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/HealthMate.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Kenali Nutrisimu, Jaga Kesehatanmu</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Buat Akun Baru</Text>
            <Text style={styles.subtitle}>Bergabunglah dan mulai perjalanan sehat kamu</Text>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nama kamu"
                  placeholderTextColor={COLORS.gray[400]}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
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

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={COLORS.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Konfirmasi Password</Text>
              <View style={[
                styles.inputWrapper,
                confirmPassword && confirmPassword !== password && styles.inputError
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ulangi password"
                  placeholderTextColor={COLORS.gray[400]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPass}
                  editable={!loading}
                />
              </View>
              {confirmPassword && confirmPassword !== password && (
                <Text style={styles.errorText}>Password tidak cocok</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Daftar Sekarang</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={styles.loginText}>
                Sudah punya akun?{" "}
                <Text style={styles.loginHighlight}>Masuk di sini</Text>
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
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 12,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
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
  inputError: {
    borderColor: COLORS.danger,
  },
  inputIcon: {
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
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  registerBtn: {
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
  btnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginLink: {
    alignItems: "center",
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  loginHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
