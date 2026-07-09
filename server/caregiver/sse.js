const { randomUUID } = require("crypto");
const { getPublicCaregiverChannel } = require("./access");

const caregiverAlertClients = new Map();
const caregiverMessageClients = new Map();
const CAREGIVER_ALERT_STREAM_CLIENT_LIMIT = 12;
const CAREGIVER_MESSAGE_STREAM_CLIENT_LIMIT = 24;

function setSseHeaders(res) {
  res.set({
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
}

function createSseClient(res, fields = {}) {
  return {
    id: randomUUID(),
    res,
    keepAlive: setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 25000),
    ...fields,
  };
}

function closeSseClient(client) {
  clearInterval(client.keepAlive);
}

function writeSseEvent(client, eventName, payload) {
  client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
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
      closeSseClient(client);
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
      closeSseClient(client);
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
      closeSseClient(client);
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
      closeSseClient(client);
      removeCaregiverMessageClient(channel, client);
    }
  }

  return deliveredTo;
}

function broadcastCaregiverMessageReceipt(channel, payload) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients || clients.size === 0) return 0;

  let deliveredTo = 0;

  for (const client of Array.from(clients)) {
    try {
      writeSseEvent(client, "caregiver-message-receipt", payload);
      deliveredTo += 1;
    } catch (error) {
      closeSseClient(client);
      removeCaregiverMessageClient(channel, client);
    }
  }

  return deliveredTo;
}

module.exports = {
  CAREGIVER_ALERT_STREAM_CLIENT_LIMIT,
  CAREGIVER_MESSAGE_STREAM_CLIENT_LIMIT,
  broadcastCaregiverAlert,
  broadcastCaregiverAlertToMessageClients,
  broadcastCaregiverMessage,
  broadcastCaregiverMessageReceipt,
  broadcastCaregiverPresence,
  closeSseClient,
  countCaregiverMessageClients,
  createSseClient,
  getCaregiverAlertClients,
  getCaregiverMessageClients,
  removeCaregiverAlertClient,
  removeCaregiverMessageClient,
  setSseHeaders,
  writeSseEvent,
};
