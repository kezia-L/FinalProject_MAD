// app/(auth)/login.tsx
import { useState, useEffect } from "react";
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
import { useQuery, useMutation } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { makeRedirectUri } from "expo-auth-session";
import { api } from "../../convex/_generated/api";
import { COLORS } from "../../lib/constants";
import { verifyPassword } from "../../lib/auth";
import { useAppStore } from "../../store/useAppStore";

// Agar popup OAuth bisa menutup otomatis setelah selesai
WebBrowser.maybeCompleteAuthSession();


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { setUser } = useAppStore();

  // Untuk email/password login
  const [queryEmail, setQueryEmail] = useState<string | null>(null);
  const userResult = useQuery(
    api.users.getUserByEmail,
    queryEmail ? { email: queryEmail } : "skip"
  );

  // State untuk melacak OAuth session
  const [oauthState, setOauthState] = useState<string | null>(null);

  // Poll ke Convex untuk mengecek session setiap saat
  const sessionResult = useQuery(
    api.googleAuth.checkSession,
    oauthState ? { state: oauthState } : "skip"
  );
  const deleteSession = useMutation(api.googleAuth.deleteSession);

  // Jika sessionResult ada datanya, artinya user sudah selesai login di browser
  useEffect(() => {
    if (sessionResult && oauthState) {
      const processSession = async () => {
        try {
          await setUser(sessionResult.userId, sessionResult.name, sessionResult.role);
          await deleteSession({ state: oauthState });
          router.replace("/(tabs)");
        } catch (error) {
          console.error("Gagal simpan session:", error);
          Alert.alert("Error", "Gagal menyelesaikan proses login.");
        } finally {
          setGoogleLoading(false);
          setOauthState(null);
        }
      };
      processSession();
    }
  }, [sessionResult, oauthState, router, setUser, deleteSession]);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      // Buat state random yang unik untuk session ini
      const sessionId = Crypto.randomUUID();
      setOauthState(sessionId);

      // Pastikan clientId dan siteUrl tersedia
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

      if (!clientId || !siteUrl) {
        throw new Error("Client ID atau Site URL tidak ditemukan di .env");
      }

      // Generate deep link URI supaya browser bisa mengarah kembali ke app
      const returnUri = makeRedirectUri({ scheme: "finalmad" });
      
      // Kirim sessionId dan returnUri ke dalam 'state' param
      const stateObj = { id: sessionId, returnUri };
      const encodedState = btoa(JSON.stringify(stateObj));

      const redirectUri = `${siteUrl}/auth/google/callback`;

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=openid%20profile%20email&state=${encodedState}`;

      // Buka browser, tapi menggunakan openAuthSessionAsync
      // Browser akan otomatis tertutup ketika diarahkan ke returnUri
      await WebBrowser.openAuthSessionAsync(authUrl, returnUri);

      // Setelah kembali ke app, kita akan menunggu sessionResult berubah
    } catch (error) {
      console.error(error);
      Alert.alert("Gagal", "Tidak dapat membuka halaman login Google.");
      setGoogleLoading(false);
      setOauthState(null);
    }
  };

  // ================================================
  // EMAIL / PASSWORD HANDLER
  // ================================================
  const handleLogin = async () => {

    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email dan password harus diisi");
      return;
    }
    setLoading(true);
    try {
      setQueryEmail(email.trim().toLowerCase());
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryEmail === null) return;
    if (userResult === undefined) return;

    const processLogin = async () => {
      if (!userResult) {
        Alert.alert("Login Gagal", "Email tidak terdaftar");
        setQueryEmail(null);
        setLoading(false);
        return;
      }

      // User Google tidak punya passwordHash, tolak login via password
      if (!userResult.passwordHash) {
        Alert.alert(
          "Login Gagal",
          "Akun ini terdaftar via Google. Gunakan tombol 'Lanjutkan dengan Google'."
        );
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

      await setUser(userResult._id, userResult.name, userResult.role);
      setLoading(false);
      setQueryEmail(null);

      router.replace("/(tabs)");
    };

    processLogin();
  }, [userResult, queryEmail]);

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

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Selamat Datang</Text>
            <Text style={styles.subtitle}>Masuk ke akun kamu</Text>

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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.secondary} style={styles.inputIcon} />
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
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginBtn,
                loading && styles.loginBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>
                  Masuk Sekarang
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.loginBtnDisabled]}
              onPress={handleGoogleLogin}
              activeOpacity={0.7}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={COLORS.text.primary} size="small" />
              ) : (
                <>
                  <Image
                    source={require("../../assets/images/google-logo-color.png")}
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleBtnText}>Lanjutkan dengan Google</Text>
                </>
              )}
            </TouchableOpacity>

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
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 12,
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
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text.primary,
  },
});
