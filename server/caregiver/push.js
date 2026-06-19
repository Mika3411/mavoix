const {
  isFcmConfigured,
  removeCaregiverFcmToken,
  saveCaregiverFcmToken,
} = require("../caregiver-push");
const { requireCaregiverAccess } = require("./access");
const { enforceRateLimit } = require("./rateLimit");

function sanitizeFcmToken(value) {
  if (typeof value !== "string") return "";
  const cleanValue = value.trim();
  return /^[A-Za-z0-9:_-]{20,4096}$/.test(cleanValue) ? cleanValue : "";
}

function sanitizePushPlatform(value) {
  return value === "android" ? "android" : "ios";
}

function sanitizeAndroidPackageName(value) {
  if (typeof value !== "string") return "com.mavoix.aidant";
  const cleanValue = value.trim();
  return /^[A-Za-z0-9._]{3,160}$/.test(cleanValue)
    ? cleanValue
    : "com.mavoix.aidant";
}

function requireAndroidPushPlatform(platform, res) {
  if (platform === "android") {
    return true;
  }

  res.status(400).json({
    error: "Plateforme non supportee",
    details: "Ce serveur accepte uniquement les tokens Android FCM.",
  });
  return false;
}

function registerCaregiverPushRoutes(app) {
  app.post("/api/caregiver-device-token", async (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Le lien aidant est incomplet ou invalide."
    );
    if (!access) return;

    const platform = sanitizePushPlatform(req.body?.platform);

    if (
      !enforceRateLimit(req, res, "caregiver-device-token", 20, 60 * 1000, [
        access.roomKey,
        platform,
      ])
    ) {
      return;
    }

    if (!requireAndroidPushPlatform(platform, res)) {
      return;
    }

    const token = sanitizeFcmToken(req.body?.token);
    const packageName = sanitizeAndroidPackageName(req.body?.packageName);

    if (!token) {
      res.status(400).json({
        error: "Parametres invalides",
        details: "Le token Android est invalide.",
      });
      return;
    }

    const tokenCount = await saveCaregiverFcmToken(
      access.roomKey,
      token,
      packageName
    );
    res.json({
      success: true,
      platform,
      pushEnabled: isFcmConfigured(),
      tokenCount,
    });
  });

  app.post("/api/caregiver-device-token/remove", async (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Le lien aidant est incomplet ou invalide."
    );
    if (!access) return;

    const platform = sanitizePushPlatform(req.body?.platform);

    if (
      !enforceRateLimit(
        req,
        res,
        "caregiver-device-token-remove",
        20,
        60 * 1000,
        [access.roomKey, platform]
      )
    ) {
      return;
    }

    if (!requireAndroidPushPlatform(platform, res)) {
      return;
    }

    const token = sanitizeFcmToken(req.body?.token);
    if (!token) {
      res.status(400).json({
        error: "Parametres invalides",
        details: "Le token Android est invalide.",
      });
      return;
    }

    const tokenCount = await removeCaregiverFcmToken(access.roomKey, token);
    res.json({
      success: true,
      platform,
      tokenCount,
    });
  });
}

module.exports = {
  registerCaregiverPushRoutes,
  sanitizeAndroidPackageName,
  sanitizeFcmToken,
  sanitizePushPlatform,
};
