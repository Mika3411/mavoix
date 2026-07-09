const { randomUUID } = require("crypto");
const {
  getCaregiverMessages,
  markCaregiverMessagesDelivered,
  markCaregiverMessagesRead,
  saveCaregiverMessage,
} = require("../caregiver-store");
const { requireCaregiverAccess, sanitizeText } = require("./access");
const { enforceRateLimit } = require("./rateLimit");
const {
  CAREGIVER_MESSAGE_STREAM_CLIENT_LIMIT,
  broadcastCaregiverMessage,
  broadcastCaregiverMessageReceipt,
  broadcastCaregiverPresence,
  closeSseClient,
  countCaregiverMessageClients,
  createSseClient,
  getCaregiverMessageClients,
  removeCaregiverMessageClient,
  setSseHeaders,
  writeSseEvent,
} = require("./sse");

function sanitizeMessageRole(value) {
  return value === "caregiver" ? "caregiver" : "user";
}

function sanitizeMessageType(value) {
  return value === "audio" ? "audio" : "text";
}

function sanitizeMessageIds(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const ids = [];
  for (const item of value) {
    const id = sanitizeText(item, 120);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= 80) break;
  }
  return ids;
}

async function getLatestUserCaregiverMessage(channel) {
  const history = await getCaregiverMessages(channel);
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

async function formatLastUnreadCaregiverMessage(channel, profileName) {
  const latestMessage = await getLatestUserCaregiverMessage(channel);
  if (!latestMessage) return "";

  const name =
    sanitizeText(profileName, 80) || latestMessage.senderName || "Patient";
  return sanitizeText(`${name} - ${latestMessage.message}`, 240);
}

function registerCaregiverMessageRoutes(app) {
  app.get("/api/caregiver-messages/stream", async (req, res) => {
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

    if (
      getCaregiverMessageClients(access.roomKey).size >=
      CAREGIVER_MESSAGE_STREAM_CLIENT_LIMIT
    ) {
      res.status(429).json({
        error: "Trop de connexions",
        details: "Trop d'appareils sont connectés à cette conversation.",
      });
      return;
    }

    setSseHeaders(res);

    const client = createSseClient(res, { role });
    getCaregiverMessageClients(access.roomKey).add(client);

    writeSseEvent(client, "connected", {
      role,
      connectedCaregivers: countCaregiverMessageClients(
        access.roomKey,
        "caregiver"
      ),
    });
    writeSseEvent(client, "caregiver-message-history", {
      messages: await getCaregiverMessages(access.roomKey),
    });
    broadcastCaregiverPresence(access.roomKey);

    req.on("close", () => {
      closeSseClient(client);
      removeCaregiverMessageClient(access.roomKey, client);
      broadcastCaregiverPresence(access.roomKey);
    });
  });

  app.post("/api/caregiver-messages", async (req, res) => {
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

    const deliveredTo = broadcastCaregiverMessage(
      access.roomKey,
      payload,
      recipientRole
    );
    payload.deliveredTo = deliveredTo;
    payload.deliveredAt = deliveredTo > 0 ? new Date().toISOString() : "";

    await saveCaregiverMessage(access.roomKey, payload);

    res.json({
      success: true,
      deliveredTo,
      connectedCaregivers: countCaregiverMessageClients(
        access.roomKey,
        "caregiver"
      ),
      message: payload,
    });
  });

  app.post("/api/caregiver-messages/delivered", async (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Aucune conversation aidant n'est associee a cet accuse de reception."
    );
    if (!access) return;

    const recipientRole = sanitizeMessageRole(
      req.body?.recipientRole || req.body?.readerRole || req.body?.role
    );

    if (
      !enforceRateLimit(req, res, "caregiver-message-delivered", 80, 60 * 1000, [
        access.roomKey,
        recipientRole,
      ])
    ) {
      return;
    }

    const messageIds = sanitizeMessageIds(req.body?.messageIds);
    if (messageIds.length === 0) {
      res.status(400).json({
        error: "Message introuvable",
        details: "Aucun message a marquer comme recu.",
      });
      return;
    }

    const receipt = await markCaregiverMessagesDelivered(
      access.roomKey,
      recipientRole,
      messageIds
    );
    const payload = {
      channel: access.channel,
      recipientRole,
      messageIds: receipt.messageIds,
      deliveredAt: receipt.deliveredAt,
    };
    broadcastCaregiverMessageReceipt(access.roomKey, payload);

    res.json({
      success: true,
      ...payload,
    });
  });

  app.post("/api/caregiver-messages/read", async (req, res) => {
    const access = requireCaregiverAccess(
      req,
      res,
      "Aucune conversation aidant n'est associee a cet accuse de lecture."
    );
    if (!access) return;

    const readerRole = sanitizeMessageRole(
      req.body?.readerRole || req.body?.recipientRole || req.body?.role
    );

    if (
      !enforceRateLimit(req, res, "caregiver-message-read", 80, 60 * 1000, [
        access.roomKey,
        readerRole,
      ])
    ) {
      return;
    }

    const messageIds = sanitizeMessageIds(req.body?.messageIds);
    if (messageIds.length === 0) {
      res.status(400).json({
        error: "Message introuvable",
        details: "Aucun message a marquer comme lu.",
      });
      return;
    }

    const receipt = await markCaregiverMessagesRead(
      access.roomKey,
      readerRole,
      messageIds
    );
    const payload = {
      channel: access.channel,
      readerRole,
      recipientRole: readerRole,
      messageIds: receipt.messageIds,
      readAt: receipt.readAt,
      deliveredAt: receipt.readAt,
    };
    broadcastCaregiverMessageReceipt(access.roomKey, payload);

    res.json({
      success: true,
      ...payload,
    });
  });
}

module.exports = {
  formatLastUnreadCaregiverMessage,
  getLatestUserCaregiverMessage,
  registerCaregiverMessageRoutes,
  sanitizeMessageIds,
  sanitizeMessageRole,
  sanitizeMessageType,
};
