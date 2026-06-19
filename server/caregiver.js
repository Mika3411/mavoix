const { createHash, randomUUID } = require("crypto");
const {
  isFcmConfigured,
  removeCaregiverFcmToken,
  saveCaregiverFcmToken,
  sendCaregiverAlertFcmPushes,
} = require("./caregiver-push");

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

const caregiverAlertClients = new Map();
const caregiverAlertHistory = new Map();
const caregiverMessageClients = new Map();
const caregiverMessageHistory = new Map();
const CAREGIVER_ALERT_HISTORY_LIMIT = 20;
const CAREGIVER_MESSAGE_HISTORY_LIMIT = 80;
const CAREGIVER_ALERT_STREAM_CLIENT_LIMIT = 12;
const CAREGIVER_MESSAGE_STREAM_CLIENT_LIMIT = 24;
const CAREGIVER_MESSAGE_RETENTION_MS = Math.max(
  0,
  Number(process.env.MESSAGE_RETENTION_MS || 24 * 60 * 60 * 1000)
);
const rateLimitBuckets = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastRateLimitCleanupAt = 0;

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

function getClientRateLimitId(req) {
  const forwardedFor = req.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function cleanupRateLimitBuckets(now) {
  if (now - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  lastRateLimitCleanupAt = now;

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.windowStart > bucket.windowMs * 2) {
      rateLimitBuckets.delete(key);
    }
  }
}

function enforceRateLimit(req, res, scope, limit, windowMs, parts = []) {
  const now = Date.now();
  cleanupRateLimitBuckets(now);

  const key = [
    scope,
    getClientRateLimitId(req),
    ...parts.map((part) => String(part || "")),
  ].join("|");
  const bucket =
    rateLimitBuckets.get(key) || {
      count: 0,
      windowStart: now,
      windowMs,
    };

  if (now - bucket.windowStart >= windowMs) {
    bucket.count = 0;
    bucket.windowStart = now;
    bucket.windowMs = windowMs;
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  if (bucket.count <= limit) {
    return true;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.windowStart + windowMs - now) / 1000)
  );
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    error: "Trop de requêtes",
    details: "Trop de tentatives sur ce lien aidant. Réessaie dans un instant.",
  });
  return false;
}

function getCaregiverAlertClients(channel) {
  if (!caregiverAlertClients.has(channel)) {
    caregiverAlertClients.set(channel, new Set());
  }

  return caregiverAlertClients.get(channel);
}

function removeCaregiverAlertClient(channel, client) {
  const clients = caregiverAlertClients.get(channel);
  if (!clients) return;

  clients.delete(client);
  if (clients.size === 0) {
    caregiverAlertClients.delete(channel);
  }
}

function getCaregiverAlertHistory(channel) {
  if (!caregiverAlertHistory.has(channel)) {
    caregiverAlertHistory.set(channel, []);
  }

  return caregiverAlertHistory.get(channel);
}

function saveCaregiverAlert(channel, payload) {
  const history = getCaregiverAlertHistory(channel);
  history.push(payload);
  if (history.length > CAREGIVER_ALERT_HISTORY_LIMIT) {
    history.splice(0, history.length - CAREGIVER_ALERT_HISTORY_LIMIT);
  }
}

