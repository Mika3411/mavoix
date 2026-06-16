import type { Profile } from "../types";
import { ensureProfile } from "./normalize";

const PUBLIC_PROFILES_KEY = "maVoixProfiles";
const PRIVATE_VAULT_KEY = "maVoixPrivateProfilesVault";
const LEGACY_LOCAL_PRIVACY_KEY = "maVoixLocalPrivacyKey";
const PRIVACY_KEY_DB = "maVoixPrivacyKeys";
const PRIVACY_KEY_STORE = "keys";
const MEDICAL_VAULT_KEY_ID = "medical-vault";

const PRIVATE_PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "birthDate",
  "address",
  "mainNeeds",
  "profilePhoto",
  "photo",
  "socialSecurityNumber",
  "medicalInfo",
  "doctorInfo",
  "emergencyContacts",
  "pinProtection",
] as const;

type PrivateProfileData = {
  id: string;
  [key: string]: unknown;
};

type PrivateVaultPayload = {
  version: number;
  savedAt: string;
  profiles: PrivateProfileData[];
};

type EncryptedVault = {
  version: number;
  algorithm: "AES-GCM";
  protection?: "device" | "password";
  kdf?: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt: string;
  };
  iv: string;
  data: string;
};

let privacyKeyPromise: Promise<CryptoKey> | null = null;

export type LocalProfilesSnapshot = {
  profiles: Profile[];
  hasPrivateVault: boolean;
  passwordProtected: boolean;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseWebCrypto() {
  return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function getLocalPrivacyKey() {
  if (!privacyKeyPromise) {
    privacyKeyPromise = resolveLocalPrivacyKey().catch((error) => {
      privacyKeyPromise = null;
      throw error;
    });
  }

  return privacyKeyPromise;
}

async function derivePasswordKey(
  password: string,
  salt: ArrayBuffer,
  iterations = 210000
) {
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function resolveLocalPrivacyKey() {
  if (!canUseWebCrypto()) {
    throw new Error("Le chiffrement local n'est pas disponible sur ce navigateur.");
  }

  if (canUseIndexedDb()) {
    try {
      return await getIndexedDbPrivacyKey();
    } catch (error) {
      console.warn("IndexedDB indisponible pour la cle privee locale :", error);
    }
  }

  if (!canUseLocalStorage()) {
    throw new Error("Le stockage local n'est pas disponible sur ce navigateur.");
  }

  let rawKey = window.localStorage.getItem(LEGACY_LOCAL_PRIVACY_KEY);

  if (!rawKey) {
    const keyBytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(keyBytes);
    rawKey = arrayBufferToBase64(keyBytes.buffer);
    window.localStorage.setItem(LEGACY_LOCAL_PRIVACY_KEY, rawKey);
  }

  return globalThis.crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(rawKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function openPrivacyKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(PRIVACY_KEY_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PRIVACY_KEY_STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readStoredCryptoKey(database: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PRIVACY_KEY_STORE, "readonly");
    const store = transaction.objectStore(PRIVACY_KEY_STORE);
    const request = store.get(MEDICAL_VAULT_KEY_ID);

    request.onsuccess = () => resolve((request.result as CryptoKey) || null);
    request.onerror = () => reject(request.error);
  });
}

function storeCryptoKey(database: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PRIVACY_KEY_STORE, "readwrite");
    const store = transaction.objectStore(PRIVACY_KEY_STORE);
    const request = store.put(key, MEDICAL_VAULT_KEY_ID);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getIndexedDbPrivacyKey() {
  const database = await openPrivacyKeyDatabase();

  try {
    const storedKey = await readStoredCryptoKey(database);
    if (storedKey) return storedKey;

    const legacyRawKey = canUseLocalStorage()
      ? window.localStorage.getItem(LEGACY_LOCAL_PRIVACY_KEY)
      : "";
    const key = legacyRawKey
      ? await globalThis.crypto.subtle.importKey(
          "raw",
          base64ToArrayBuffer(legacyRawKey),
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        )
      : await globalThis.crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );

    await storeCryptoKey(database, key as CryptoKey);

    if (legacyRawKey) {
      window.localStorage.removeItem(LEGACY_LOCAL_PRIVACY_KEY);
    }

    return key as CryptoKey;
  } finally {
    database.close();
  }
}

function getPrivateProfileData(profile: Profile): PrivateProfileData {
  const privateData: PrivateProfileData = { id: profile.id };

  PRIVATE_PROFILE_FIELDS.forEach((field) => {
    const value = profile[field as keyof Profile];
    if (typeof value !== "undefined") {
      privateData[field] = value;
    }
  });

  return privateData;
}

export function stripPrivateProfileData(profile: Profile) {
  const publicProfile: Record<string, unknown> = { ...profile };

  PRIVATE_PROFILE_FIELDS.forEach((field) => {
    delete publicProfile[field];
  });

  return publicProfile;
}

async function encryptPrivatePayload(
  payload: PrivateVaultPayload,
  password = ""
): Promise<EncryptedVault> {
  let kdf: EncryptedVault["kdf"] | undefined;
  let key: CryptoKey;

  if (password) {
    const salt = new Uint8Array(16);
    globalThis.crypto.getRandomValues(salt);
    key = await derivePasswordKey(password, salt.buffer);
    kdf = {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 210000,
      salt: arrayBufferToBase64(salt.buffer),
    };
  } else {
    key = await getLocalPrivacyKey();
  }

  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedPayload
  );

  return {
    version: 1,
    algorithm: "AES-GCM",
    protection: password ? "password" : "device",
    ...(kdf ? { kdf } : {}),
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encrypted),
  };
}

