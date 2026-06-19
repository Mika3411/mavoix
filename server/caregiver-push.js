const { createPrivateKey, sign } = require("crypto");
const { httpsRequestText, supabaseRestRequest } = require("./supabase-rest");

const caregiverFcmTokens = new Map();
const FCM_TOKEN_TTL_MS = 50 * 60 * 1000;
let cachedFcmAccessToken = null;
let cachedFcmAccessTokenExpiresAt = 0;

function sanitizeText(value, maxLength = 140) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeAndroidPackageName(value) {
  if (typeof value !== "string") return "com.mavoix.aidant";
  const cleanValue = value.trim();
  return /^[A-Za-z0-9._]{3,160}$/.test(cleanValue)
    ? cleanValue
    : "com.mavoix.aidant";
}

function getPublicCaregiverChannel(channelOrRoomKey) {
  return String(channelOrRoomKey || "").split(":")[0];
}

function getCaregiverFcmTokens(channel) {
  if (!caregiverFcmTokens.has(channel)) {
    caregiverFcmTokens.set(channel, new Map());
  }

  return caregiverFcmTokens.get(channel);
}

function saveCaregiverFcmTokenInMemory(channel, token, packageName) {
  const tokens = getCaregiverFcmTokens(channel);
  tokens.set(token, {
    token,
    packageName,
    updatedAt: new Date().toISOString(),
  });
  return tokens.size;
}

function removeCaregiverFcmTokenInMemory(channel, token) {
  const tokens = caregiverFcmTokens.get(channel);
  if (!tokens) return;

  tokens.delete(token);
  if (tokens.size === 0) {
    caregiverFcmTokens.delete(channel);
  }
}

function getCaregiverFcmTokensInMemory(channel) {
  return Array.from((caregiverFcmTokens.get(channel) || new Map()).values());
}

function caregiverPushTokenQuery(channel, platform, token) {
  const filters = [
    `channel=eq.${encodeURIComponent(channel)}`,
    `platform=eq.${encodeURIComponent(platform)}`,
  ];
  if (token) {
    filters.push(`token=eq.${encodeURIComponent(token)}`);
  }
  return filters.join("&");
}

function mergeCaregiverTokenRecords(memoryRecords, storedRecords) {
  const recordsByToken = new Map();
  for (const record of memoryRecords) {
    if (record?.token) {
      recordsByToken.set(record.token, record);
    }
  }
  for (const record of storedRecords || []) {
    if (record?.token) {
      recordsByToken.set(record.token, record);
    }
  }
  return Array.from(recordsByToken.values());
}

function normalizeCaregiverFcmTokenRow(row) {
  return {
    token: String(row?.token || ""),
    packageName: sanitizeAndroidPackageName(row?.package_name),
    updatedAt: String(row?.updated_at || new Date().toISOString()),
  };
}

