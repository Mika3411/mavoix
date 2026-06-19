const { randomUUID } = require("crypto");
const {
  getCaregiverAlertHistory,
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
