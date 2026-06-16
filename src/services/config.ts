const DEPLOYED_API_BASE = "https://mavoix.onrender.com";
const DEFAULT_API_BASE =
  typeof window !== "undefined" &&
  window.location.origin &&
  window.location.origin !== "null" &&
  /^https?:\/\//.test(window.location.origin) &&
  !import.meta.env.DEV
    ? window.location.origin
    : DEPLOYED_API_BASE;
const DEFAULT_ANDROID_APP_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : "/android/";

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE
).replace(/\/+$/, "");

export const ANDROID_APP_URL =
  import.meta.env.VITE_ANDROID_APP_URL || DEFAULT_ANDROID_APP_URL;

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
