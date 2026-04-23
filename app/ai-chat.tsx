// app/ai-chat.tsx
import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { COLORS } from "../lib/constants";
import { getFormattedDateTime } from "../lib/nutrition";
import { ChatMessage } from "../lib/types";
import { useAppStore } from "../store/useAppStore";

export default function AIChatScreen() {
  const router = useRouter();
  const { userId, chatMessages, addMessage, setMessages, clearChat } = useAppStore();
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemma-4-31b");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const chatWithAI = useAction(api.aiChat.chatWithAI);
  const userProfile = useQuery(api.users.getUserById, userId ? { userId: userId as Id<"users"> } : "skip");

  const MODELS = [
    { id: "gemma-4-31b", label: "Gemma 4 31B" },
    { id: "gemma-4-26b", label: "Gemma 4 26B" },
    { id: "gemini-3-flash", label: "Gemini 3 Flash" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  ];

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { 
      role: "user", 
      content: text.trim(), 
      timestamp: Date.now() 
    };
    await addMessage(userMsg);
    
    setInputText("");
    setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const timeStr = getFormattedDateTime();

    try {
      const history = chatMessages.map(m => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }],
      }));
      history.push({ 
        role: "user", 
        parts: [{ text: text.trim() }] 
      });

      const result = await chatWithAI({
        messages: history,
        customModel: selectedModel,
        currentTime: timeStr,
        userProfile: userProfile ? {
          goal: userProfile.goal, dailyCalorieTarget: userProfile.dailyCalorieTarget,
          weight: userProfile.weight, height: userProfile.height, age: userProfile.age,
        } : undefined,
      });

      const assistantMsg: ChatMessage = {
        role: "assistant", 
        content: result.response ?? "Maaf, tidak bisa memproses.", 
        timestamp: Date.now(),
      };
      await addMessage(assistantMsg);

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Gagal menghubungi AI. Coba lagi.";
      Alert.alert("Error", errorMessage);
      
      const rolledBack = chatMessages.filter(m => m.timestamp !== userMsg.timestamp);
      await setMessages(rolledBack);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [isLoading, chatMessages, addMessage, setMessages, chatWithAI, userProfile, selectedModel]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const chatProps = {
    chatMessages, clearChat, isLoading, inputText, setInputText, selectedModel, setSelectedModel, 
    MODELS, showModelPicker, setShowModelPicker, sendMessage, scrollRef, formatTime, isKeyboardVisible,
    userProfile
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior="padding"
        >
          <ChatUI {...chatProps} />
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <ChatUI {...chatProps} />
        </View>
      )}
    </SafeAreaView>
  );
}

