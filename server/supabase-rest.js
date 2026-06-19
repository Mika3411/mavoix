const https = require("https");

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function httpsRequestText(urlString, options, body) {
  return new Promise((resolve) => {
    const request = https.request(urlString, options, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        resolve({
          statusCode: Number(response.statusCode || 0),
          body: responseBody,
        });
      });
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", (error) => {
      resolve({
        statusCode: 0,
        body: "",
        error: error.message || "request_error",
      });
    });

    request.end(body);
  });
}

async function supabaseRestRequest(method, pathName, body, extraHeaders = {}) {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, notConfigured: true };
  }

  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    Accept: "application/json",
    ...extraHeaders,
  };
  if (requestBody !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(requestBody);
  }

  const response = await httpsRequestText(
    `${config.url}/rest/v1/${pathName}`,
    { method, headers },
    requestBody
  );

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return { ok: false, ...response };
  }

  if (!response.body) {
    return { ok: true, data: null };
  }

  try {
    return { ok: true, data: JSON.parse(response.body) };
  } catch {
    return { ok: true, data: null };
  }
}

module.exports = {
  getSupabaseConfig,
  httpsRequestText,
  supabaseRestRequest,
};