function isPasswordProtectedVault(vault: EncryptedVault | null) {
  return Boolean(vault?.protection === "password" || vault?.kdf);
}

function parseStoredVault() {
  if (!canUseLocalStorage()) return null;

  const rawVault = window.localStorage.getItem(PRIVATE_VAULT_KEY);
  if (!rawVault) return null;

  return JSON.parse(rawVault) as EncryptedVault;
}

async function decryptPrivatePayload(
  vault: EncryptedVault,
  password = ""
): Promise<PrivateVaultPayload> {
  const passwordProtected = isPasswordProtectedVault(vault);

  if (passwordProtected && !password) {
    throw new Error("Mot de passe requis pour deverrouiller les donnees medicales.");
  }

  const key =
    passwordProtected && vault.kdf
      ? await derivePasswordKey(
          password,
          base64ToArrayBuffer(vault.kdf.salt),
          vault.kdf.iterations
        )
      : await getLocalPrivacyKey();
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(vault.iv)) },
    key,
    base64ToArrayBuffer(vault.data)
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function readLocalProfilesSnapshot(fallbackProfiles: Profile[]): LocalProfilesSnapshot {
  if (!canUseLocalStorage()) {
    return {
      profiles: fallbackProfiles,
      hasPrivateVault: false,
      passwordProtected: false,
    };
  }

  try {
    const rawProfiles = window.localStorage.getItem(PUBLIC_PROFILES_KEY);
    const parsedProfiles = rawProfiles ? JSON.parse(rawProfiles) : null;
    const profiles = Array.isArray(parsedProfiles)
      ? parsedProfiles.map((profile) => ensureProfile(profile))
      : fallbackProfiles;

    const vault = parseStoredVault();

    return {
      profiles,
      hasPrivateVault: Boolean(vault),
      passwordProtected: isPasswordProtectedVault(vault),
    };
  } catch (error) {
    console.error("Impossible de lire les profils locaux :", error);
    return {
      profiles: fallbackProfiles,
      hasPrivateVault: false,
      passwordProtected: false,
    };
  }
}

export async function readPrivateProfiles(password = "") {
  if (!canUseLocalStorage()) return [];

  const vault = parseStoredVault();
  if (!vault) return [];

  const payload = await decryptPrivatePayload(vault, password);

  return Array.isArray(payload.profiles) ? payload.profiles : [];
}

export function mergePrivateProfileData(
  profiles: Profile[],
  privateProfiles: PrivateProfileData[]
) {
  const privateDataById = new Map(
    privateProfiles.map((profile) => [profile.id, profile])
  );

  return profiles.map((profile) =>
    ensureProfile({
      ...profile,
      ...(privateDataById.get(profile.id) || {}),
    })
  );
}

export async function persistLocalProfiles(profiles: Profile[], password = "") {
  if (!canUseLocalStorage()) return false;

  if (!canUseWebCrypto()) {
    window.localStorage.setItem(PUBLIC_PROFILES_KEY, JSON.stringify(profiles));
    return false;
  }

  const normalizedProfiles = profiles.map((profile) => ensureProfile(profile));
  const privatePayload: PrivateVaultPayload = {
    version: 1,
    savedAt: new Date().toISOString(),
    profiles: normalizedProfiles.map(getPrivateProfileData),
  };
  const encryptedVault = await encryptPrivatePayload(privatePayload, password);
  const publicProfiles = normalizedProfiles.map(stripPrivateProfileData);

  window.localStorage.setItem(PRIVATE_VAULT_KEY, JSON.stringify(encryptedVault));
  window.localStorage.setItem(PUBLIC_PROFILES_KEY, JSON.stringify(publicProfiles));

  return true;
}

export function getPasswordProtectedVaultStatus() {
  try {
    return isPasswordProtectedVault(parseStoredVault());
  } catch {
    return false;
  }
}
