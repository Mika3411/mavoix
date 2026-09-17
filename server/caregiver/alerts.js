const { randomUUID } = require("crypto");
const {
  getCaregiverAlertHistory,
  getCaregiverAlertRange,
  saveCaregiverAlert,
} = require("../caregiver-store");
const { sendCaregiverAlertFcmPushes } = require("../caregiver-push");
const { requireCaregiverAccess, sanitizeText } = require("./access");
const { formatLastUnreadCaregiverMessage } = require("./messages");
const { enforceRateLimit } = require("./rateLimit");
const {
  CAREGIVER_ALERT_STREAM_CLIENT_LIMIT,
  broadcastCaregiverAlert,
  broadcastCaregiverAlertToMessageClients,
  closeSseClient,
  createSseClient,
  getCaregiverAlertClients,
  removeCaregiverAlertClient,
  setSseHeaders,
} = require("./sse");

function registerCaregiverAlertRoutes(app) {
  app.post("/api/caregiver-alert/history", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const access = requireCaregiverAccess(req, res, "Le lien aidant est invalide.");
    if (!access) return;
    if (!enforceRateLimit(req, res, "caregiver-history", 120, 60 * 1000, [access.roomKey])) return;
    const { start, end, offset = 0 } = req.body || {};
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (typeof start !== "string" || typeof end !== "string" ||
        !iso.test(start) || !iso.test(end) || !Number.isFinite(Date.parse(start)) ||
        !Number.isFinite(Date.parse(end)) || Date.parse(start) >= Date.parse(end) ||
        !Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({ error: "La période ou la pagination est invalide." });
    }
    try {
      const alerts = await getCaregiverAlertRange(access.roomKey, start, end, offset, req.body?.includeOverlaps === true);
      // An extra empty page also handles servers configured with a lower row limit.
      res.json({ alerts, nextOffset: alerts.length ? offset + alerts.length : null });
    } catch (error) {
      res.status(503).json({ error: error.message });
    }
  });

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

    if (
      getCaregiverAlertClients(access.roomKey).size >=
      CAREGIVER_ALERT_STREAM_CLIENT_LIMIT
    ) {
      res.status(429).json({
        error: "Trop de connexions",
        details: "Trop d'appareils aidants sont connectés à ce lien.",
      });
      return;
    }

    setSseHeaders(res);
    res.write("event: connected\ndata: {}\n\n");

    const client = createSseClient(res);
    getCaregiverAlertClients(access.roomKey).add(client);

    req.on("close", () => {
      closeSseClient(client);
      removeCaregiverAlertClient(access.roomKey, client);
    });
  });

  app.get("/api/caregiver-alert/latest", async (req, res) => {
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
      ? await getCaregiverAlertHistory(access.roomKey, afterTimestamp, 10)
      : [];

    res.json({
      success: true,
      alerts,
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
    const lastUnreadMessage = await formatLastUnreadCaregiverMessage(
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
    await saveCaregiverAlert(access.roomKey, access.channel, payload);
    const alertDeliveredTo = broadcastCaregiverAlert(access.roomKey, payload);
    const messageDeliveredTo = broadcastCaregiverAlertToMessageClients(
      access.roomKey,
      payload
    );
    const fcmPushResult = await sendCaregiverAlertFcmPushes(
      access.roomKey,
      payload
    );
    const deliveredTo = Math.max(
      alertDeliveredTo,
      messageDeliveredTo,
      fcmPushResult.deliveredTo
    );

    res.json({
      success: true,
      deliveredTo,
      alert: { id: payload.id, createdAt: payload.createdAt },
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
}

module.exports = {
  registerCaregiverAlertRoutes,
};