function getAlertTimestamp(payload) {
  const timestamp = Date.parse(payload?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function broadcastCaregiverAlert(channel, payload) {
  const clients = caregiverAlertClients.get(channel);
  if (!clients || clients.size === 0) return 0;

  let deliveredTo = 0;
  const message = `event: caregiver-alert\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const client of Array.from(clients)) {
    try {
      client.res.write(message);
      deliveredTo += 1;
    } catch (error) {
      clearInterval(client.keepAlive);
      removeCaregiverAlertClient(channel, client);
    }
  }

  return deliveredTo;
}

function getCaregiverMessageClients(channel) {
  if (!caregiverMessageClients.has(channel)) {
    caregiverMessageClients.set(channel, new Set());
  }

  return caregiverMessageClients.get(channel);
}

function getCaregiverMessageHistory(channel) {
  if (!caregiverMessageHistory.has(channel)) {
    caregiverMessageHistory.set(channel, []);
  }

  const history = caregiverMessageHistory.get(channel);
  pruneCaregiverMessageHistory(history);
  return history;
}

function getMessageTimestamp(payload) {
  const timestamp = Date.parse(payload?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function pruneCaregiverMessageHistory(history) {
  if (!history) return;

  if (CAREGIVER_MESSAGE_RETENTION_MS > 0) {
    const cutoff = Date.now() - CAREGIVER_MESSAGE_RETENTION_MS;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (getMessageTimestamp(history[index]) < cutoff) {
        history.splice(index, 1);
      }
    }
  }

  if (history.length > CAREGIVER_MESSAGE_HISTORY_LIMIT) {
    history.splice(0, history.length - CAREGIVER_MESSAGE_HISTORY_LIMIT);
  }
}

function saveCaregiverMessage(channel, payload) {
  const history = getCaregiverMessageHistory(channel);
  history.push(payload);
  pruneCaregiverMessageHistory(history);
}

function getLatestUserCaregiverMessage(channel) {
  const history = getCaregiverMessageHistory(channel);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (!item || item.senderRole === "caregiver") continue;

    const message =
      item.messageType === "audio"
        ? "Audio recu"
        : sanitizeText(item.message, 220);
    if (!message) continue;

    return {
      id: item.id || "",
      createdAt: item.createdAt || "",
      senderName: sanitizeText(item.senderName, 80),
      messageType: sanitizeMessageType(item.messageType),
      message,
    };
  }

  return null;
}

function formatLastUnreadCaregiverMessage(channel, profileName) {
  const latestMessage = getLatestUserCaregiverMessage(channel);
  if (!latestMessage) return "";

  const name =
    sanitizeText(profileName, 80) ||
    latestMessage.senderName ||
    "Patient";
  return sanitizeText(`${name} - ${latestMessage.message}`, 240);
}

function removeCaregiverMessageClient(channel, client) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients) return;

  clients.delete(client);
  if (clients.size === 0) {
    caregiverMessageClients.delete(channel);
  }
}

function countCaregiverMessageClients(channel, role) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients) return 0;

  return Array.from(clients).filter((client) => client.role === role).length;
}

function writeSseEvent(client, eventName, payload) {
  client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function broadcastCaregiverPresence(channel) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients || clients.size === 0) return;

  const payload = {
    channel: getPublicCaregiverChannel(channel),
    connectedCaregivers: countCaregiverMessageClients(channel, "caregiver"),
  };

  for (const client of Array.from(clients)) {
    if (client.role !== "user") continue;

    try {
      writeSseEvent(client, "caregiver-presence", payload);
    } catch (error) {
      clearInterval(client.keepAlive);
      removeCaregiverMessageClient(channel, client);
    }
  }
}

function broadcastCaregiverAlertToMessageClients(channel, payload) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients || clients.size === 0) return 0;

  let deliveredTo = 0;

  for (const client of Array.from(clients)) {
    if (client.role !== "caregiver") continue;

    try {
      writeSseEvent(client, "caregiver-alert", payload);
      deliveredTo += 1;
    } catch {
      clearInterval(client.keepAlive);
      removeCaregiverMessageClient(channel, client);
    }
  }

  return deliveredTo;
}

function broadcastCaregiverMessage(channel, payload, recipientRole) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients || clients.size === 0) return 0;

  let deliveredTo = 0;

  for (const client of Array.from(clients)) {
    if (recipientRole && client.role !== recipientRole) continue;

    try {
      writeSseEvent(client, "caregiver-message", payload);
      deliveredTo += 1;
    } catch (error) {
      clearInterval(client.keepAlive);
      removeCaregiverMessageClient(channel, client);
    }
  }

  return deliveredTo;
}

function sanitizeMessageRole(value) {
  return value === "caregiver" ? "caregiver" : "user";
}

function sanitizeMessageType(value) {
  return value === "audio" ? "audio" : "text";
}


function registerCaregiverRoutes(app) {
  app.get("/api/caregiver-alert/stream", (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Le lien d'alerte aidant est incomplet ou invalide."
    );
    if (!access) return;

    if (
      !enforceRateLimit(req, res, "caregiver-alert-stream", 30, 60 * 1000, [
        access.roomKey,
      ])
    ) {
      return;
    }

    if (getCaregiverAlertClients(access.roomKey).size >= CAREGIVER_ALERT_STREAM_CLIENT_LIMIT) {
      res.status(429).json({
        error: "Trop de connexions",
        details: "Trop d'appareils aidants sont connectés à ce lien.",
      });
      return;
    }

    res.set({
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();
    res.write("event: connected\ndata: {}\n\n");
  
    const client = {
      id: randomUUID(),
      res,
      keepAlive: setInterval(() => {
        res.write(": keep-alive\n\n");
      }, 25000),
    };

    getCaregiverAlertClients(access.roomKey).add(client);

    req.on("close", () => {
      clearInterval(client.keepAlive);
      removeCaregiverAlertClient(access.roomKey, client);
    });
  });

  app.get("/api/caregiver-alert/latest", (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Le lien d'alerte aidant est incomplet ou invalide."
    );
    if (!access) return;

    if (
      !enforceRateLimit(req, res, "caregiver-alert-latest", 80, 60 * 1000, [
        access.roomKey,
      ])
    ) {
      return;
    }

    const after = typeof req.query?.after === "string" ? req.query.after : "";
    const afterTimestamp = Date.parse(after);
    const alerts = Number.isFinite(afterTimestamp)
      ? getCaregiverAlertHistory(access.roomKey)
          .filter((payload) => getAlertTimestamp(payload) > afterTimestamp)
          .slice(-10)
      : [];
  
    res.json({
      success: true,
      alerts,
    });
  });

  app.get("/api/caregiver-messages/stream", (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Le lien de conversation aidant est incomplet ou invalide."
    );
    if (!access) return;

    const role = sanitizeMessageRole(req.query?.role);

    if (
      !enforceRateLimit(req, res, "caregiver-message-stream", 40, 60 * 1000, [
        access.roomKey,
        role,
      ])
    ) {
      return;
    }

    if (getCaregiverMessageClients(access.roomKey).size >= CAREGIVER_MESSAGE_STREAM_CLIENT_LIMIT) {
      res.status(429).json({
        error: "Trop de connexions",
        details: "Trop d'appareils sont connectés à cette conversation.",
      });
      return;
    }

    res.set({
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();
  
    const client = {
      id: randomUUID(),
      role,
      res,
      keepAlive: setInterval(() => {
        res.write(": keep-alive\n\n");
      }, 25000),
    };

    getCaregiverMessageClients(access.roomKey).add(client);

    writeSseEvent(client, "connected", {
      role,
      connectedCaregivers: countCaregiverMessageClients(access.roomKey, "caregiver"),
    });
    writeSseEvent(client, "caregiver-message-history", {
      messages: getCaregiverMessageHistory(access.roomKey),
    });
    broadcastCaregiverPresence(access.roomKey);

    req.on("close", () => {
      clearInterval(client.keepAlive);
      removeCaregiverMessageClient(access.roomKey, client);
      broadcastCaregiverPresence(access.roomKey);
    });
  });

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

    if (platform !== "android") {
      res.status(400).json({
        error: "Plateforme non supportee",
        details: "Ce serveur accepte uniquement les tokens Android FCM.",
      });
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

    const tokenCount = await saveCaregiverFcmToken(access.roomKey, token, packageName);
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
      !enforceRateLimit(req, res, "caregiver-device-token-remove", 20, 60 * 1000, [
        access.roomKey,
        platform,
      ])
    ) {
      return;
    }

    if (platform !== "android") {
      res.status(400).json({
        error: "Plateforme non supportee",
        details: "Ce serveur accepte uniquement les tokens Android FCM.",
      });
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

  app.post("/api/caregiver-alert", async (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Aucun téléphone aidant n'est associé à cette app."
    );
    if (!access) return;

    if (
      !enforceRateLimit(req, res, "caregiver-alert-post", 12, 60 * 1000, [
        access.roomKey,
      ])
    ) {
      return;
    }

    const profileName = sanitizeText(req.body?.profileName, 80);
    const lastUnreadMessage = formatLastUnreadCaregiverMessage(
      access.roomKey,
      profileName
    );
    const payload = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      profileName,
      message:
        sanitizeText(req.body?.message, 180) ||
        "J'ai besoin de mon aidant.",
      lastUnreadMessage,
    };
    saveCaregiverAlert(access.roomKey, payload);
    const alertDeliveredTo = broadcastCaregiverAlert(access.roomKey, payload);
    const messageDeliveredTo = broadcastCaregiverAlertToMessageClients(
      access.roomKey,
      payload
    );
    const fcmPushResult = await sendCaregiverAlertFcmPushes(access.roomKey, payload);
    const deliveredTo = Math.max(alertDeliveredTo, messageDeliveredTo, fcmPushResult.deliveredTo);
  
    res.json({
      success: true,
      deliveredTo,
      alertDeliveredTo,
      messageDeliveredTo,
      pushDeliveredTo: fcmPushResult.deliveredTo,
      pushTokenCount: fcmPushResult.tokenCount,
      pushConfigured: fcmPushResult.configured,
      fcmPushDeliveredTo: fcmPushResult.deliveredTo,
      fcmPushTokenCount: fcmPushResult.tokenCount,
      fcmPushConfigured: fcmPushResult.configured,
    });
  });

  app.post("/api/caregiver-messages", (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Aucun aidant n'est associé à cette conversation."
    );
    if (!access) return;

    if (
      !enforceRateLimit(req, res, "caregiver-message-post", 40, 60 * 1000, [
        access.roomKey,
      ])
    ) {
      return;
    }

    const messageType = sanitizeMessageType(req.body?.messageType);
    const messageText = sanitizeText(req.body?.message, 600);
  
    if (!messageText) {
      res.status(400).json({
        error: "Message vide",
        details:
          messageType === "audio"
            ? "Écris un message avant d'envoyer l'audio."
            : "Écris un message avant l'envoi.",
      });
      return;
    }
  
    const senderRole = sanitizeMessageRole(req.body?.senderRole);
    const payload = {
      id: randomUUID(),
      channel: access.channel,
      createdAt: new Date().toISOString(),
      senderRole,
      senderName: sanitizeText(req.body?.senderName, 80),
      message: messageText,
      messageType,
    };
    const recipientRole = senderRole === "caregiver" ? "user" : "caregiver";

    saveCaregiverMessage(access.roomKey, payload);
    const deliveredTo = broadcastCaregiverMessage(
      access.roomKey,
      payload,
      recipientRole
    );
  
    res.json({
      success: true,
      deliveredTo,
      connectedCaregivers: countCaregiverMessageClients(access.roomKey, "caregiver"),
      message: payload,
    });
  });
  

}

module.exports = {
  registerCaregiverRoutes,
};
