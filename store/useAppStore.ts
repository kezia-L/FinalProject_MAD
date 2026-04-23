import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { ChatMessage } from "../lib/types";

const SESSION_KEY = "HealthMateUserSession";
const CHAT_KEY = "HealthMateChatHistory";

interface UserSession {
  userId: string | null;
  userName: string | null;
  userRole: string | null;
}

interface AppStore extends UserSession {
  isLoaded: boolean;
  chatMessages: ChatMessage[];
  setUser: (id: string, name: string, role: string) => Promise<void>;
  clearUser: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  setMessages: (messages: ChatMessage[]) => Promise<void>;
  addMessage: (message: ChatMessage) => Promise<void>;
  clearChat: () => Promise<void>;
}

async function saveSession(session: UserSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

async function removeSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function loadSession(): Promise<UserSession> {
  const saved = await SecureStore.getItemAsync(SESSION_KEY);
  if (!saved) return { userId: null, userName: null, userRole: null };
  try {
    return JSON.parse(saved) as UserSession;
  } catch {
    return { userId: null, userName: null, userRole: null };
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  userId: null,
  userName: null,
  userRole: null,
  chatMessages: [],
  isLoaded: false,

  setUser: async (id, name, role) => {
    const session = { userId: id, userName: name, userRole: role };
    await saveSession(session);
    set({ ...session });
  },

  clearUser: async () => {
    await removeSession();
    await AsyncStorage.removeItem(CHAT_KEY);
    set({ userId: null, userName: null, userRole: null, chatMessages: [] });
  },

  loadFromStorage: async () => {
    const session = await loadSession();
    const savedChat = await AsyncStorage.getItem(CHAT_KEY);
    let chatMessages: ChatMessage[] = [];
    if (savedChat) {
      try {
        chatMessages = JSON.parse(savedChat);
      } catch (e) {
        console.error("Gagal parse chat history", e);
      }
    }
    
    // Default welcome message if empty
    if (chatMessages.length === 0) {
      chatMessages = [{
        role: "assistant",
        content: "Halo! Saya HealthMate AI ✨\n\nSiap membantu pertanyaan seputar nutrisi, diet, dan kesehatan kamu!",
        timestamp: Date.now(),
      }];
    }

    set({ ...session, chatMessages, isLoaded: true });
  },

  setMessages: async (messages) => {
    set({ chatMessages: messages });
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  },

  addMessage: async (message) => {
    const newMessages = [...get().chatMessages, message];
    set({ chatMessages: newMessages });
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(newMessages));
  },

  clearChat: async () => {
    const initialMsg: ChatMessage[] = [{
      role: "assistant",
      content: "Halo! Saya HealthMate AI ✨\n\nSiap membantu pertanyaan seputar nutrisi, diet, dan kesehatan kamu!",
      timestamp: Date.now(),
    }];
    set({ chatMessages: initialMsg });
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(initialMsg));
  },
}));
