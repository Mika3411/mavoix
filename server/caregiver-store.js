const { supabaseRestRequest } = require("./supabase-rest");

const DEFAULT_ALERT_HISTORY_LIMIT = 20;
const DEFAULT_MESSAGE_HISTORY_LIMIT = 80;
const DEFAULT_MESSAGE_RETENTION_MS = Math.max(
  0,
  Number(process.env.MESSAGE_RETENTION_MS || 24 * 60 * 60 * 1000)
);

function getTimestamp(payload) {
  const timestamp = Date.parse(payload?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getMessageTimestamp(payload) {
  const timestamp = Date.parse(payload?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function mergeById(records) {
  const recordsById = new Map();
  for (const record of records) {
    if (record?.id) {
      recordsById.set(record.id, record);
    }
  }
  return Array.from(recordsById.values()).sort(
    (a, b) => getTimestamp(a) - getTimestamp(b)
  );
}

function normalizeStoredAlertRow(row) {
  return {
    id: String(row?.id || ""),
    createdAt: String(row?.created_at || ""),
    profileName: String(row?.profile_name || ""),
    message: String(row?.message || ""),
    lastUnreadMessage: String(row?.last_unread_message || ""),
  };
}

function normalizeStoredMessageRow(row) {
  const messageType = row?.message_type === "audio" ? "audio" : "text";
  const senderRole = row?.sender_role === "caregiver" ? "caregiver" : "user";
  const deliveredTo = Math.max(0, Number(row?.delivered_to || 0) || 0);

  return {
    id: String(row?.id || ""),
    channel: String(row?.channel || ""),
    createdAt: String(row?.created_at || ""),
    senderRole,
    senderName: String(row?.sender_name || ""),
    message: String(row?.message || ""),
    messageType,
    deliveredTo,
    deliveredAt: String(row?.delivered_at || ""),
    readByUserAt: String(row?.read_by_user_at || ""),
    readByCaregiverAt: String(row?.read_by_caregiver_at || ""),
  };
}

function readFieldForRole(role) {
  return role === "caregiver" ? "readByCaregiverAt" : "readByUserAt";
}

function readColumnForRole(role) {
  return role === "caregiver" ? "read_by_caregiver_at" : "read_by_user_at";
}

function senderRoleForRecipient(role) {
  return role === "caregiver" ? "user" : "caregiver";
}

function normalizeMessageIds(messageIds) {
  if (!Array.isArray(messageIds)) return [];

  const seen = new Set();
  const normalized = [];
  for (const value of messageIds) {
    const id = String(value || "").trim();
    if (!id || id.length > 120 || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
    if (normalized.length >= 80) break;
  }

  return normalized;
}

function mergeMessagePayload(existing, payload) {
  if (!existing) return payload;
  const deliveredTo = Math.max(
    Number(existing.deliveredTo || 0) || 0,
    Number(payload.deliveredTo || 0) || 0
  );

  return {
    ...existing,
    ...payload,
    deliveredTo,
    deliveredAt: payload.deliveredAt || existing.deliveredAt || "",
    readByUserAt: payload.readByUserAt || existing.readByUserAt || "",
    readByCaregiverAt:
      payload.readByCaregiverAt || existing.readByCaregiverAt || "",
  };
}

function logSupabaseStoreWarning(action, response) {
  const detail = String(response?.body || response?.error || "").slice(0, 240);
  console.warn(
    `Supabase caregiver store ${action} failed`,
    response?.statusCode || 0,
    detail
  );
}

function createCaregiverStore({
  alertHistoryLimit = DEFAULT_ALERT_HISTORY_LIMIT,
  messageHistoryLimit = DEFAULT_MESSAGE_HISTORY_LIMIT,
  messageRetentionMs = DEFAULT_MESSAGE_RETENTION_MS,
  request = supabaseRestRequest,
} = {}) {
  const alertHistory = new Map();
  const messageHistory = new Map();

  function getAlertHistoryInMemory(roomKey) {
    if (!alertHistory.has(roomKey)) {
      alertHistory.set(roomKey, []);
    }

    return alertHistory.get(roomKey);
  }

  function saveAlertInMemory(roomKey, payload) {
    const history = getAlertHistoryInMemory(roomKey);
    history.push(payload);
    if (history.length > alertHistoryLimit) {
      history.splice(0, history.length - alertHistoryLimit);
    }
  }

  function getMessageHistoryInMemory(roomKey) {
    if (!messageHistory.has(roomKey)) {
      messageHistory.set(roomKey, []);
    }

    const history = messageHistory.get(roomKey);
    pruneMessageHistory(history);
    return history;
  }

  function pruneMessageHistory(history) {
    if (!history) return;

    if (messageRetentionMs > 0) {
      const cutoff = Date.now() - messageRetentionMs;
      for (let index = history.length - 1; index >= 0; index -= 1) {
        if (getMessageTimestamp(history[index]) < cutoff) {
          history.splice(index, 1);
        }
      }
    }

    if (history.length > messageHistoryLimit) {
      history.splice(0, history.length - messageHistoryLimit);
    }
  }

  function saveMessageInMemory(roomKey, payload) {
    const history = getMessageHistoryInMemory(roomKey);
    const index = history.findIndex((item) => item?.id === payload?.id);
    if (index >= 0) {
      history[index] = mergeMessagePayload(history[index], payload);
    } else {
      history.push(payload);
    }
    pruneMessageHistory(history);
  }

  function markMessagesDeliveredInMemory(
    roomKey,
    recipientRole,
    messageIds,
    deliveredAt
  ) {
    const ids = new Set(messageIds);
    const history = getMessageHistoryInMemory(roomKey);

    for (let index = 0; index < history.length; index += 1) {
      const item = history[index];
      if (!item?.id || !ids.has(item.id)) continue;
      if (item.senderRole === recipientRole) continue;

      history[index] = mergeMessagePayload(item, {
        deliveredTo: Math.max(1, Number(item.deliveredTo || 0) || 0),
        deliveredAt: item.deliveredAt || deliveredAt,
      });
    }
  }

  function markMessagesReadInMemory(roomKey, readerRole, messageIds, readAt) {
    const ids = new Set(messageIds);
    const history = getMessageHistoryInMemory(roomKey);
    const readField = readFieldForRole(readerRole);

    for (let index = 0; index < history.length; index += 1) {
      const item = history[index];
      if (!item?.id || !ids.has(item.id)) continue;
      if (item.senderRole === readerRole) continue;

      history[index] = mergeMessagePayload(item, {
        deliveredTo: Math.max(1, Number(item.deliveredTo || 0) || 0),
        deliveredAt: item.deliveredAt || readAt,
        [readField]: item[readField] || readAt,
      });
    }
  }

  async function fetchStoredAlerts(roomKey, afterTimestamp, limit = 10) {
    const afterIso = new Date(afterTimestamp).toISOString();
    const filters = [
      `room_key=eq.${encodeURIComponent(roomKey)}`,
      `created_at=gt.${encodeURIComponent(afterIso)}`,
      "select=id,channel,profile_name,message,last_unread_message,created_at",
      "order=created_at.asc",
      `limit=${Math.max(1, Math.min(50, Number(limit) || 10))}`,
    ];
    const response = await request(
      "GET",
      `caregiver_alerts?${filters.join("&")}`
    );

    if (response.notConfigured) return null;
    if (!response.ok) {
      logSupabaseStoreWarning("alerts select", response);
      return null;
    }

    return Array.isArray(response.data)
      ? response.data.map(normalizeStoredAlertRow).filter((alert) => alert.id)
      : [];
  }

  async function saveStoredAlert(roomKey, channel, payload) {
    const response = await request(
      "POST",
      "caregiver_alerts?on_conflict=id",
      [
        {
          id: payload.id,
          room_key: roomKey,
          channel,
          profile_name: payload.profileName || null,
          message: payload.message || "",
          last_unread_message: payload.lastUnreadMessage || null,
          created_at: payload.createdAt || new Date().toISOString(),
        },
      ],
      { Prefer: "resolution=merge-duplicates,return=minimal" }
    );

    if (response.notConfigured) return false;
    if (!response.ok) {
      logSupabaseStoreWarning("alert upsert", response);
      return false;
    }

    return true;
  }

  async function fetchStoredMessages(roomKey) {
    const baseFilters = [
      `room_key=eq.${encodeURIComponent(roomKey)}`,
      "order=created_at.desc",
      `limit=${messageHistoryLimit}`,
    ];

    if (messageRetentionMs > 0) {
      const cutoffIso = new Date(Date.now() - messageRetentionMs).toISOString();
      baseFilters.splice(1, 0, `created_at=gte.${encodeURIComponent(cutoffIso)}`);
    }

    const filters = [
      ...baseFilters.slice(0, 1),
      "select=id,channel,sender_role,sender_name,message,message_type,delivered_to,delivered_at,read_by_user_at,read_by_caregiver_at,created_at",
      ...baseFilters.slice(1),
    ];
    let response = await request("GET", `caregiver_messages?${filters.join("&")}`);

    if (!response.notConfigured && !response.ok) {
      const legacyFilters = [
        ...baseFilters.slice(0, 1),
        "select=id,channel,sender_role,sender_name,message,message_type,created_at",
        ...baseFilters.slice(1),
      ];
      const legacyResponse = await request(
        "GET",
        `caregiver_messages?${legacyFilters.join("&")}`
      );
      if (legacyResponse.ok || legacyResponse.notConfigured) {
        response = legacyResponse;
      }
    }

    if (response.notConfigured) return null;
    if (!response.ok) {
      logSupabaseStoreWarning("messages select", response);
      return null;
    }

    return Array.isArray(response.data)
      ? response.data
          .map(normalizeStoredMessageRow)
          .filter((message) => message.id)
          .reverse()
      : [];
  }

  async function saveStoredMessage(roomKey, payload) {
    const row = {
      id: payload.id,
      room_key: roomKey,
      channel: payload.channel,
      sender_role: payload.senderRole,
      sender_name: payload.senderName || null,
      message: payload.message || "",
      message_type: payload.messageType || "text",
      delivered_to: Math.max(0, Number(payload.deliveredTo || 0) || 0),
      delivered_at: payload.deliveredAt || null,
      read_by_user_at: payload.readByUserAt || null,
      read_by_caregiver_at: payload.readByCaregiverAt || null,
      created_at: payload.createdAt || new Date().toISOString(),
    };
    let response = await request(
      "POST",
      "caregiver_messages?on_conflict=id",
      [row],
      { Prefer: "resolution=merge-duplicates,return=minimal" }
    );

    if (!response.notConfigured && !response.ok) {
      const {
        delivered_to,
        delivered_at,
        read_by_user_at,
        read_by_caregiver_at,
        ...legacyRow
      } = row;
      const legacyResponse = await request(
        "POST",
        "caregiver_messages?on_conflict=id",
        [legacyRow],
        { Prefer: "resolution=merge-duplicates,return=minimal" }
      );
      if (legacyResponse.ok || legacyResponse.notConfigured) {
        response = legacyResponse;
      }
    }

    if (response.notConfigured) return false;
    if (!response.ok) {
      logSupabaseStoreWarning("message upsert", response);
      return false;
    }

    return true;
  }

  async function patchStoredMessageReceipts(roomKey, recipientRole, messageIds, patch) {
    const ids = normalizeMessageIds(messageIds);
    if (ids.length === 0) return null;

    const senderRole = senderRoleForRecipient(recipientRole);
    const idFilter = ids.map((id) => encodeURIComponent(id)).join(",");
    const filters = [
      `room_key=eq.${encodeURIComponent(roomKey)}`,
      `sender_role=eq.${encodeURIComponent(senderRole)}`,
      `id=in.(${idFilter})`,
    ];

    const response = await request(
      "PATCH",
      `caregiver_messages?${filters.join("&")}`,
      patch,
      { Prefer: "return=representation" }
    );

    if (response.notConfigured) return null;
    if (!response.ok) {
      logSupabaseStoreWarning("message receipt update", response);
      return null;
    }

    return Array.isArray(response.data)
      ? response.data
          .map(normalizeStoredMessageRow)
          .filter((message) => message.id)
      : [];
  }

  async function getCaregiverAlertHistory(roomKey, afterTimestamp, limit = 10) {
    if (!Number.isFinite(afterTimestamp)) return [];

    const storedAlerts = await fetchStoredAlerts(roomKey, afterTimestamp, limit);
    const memoryAlerts = getAlertHistoryInMemory(roomKey).filter(
      (payload) => getTimestamp(payload) > afterTimestamp
    );

    if (storedAlerts) {
      return mergeById([...storedAlerts, ...memoryAlerts]).slice(-limit);
    }

    return memoryAlerts.slice(-limit);
  }

  async function saveCaregiverAlert(roomKey, channel, payload) {
    saveAlertInMemory(roomKey, payload);
    await saveStoredAlert(roomKey, channel, payload);
  }

  async function getCaregiverMessages(roomKey) {
    const storedMessages = await fetchStoredMessages(roomKey);
    const memoryMessages = getMessageHistoryInMemory(roomKey);
    const messages = storedMessages
      ? mergeById([...storedMessages, ...memoryMessages])
      : [...memoryMessages];

    if (messages.length > messageHistoryLimit) {
      return messages.slice(-messageHistoryLimit);
    }

    return messages;
  }

  async function saveCaregiverMessage(roomKey, payload) {
    saveMessageInMemory(roomKey, payload);
    await saveStoredMessage(roomKey, payload);
  }

  async function markCaregiverMessagesDelivered(roomKey, recipientRole, messageIds) {
    const ids = normalizeMessageIds(messageIds);
    const deliveredAt = new Date().toISOString();
    if (ids.length === 0) {
      return { messageIds: [], deliveredAt };
    }

    markMessagesDeliveredInMemory(roomKey, recipientRole, ids, deliveredAt);
    const storedMessages = await patchStoredMessageReceipts(
      roomKey,
      recipientRole,
      ids,
      { delivered_at: deliveredAt }
    );

    if (storedMessages) {
      for (const message of storedMessages) {
        saveMessageInMemory(roomKey, message);
      }
    }

    return { messageIds: ids, deliveredAt };
  }

  async function markCaregiverMessagesRead(roomKey, readerRole, messageIds) {
    const ids = normalizeMessageIds(messageIds);
    const readAt = new Date().toISOString();
    if (ids.length === 0) {
      return { messageIds: [], readAt };
    }

    markMessagesReadInMemory(roomKey, readerRole, ids, readAt);
    const storedMessages = await patchStoredMessageReceipts(
      roomKey,
      readerRole,
      ids,
      {
        delivered_at: readAt,
        [readColumnForRole(readerRole)]: readAt,
      }
    );

    if (storedMessages) {
      for (const message of storedMessages) {
        saveMessageInMemory(roomKey, message);
      }
    }

    return { messageIds: ids, readAt };
  }

  return {
    getCaregiverAlertHistory,
    getCaregiverMessages,
    markCaregiverMessagesDelivered,
    markCaregiverMessagesRead,
    saveCaregiverAlert,
    saveCaregiverMessage,
  };
}

module.exports = {
  ...createCaregiverStore(),
  createCaregiverStore,
  normalizeStoredAlertRow,
  normalizeStoredMessageRow,
};
