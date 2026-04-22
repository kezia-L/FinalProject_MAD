// app/ai-chat.tsx
import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { COLORS, QUICK_QUESTIONS } from "../lib/constants";
import { ChatMessage } from "../lib/types";
import { useAppStore } from "../store/useAppStore";
import { Id } from "../convex/_generated/dataModel";

export default function AIChatScreen() {
  const router = useRouter();
  const { userId, chatMessages, addMessage, setMessages, clearChat } = useAppStore();
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const chatWithAI = useAction(api.aiRecommend.chatWithAI);
  const userProfile = useQuery(api.users.getUserById, userId ? { userId: userId as Id<"users"> } : "skip");

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    await addMessage(userMsg);
    
    setInputText("");
    setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // History excluding the very first welcome message for the AI context if desired, 
      // but here we send all messages.
      const history = chatMessages.map(m => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }],
      }));
      history.push({ role: "user", parts: [{ text: text.trim() }] });

      const result = await chatWithAI({
        messages: history,
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
      
      // Optional: remove the user message if it failed
      const rolledBack = chatMessages.filter(m => m.timestamp !== userMsg.timestamp);
      await setMessages(rolledBack);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [isLoading, chatMessages, addMessage, setMessages, chatWithAI, userProfile]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.aiAvatar}><Text style={{ fontSize: 20 }}>🤖</Text></View>
            <View>
              <Text style={styles.headerTitle}>HealthMate AI</Text>
              <Text style={styles.headerSub}>Asisten nutrisi personal</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
            <Text style={styles.clearText}>Hapus</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {chatMessages.map((msg, i) => (
            <View key={i} style={[styles.messageRow, msg.role === "user" ? styles.rowUser : styles.rowAI]}>
              {msg.role === "assistant" && (
                <View style={styles.aiBubbleAvatar}><Text style={{ fontSize: 16 }}>🤖</Text></View>
              )}
              <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                <Text style={[styles.bubbleText, msg.role === "user" && { color: "#fff" }]}>{msg.content}</Text>
                <Text style={[styles.bubbleTime, msg.role === "user" && { color: "rgba(255,255,255,0.7)" }]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageRow, styles.rowAI]}>
              <View style={styles.aiBubbleAvatar}><Text style={{ fontSize: 16 }}>🤖</Text></View>
              <View style={[styles.bubbleAI, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ fontSize: 13, color: COLORS.text.muted }}>Mengetik...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickList}
          contentContainerStyle={styles.quickListContent}>
          {QUICK_QUESTIONS.map(q => (
            <TouchableOpacity key={q} style={styles.quickChip} onPress={() => sendMessage(q)} disabled={isLoading}>
              <Text style={styles.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput style={styles.input} value={inputText} onChangeText={setInputText}
            placeholder="Tanya seputar nutrisi..." placeholderTextColor={COLORS.gray[400]}
            multiline maxLength={500} editable={!isLoading} />
          <TouchableOpacity style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)} disabled={!inputText.trim() || isLoading}>
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 18, color: COLORS.text.secondary },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text.primary },
  headerSub: { fontSize: 11, color: COLORS.primary },
  clearBtn: { padding: 8 },
  clearText: { fontSize: 13, color: COLORS.danger, fontWeight: "600" },
  messageList: { flex: 1 },
  messageContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  aiBubbleAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 12, paddingHorizontal: 16 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: COLORS.white, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 12, paddingHorizontal: 16,
  },
  bubbleText: { fontSize: 14, color: COLORS.text.primary, lineHeight: 22 },
  bubbleTime: { fontSize: 10, color: COLORS.text.muted, marginTop: 4, textAlign: "right" },
  quickList: { maxHeight: 44, backgroundColor: COLORS.white },
  quickListContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, flexDirection: "row" },
  quickChip: {
    backgroundColor: COLORS.primaryBg, borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  quickChipText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  inputArea: {
    flexDirection: "row", alignItems: "flex-end", padding: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 12, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 22,
    borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14, color: COLORS.text.primary, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
