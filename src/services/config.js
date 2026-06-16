const DEPLOYED_API_BASE = "https://mavoix.onrender.com";
const viteEnv = import.meta.env || {};
const DEFAULT_API_BASE =
  typeof window !== "undefined" &&
  window.location.origin &&
  window.location.origin !== "null" &&
  /^https?:\/\//.test(window.location.origin) &&
  viteEnv.MODE === "production"
    ? window.location.origin
    : DEPLOYED_API_BASE;

export const API_BASE = (
  viteEnv.REACT_APP_API_BASE_URL ||
  viteEnv.VITE_API_BASE_URL ||
  DEFAULT_API_BASE
).replace(/\/+$/, "");

export function getCaregiverNetworkErrorMessage(
  error,
  fallback = "Impossible de joindre le serveur Ma Voix."
) {
  const message = error instanceof Error ? error.message : "";

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return "Serveur Ma Voix inaccessible. Vérifie la connexion internet, puis relance ou redéploie le serveur.";
  }

  return message || fallback;
}