function logSupabaseTokenWarning(action, response) {
  const detail = String(response?.body || response?.error || "").slice(0, 240);
  console.warn(
    `Supabase caregiver tokens ${action} failed`,
    response?.statusCode || 0,
    detail
  );
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getFcmServiceAccount() {
  const base64Value = String(process.env.FCM_SERVICE_ACCOUNT_BASE64 || "").trim();
  const rawValue = base64Value
    ? Buffer.from(base64Value, "base64").toString("utf8")
    : String(process.env.FCM_SERVICE_ACCOUNT_JSON || "").trim();

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function getFcmProjectId() {
  const serviceAccount = getFcmServiceAccount();
  return String(process.env.FCM_PROJECT_ID || serviceAccount?.project_id || "").trim();
}

function getFcmPrivateKey(serviceAccount) {
  return String(serviceAccount?.private_key || "")
    .replace(/\\n/g, "\n")
    .trim();
}

function isFcmConfigured() {
  const serviceAccount = getFcmServiceAccount();
  return Boolean(
    getFcmProjectId() &&
      serviceAccount?.client_email &&
      getFcmPrivateKey(serviceAccount)
  );
}

async function fetchStoredCaregiverPushTokens(channel, platform) {
  const response = await supabaseRestRequest(
    "GET",
    `caregiver_push_tokens?${caregiverPushTokenQuery(
      channel,
      platform
    )}&select=token,package_name,environment,bundle_id,updated_at`
  );

  if (response.notConfigured) return null;
  if (!response.ok) {
    logSupabaseTokenWarning("select", response);
    return null;
  }

  return Array.isArray(response.data) ? response.data : [];
}

async function upsertStoredCaregiverPushToken(row) {
  const response = await supabaseRestRequest(
    "POST",
    "caregiver_push_tokens?on_conflict=channel,platform,token",
    [
      {
        channel: row.channel,
        platform: row.platform,
        token: row.token,
        package_name: row.packageName || null,
        environment: row.environment || null,
        bundle_id: row.bundleId || null,
        updated_at: new Date().toISOString(),
      },
    ],
    { Prefer: "resolution=merge-duplicates,return=minimal" }
  );

  if (response.notConfigured) return false;
  if (!response.ok) {
    logSupabaseTokenWarning("upsert", response);
    return false;
  }

  return true;
}

async function deleteStoredCaregiverPushToken(channel, platform, token) {
  const response = await supabaseRestRequest(
    "DELETE",
    `caregiver_push_tokens?${caregiverPushTokenQuery(channel, platform, token)}`,
    undefined,
    { Prefer: "return=minimal" }
  );

  if (response.notConfigured) return false;
  if (!response.ok) {
    logSupabaseTokenWarning("delete", response);
    return false;
  }

  return true;
}

async function getCaregiverFcmTokenRecords(channel) {
  const storedRows = await fetchStoredCaregiverPushTokens(channel, "android");
  const storedRecords = storedRows
    ? storedRows.map(normalizeCaregiverFcmTokenRow).filter((record) => record.token)
    : null;
  return mergeCaregiverTokenRecords(
    getCaregiverFcmTokensInMemory(channel),
    storedRecords || []
  );
}

async function saveCaregiverFcmToken(channel, token, packageName) {
  saveCaregiverFcmTokenInMemory(channel, token, packageName);
  await upsertStoredCaregiverPushToken({
    channel,
    platform: "android",
    token,
    packageName,
  });
  return (await getCaregiverFcmTokenRecords(channel)).length;
}

async function removeCaregiverFcmToken(channel, token) {
  removeCaregiverFcmTokenInMemory(channel, token);
  await deleteStoredCaregiverPushToken(channel, "android", token);
  return (await getCaregiverFcmTokenRecords(channel)).length;
}

async function createFcmAccessToken() {
  const now = Date.now();
  if (cachedFcmAccessToken && now < cachedFcmAccessTokenExpiresAt - 60000) {
    return cachedFcmAccessToken;
  }

  const serviceAccount = getFcmServiceAccount();
  if (!serviceAccount) {
    throw new Error("FCM_SERVICE_ACCOUNT_JSON manquant.");
  }

  const privateKeyText = getFcmPrivateKey(serviceAccount);
  if (!serviceAccount.client_email || !privateKeyText) {
    throw new Error("Compte de service FCM incomplet.");
  }

  const issuedAt = Math.floor(now / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claims)
  )}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    createPrivateKey(privateKeyText)
  );
  const assertion = `${signingInput}.${base64Url(signature)}`;
  const formBody =
    "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" +
    encodeURIComponent(assertion);

  const response = await httpsRequestText(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(formBody),
      },
    },
    formBody
  );

  let payload = {};
  try {
    payload = JSON.parse(response.body || "{}");
  } catch {}

  if (response.statusCode !== 200 || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "OAuth FCM impossible.");
  }

  cachedFcmAccessToken = payload.access_token;
  cachedFcmAccessTokenExpiresAt =
    now + Math.min(Number(payload.expires_in || 0) * 1000 || FCM_TOKEN_TTL_MS, FCM_TOKEN_TTL_MS);
  return cachedFcmAccessToken;
}

function buildCaregiverAlertFcmPayload(record, channel, payload) {
  const profileName = sanitizeText(payload?.profileName, 80);
  const lastUnreadMessage = sanitizeText(payload?.lastUnreadMessage, 240);
  const data = {
    type: "caregiver-alert",
    channel: getPublicCaregiverChannel(channel),
    alertId: payload?.id || "",
    profileName,
    message:
      sanitizeText(payload?.message, 180) ||
      "J'ai besoin de mon aidant.",
  };
  if (lastUnreadMessage) {
    data.lastUnreadMessage = lastUnreadMessage;
  }

  return {
    message: {
      token: record.token,
      data,
      android: {
        priority: "HIGH",
        ttl: "3600s",
      },
    },
  };
}

function getFcmErrorReason(responseBody) {
  try {
    const payload = JSON.parse(responseBody || "{}");
    const error = payload.error || {};
    const details = Array.isArray(error.details) ? error.details : [];
    const fcmError = details.find((detail) => detail.errorCode);
    return fcmError?.errorCode || error.status || error.message || "fcm_error";
  } catch {
    return "fcm_error";
  }
}

async function sendFcmNotification(record, channel, payload) {
  if (!isFcmConfigured()) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const projectId = getFcmProjectId();
    const accessToken = await createFcmAccessToken();
    const body = JSON.stringify(buildCaregiverAlertFcmPayload(record, channel, payload));
    const response = await httpsRequestText(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      body
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { sent: true };
    }

    return {
      sent: false,
      statusCode: response.statusCode,
      reason: getFcmErrorReason(response.body),
    };
  } catch (error) {
    return { sent: false, reason: error.message || "send_error" };
  }
}

function shouldRemoveFcmToken(result) {
  return (
    result.statusCode === 404 ||
    result.reason === "UNREGISTERED" ||
    result.reason === "INVALID_ARGUMENT" ||
    result.reason === "SENDER_ID_MISMATCH"
  );
}

async function sendCaregiverAlertFcmPushes(channel, payload) {
  const records = await getCaregiverFcmTokenRecords(channel);
  if (records.length === 0) {
    return { deliveredTo: 0, tokenCount: 0, configured: isFcmConfigured() };
  }

  const results = await Promise.all(
    records.map(async (record) => {
      const result = await sendFcmNotification(record, channel, payload);
      if (shouldRemoveFcmToken(result)) {
        await removeCaregiverFcmToken(channel, record.token);
      }
      return result;
    })
  );

  return {
    deliveredTo: results.filter((result) => result.sent).length,
    tokenCount: records.length,
    configured: isFcmConfigured(),
  };
}

module.exports = {
  isFcmConfigured,
  removeCaregiverFcmToken,
  saveCaregiverFcmToken,
  sendCaregiverAlertFcmPushes,
};
