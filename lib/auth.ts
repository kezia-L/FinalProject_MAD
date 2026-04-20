// lib/auth.ts
import * as Crypto from "expo-crypto";

const SALT_PREFIX = "healthmate_salt_2024_";

async function sha256(message: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message
  );
  return hash;
}

export async function hashPassword(password: string, email: string): Promise<string> {
  const salt = SALT_PREFIX + email.toLowerCase();
  const salted = salt + password;
  const hash = await sha256(salted);
  return hash;
}

export async function verifyPassword(
  password: string,
  email: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password, email);
  return hash === storedHash;
}
