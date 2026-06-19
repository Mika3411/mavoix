const DEPLOYED_API_BASE = "https://mavoix.onrender.com";

function getDefaultApiBase() {
  if (import.meta.env.DEV || typeof window === "undefined") {
    return DEPLOYED_API_BASE;
  }

  const origin = window.location.origin;
  if (!origin || origin === "null" || !/^https?:\/\//.test(origin)) {
    return DEPLOYED_API_BASE;
  }

  try {
    const hostname = new URL(origin).hostname;
    if (hostname === "mavoix.onrender.com" || hostname.endsWith(".onrender.com")) {
      return origin;
    }
  } catch {}

  return DEPLOYED_API_BASE;
}

const DEFAULT_API_BASE = getDefaultApiBase();
const DEFAULT_ANDROID_APP_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : "/android/";

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE
).replace(/\/+$/, "");

export const ANDROID_APP_URL =
  import.meta.env.VITE_ANDROID_APP_URL || DEFAULT_ANDROID_APP_URL;

export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION || __MA_VOIX_APP_VERSION__ || "0.0.0";

export const UPDATE_MANIFEST_URL =
  import.meta.env.VITE_UPDATE_MANIFEST_URL || `${API_BASE}/ma-voix-update.json`;

export function getCaregiverNetworkErrorMessage(
  error: unknown,
  fallback = "Impossible de joindre le serveur Ma Voix."
) {
  const message = error instanceof Error ? error.message : "";

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return "Serveur Ma Voix inaccessible. Vérifie la connexion internet, puis relance ou redéploie le serveur.";
  }

  return message || fallback;
}
