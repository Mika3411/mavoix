const { createHash } = require("crypto");

function sanitizeText(value, maxLength = 140) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeAlertChannel(value) {
  if (typeof value !== "string") return "";
  const cleanValue = value.trim();
  return /^[a-zA-Z0-9_-]{12,80}$/.test(cleanValue) ? cleanValue : "";
}

function sanitizeCaregiverAccessKey(value) {
  if (typeof value !== "string") return "";
  const cleanValue = value.trim();
  return /^[a-zA-Z0-9_-]{22,160}$/.test(cleanValue) ? cleanValue : "";
}

function getRawCaregiverAccessKey(req) {
  return (
    req.query?.key ??
    req.query?.accessKey ??
    req.body?.accessKey ??
    req.body?.key ??
    req.get("x-caregiver-key") ??
    ""
  );
}

function buildCaregiverRoomKey(channel, accessKey) {
  if (!accessKey) return channel;

  const digest = createHash("sha256")
    .update(`${channel}.${accessKey}`)
    .digest("base64url");
  return `${channel}:key:${digest}`;
}

function getPublicCaregiverChannel(channelOrRoomKey) {
  return String(channelOrRoomKey || "").split(":")[0];
}

function parseCaregiverAccess(req) {
  const channel = sanitizeAlertChannel(req.query?.channel || req.body?.channel);
  const rawAccessKey = getRawCaregiverAccessKey(req);
  const hasRawAccessKey =
    typeof rawAccessKey === "string" && rawAccessKey.trim().length > 0;
  const accessKey = sanitizeCaregiverAccessKey(rawAccessKey);

  return {
    channel,
    accessKey,
    invalidAccessKey: hasRawAccessKey && !accessKey,
    roomKey: buildCaregiverRoomKey(channel, accessKey),
  };
}

function requireCaregiverAccess(req, res, details) {
  const access = parseCaregiverAccess(req);

  if (!access.channel) {
    res.status(400).json({
      error: "Canal invalide",
      details,
    });
    return null;
  }

  if (access.invalidAccessKey) {
    res.status(400).json({
      error: "Clé aidant invalide",
      details: "Le lien aidant contient une clé invalide.",
    });
    return null;
  }

  return access;
}

module.exports = {
  buildCaregiverRoomKey,
  getPublicCaregiverChannel,
  parseCaregiverAccess,
  requireCaregiverAccess,
  sanitizeAlertChannel,
  sanitizeCaregiverAccessKey,
  sanitizeText,
};
