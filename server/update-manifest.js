const packageJson = require("../package.json");

function sanitizeText(value, maxLength = 140) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeVersion(value) {
  const version = sanitizeText(value, 40);
  return /^[0-9A-Za-z.+-]{1,40}$/.test(version) ? version : "";
}

function sanitizeHttpUrl(value) {
  const rawUrl = sanitizeText(value, 2048);
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function getEnvBoolean(value) {
  return /^(1|true|yes|oui)$/i.test(String(value || "").trim());
}

function getDesktopUpdateManifest() {
  const version =
    sanitizeVersion(process.env.UPDATE_LATEST_VERSION) ||
    sanitizeVersion(packageJson.version) ||
    "0.0.0";
  const message =
    sanitizeText(process.env.UPDATE_MESSAGE, 220) ||
    "Une nouvelle version de Ma Voix est disponible.";

  return {
    version,
    message,
    windowsSetupUrl: sanitizeHttpUrl(process.env.UPDATE_WINDOWS_SETUP_URL),
    windowsPortableUrl: sanitizeHttpUrl(process.env.UPDATE_WINDOWS_PORTABLE_URL),
    releaseNotesUrl: sanitizeHttpUrl(process.env.UPDATE_RELEASE_NOTES_URL),
    important: getEnvBoolean(process.env.UPDATE_IMPORTANT),
  };
}

module.exports = {
  getDesktopUpdateManifest,
};
