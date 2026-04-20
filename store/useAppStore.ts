import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const STORAGE_KEY = "HealthMateUserSession";

interface UserSession {
  userId: string | null;
  userName: string | null;
  userRole: string | null;
}

interface AppStore extends UserSession {
  isLoaded: boolean;
  setUser: (id: string, name: string, role: string) => Promise<void>;
  clearUser: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

async function saveSession(session: UserSession) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
}

async function removeSession() {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

async function loadSession(): Promise<UserSession> {
  const saved = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!saved) return { userId: null, userName: null, userRole: null };
  try {
    return JSON.parse(saved) as UserSession;
  } catch {
    return { userId: null, userName: null, userRole: null };
  }
}

export const useAppStore = create<AppStore>((set) => ({
  userId: null,
  userName: null,
  userRole: null,
  isLoaded: false,
  setUser: async (id, name, role) => {
    const session = { userId: id, userName: name, userRole: role };
    await saveSession(session);
    set({ ...session });
  },
  clearUser: async () => {
    await removeSession();
    set({ userId: null, userName: null, userRole: null });
  },
  loadFromStorage: async () => {
    const session = await loadSession();
    set({ ...session, isLoaded: true });
  },
}));