// Komponen Pembantu UI agar kode tidak berantakan
function ChatUI(props: any) {
  const router = useRouter();
  const { 
    chatMessages, clearChat, isLoading, inputText, setInputText, 
    selectedModel, setSelectedModel, MODELS, showModelPicker, 
    setShowModelPicker, sendMessage, scrollRef, formatTime, isKeyboardVisible,
    userProfile
  } = props;

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiAvatar}>
            <Image 
              source={require("../assets/images/HealthMate.png")} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>HealthMate AI</Text>
            <View style={styles.statusRow}>
              <Text style={styles.headerSub}>Siap membantu Anda</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert("Hapus Chat", "Yakin ingin menghapus semua percakapan?", [
              { text: "Batal", style: "cancel" },
              { text: "Hapus", style: "destructive", onPress: clearChat }
            ]);
          }} 
          style={styles.clearBtn}
          activeOpacity={0.6}
        >
          <Text style={styles.clearText}>Hapus</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollRef} 
        style={styles.messageList} 
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false} 
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.map((msg: any, i: number) => (
          <View key={i} style={[styles.messageRow, msg.role === "user" ? styles.rowUser : styles.rowAI]}>
            {msg.role === "assistant" && (
              <View style={styles.aiBubbleAvatar}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </View>
            )}
            <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
              {msg.role === "user" ? (
                <Text style={styles.bubbleTextUser}>{msg.content}</Text>
              ) : (
                // @ts-ignore
                <Markdown style={markdownStyles}>{msg.content}</Markdown>
              )}
              <Text style={[styles.bubbleTime, msg.role === "user" && { color: "rgba(255,255,255,0.7)" }]}>
                {formatTime(msg.timestamp)}
              </Text>
            </View>
            {msg.role === "user" && (
              <View style={styles.userBubbleAvatar}>
                <Text style={styles.userAvatarText}>
                  {userProfile?.name?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageRow, styles.rowAI]}>
            <View style={styles.aiBubbleAvatar}>
              <Ionicons name="sparkles" size={14} color="#fff" />
            </View>
            <View style={[styles.bubbleAI, styles.typingBubble]}>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.typingText} numberOfLines={1}>HealthMate sedang berpikir...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={[
        styles.inputAreaWrapper,
        isKeyboardVisible && styles.inputAreaWrapperActive
      ]}>
        {showModelPicker && (
          <View style={styles.dropdownMenu}>
            {MODELS.map((m: any) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.menuItem, selectedModel === m.id && styles.menuItemActive]}
                onPress={() => {
                  setSelectedModel(m.id);
                  setShowModelPicker(false);
                }}
              >
                <Text style={[styles.menuLabel, selectedModel === m.id && styles.menuLabelActive]}>
                  {m.label}
                </Text>
                {selectedModel === m.id && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[
          styles.ideInputContainer,
          isKeyboardVisible && styles.ideInputContainerActive
        ]}>
          <TextInput 
            style={styles.ideInput} 
            value={inputText} 
            onChangeText={setInputText}
            placeholder="Tanya apa saja..." 
            placeholderTextColor={COLORS.gray[400]}
            multiline 
            maxLength={1000} 
            editable={!isLoading} 
            autoCorrect={true}
            spellCheck={true}
            autoCapitalize="sentences"
          />

          <View style={styles.ideControls}>
            <View style={styles.ideControlsLeft}>
              <TouchableOpacity 
                style={styles.ideModelBtn} 
                onPress={() => setShowModelPicker(!showModelPicker)}
              >
                <Text style={styles.ideModelText}>
                  {MODELS.find((m: any) => m.id === selectedModel)?.label || "Model"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.gray[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.ideControlsRight}>
              <TouchableOpacity 
                style={[
                  styles.ideSendBtn, 
                  (!inputText.trim() || isLoading) ? styles.ideSendBtnDisabled : styles.ideSendBtnActive
                ]}
                onPress={() => sendMessage(inputText)} 
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons 
                  name={isLoading ? "stop" : "send"} 
                  size={18} 
                  color={(!inputText.trim() || isLoading) ? COLORS.gray[400] : "#fff"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    zIndex: 100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    position: "relative",
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4ADE80", // Hijau cerah
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text.primary, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: COLORS.primary, fontWeight: "700", opacity: 0.8 },
  clearBtn: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    backgroundColor: "rgba(255, 59, 48, 0.05)" 
  },
  clearText: { fontSize: 14, color: "#FF3B30", fontWeight: "800" },

  dropdownContainer: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent", // Transparan total
    zIndex: 90,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.6)", // Semi-transparan
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  dropdownButtonLeft: { 
    flex: 1,
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  dropdownIcon: { fontSize: 18 },
  dropdownLabel: { 
    fontSize: 14, 
    fontWeight: "800", 
    color: COLORS.text.primary,
    textAlign: "center"
  },
  ideInputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 32, // Sangat bulat ala Gemini
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  ideInputContainerActive: {
    // Menjaga ukuran tetap sama sesuai permintaan user
  },
  ideInput: {
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 40,
    maxHeight: 150,
    paddingHorizontal: 8,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  ideControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  ideControlsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ideControlsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ideIconBtn: {
    padding: 4,
  },
  ideModelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ideModelText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: "700",
  },
  ideSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ideSendBtnActive: {
    backgroundColor: COLORS.primary, // Hijau saat ada teks
  },
  ideSendBtnDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.6,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    marginBottom: 12,
    padding: 8,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 18,
    gap: 12,
    marginBottom: 4,
  },
  menuItemActive: { backgroundColor: COLORS.primary },
  menuLabel: { 
    fontSize: 16, 
    color: COLORS.text.primary, 
    fontWeight: "700",
    textAlign: "center"
  },
  menuLabelActive: { color: "#fff" },

  messageList: { flex: 1 },
  messageContent: { padding: 20, paddingTop: 20, paddingBottom: 40, gap: 20 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  aiBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 4,
  },
  userBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray[200],
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.gray[600],
  },
  bubble: {
    maxWidth: "85%",
    padding: 16,
    borderRadius: 24,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleTextUser: { fontSize: 16, color: "#fff", lineHeight: 24, fontWeight: "500" },
  bubbleTime: { fontSize: 10, color: COLORS.text.muted, marginTop: 8, textAlign: "right", opacity: 0.6 },

  inputAreaWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20, // Ada jarak dari bawah saat keyboard tertutup (Foto 1)
    backgroundColor: "transparent",
  },
  inputAreaWrapperActive: {
    // Menjaga padding tetap sama agar tidak melebar (Foto 1 style tetap dipertahankan)
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 30,
    gap: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.primary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sendBtnDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0 },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  typingText: { fontSize: 14, color: COLORS.text.muted, fontWeight: "600", fontStyle: "italic" },
});

const markdownStyles = StyleSheet.create({
  body: { fontSize: 16, color: COLORS.text.primary, lineHeight: 24 },
  heading1: { fontWeight: "900", color: COLORS.text.primary, marginVertical: 10 },
  strong: { fontWeight: "800", color: COLORS.text.primary },
  paragraph: { marginVertical: 6 },
  list_item: { marginVertical: 4 },
});
