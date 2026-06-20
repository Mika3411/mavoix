import { createServer } from "node:http";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const express = require("express");
const { registerCaregiverRoutes } = require("./caregiver/routes");

let counter = 0;

function uniqueChannel() {
  counter += 1;
  return `testchannel${Date.now().toString(36)}${counter}`;
}

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "32kb" }));
  registerCaregiverRoutes(app);
  return app;
}

async function withTestServer(app, callback) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function readJson(response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

describe("caregiver Express routes", () => {
  afterEach(() => {
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    delete process.env.FCM_SERVICE_ACCOUNT_BASE64;
    delete process.env.FCM_PROJECT_ID;
  });

  it("rejects invalid caregiver channels on public alert endpoints", async () => {
    await withTestServer(createApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/caregiver-alert/latest?channel=no`);
      const result = await readJson(response);

      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({
        error: "Canal invalide",
      });
    });
  });

  it("stores messages through the route and normalizes the response payload", async () => {
    await withTestServer(createApp(), async (baseUrl) => {
      const channel = uniqueChannel();
      const accessKey = "caregiverAccessKey123456";
      const response = await fetch(`${baseUrl}/api/caregiver-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          accessKey,
          senderRole: "caregiver",
          senderName: "  Aidant  ",
          message: "  Bonjour   Alice  ",
          messageType: "text",
        }),
      });
      const result = await readJson(response);

      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        success: true,
        deliveredTo: 0,
        connectedCaregivers: 0,
      });
      expect(result.body.message).toMatchObject({
        channel,
        senderRole: "caregiver",
        senderName: "Aidant",
        message: "Bonjour Alice",
        messageType: "text",
      });
    });
  });

  it("keeps alert history isolated by caregiver access key", async () => {
    await withTestServer(createApp(), async (baseUrl) => {
      const channel = uniqueChannel();
      const accessKey = "caregiverAccessKey123456";
      const otherAccessKey = "caregiverAccessKey654321";

      const alertResponse = await fetch(`${baseUrl}/api/caregiver-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          accessKey,
          profileName: "Alice",
          message: "Aide-moi",
        }),
      });
      expect(alertResponse.status).toBe(200);

      const ownHistory = await readJson(
        await fetch(
          `${baseUrl}/api/caregiver-alert/latest?channel=${channel}&key=${accessKey}&after=1970-01-01T00:00:00.000Z`
        )
      );
      const otherHistory = await readJson(
        await fetch(
          `${baseUrl}/api/caregiver-alert/latest?channel=${channel}&key=${otherAccessKey}&after=1970-01-01T00:00:00.000Z`
        )
      );

      expect(ownHistory.status).toBe(200);
      expect(ownHistory.body.alerts).toHaveLength(1);
      expect(ownHistory.body.alerts[0]).toMatchObject({
        profileName: "Alice",
        message: "Aide-moi",
      });
      expect(otherHistory.status).toBe(200);
      expect(otherHistory.body.alerts).toEqual([]);
    });
  });
});
