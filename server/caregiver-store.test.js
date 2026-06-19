import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createCaregiverStore } = require("./caregiver-store");

function createAlert(id, createdAt) {
  return {
    id,
    createdAt,
    profileName: "Alice",
    message: "Besoin aide",
    lastUnreadMessage: "",
  };
}

function createMessage(id, createdAt, overrides = {}) {
  return {
    id,
    channel: "public-channel",
    createdAt,
    senderRole: "user",
    senderName: "Alice",
    message: "Bonjour",
    messageType: "text",
    ...overrides,
  };
}

describe("caregiver persistent store", () => {
  it("falls back to in-memory alert history when Supabase is not configured", async () => {
    const store = createCaregiverStore({
      alertHistoryLimit: 2,
      request: async () => ({ ok: false, notConfigured: true }),
    });

    await store.saveCaregiverAlert(
      "room-a",
      "public-channel",
      createAlert("old", "2026-01-01T09:00:00.000Z")
    );
    await store.saveCaregiverAlert(
      "room-a",
      "public-channel",
      createAlert("new", "2026-01-01T10:00:00.000Z")
    );

    const alerts = await store.getCaregiverAlertHistory(
      "room-a",
      Date.parse("2026-01-01T08:00:00.000Z"),
      10
    );

    expect(alerts.map((alert) => alert.id)).toEqual(["old", "new"]);
  });

  it("persists alerts through Supabase REST", async () => {
    const calls = [];
    const store = createCaregiverStore({
      request: async (method, pathName, body, headers) => {
        calls.push({ method, pathName, body, headers });
        return { ok: true, data: null };
      },
    });

    await store.saveCaregiverAlert(
      "room-a",
      "public-channel",
      createAlert("alert-1", "2026-01-01T09:00:00.000Z")
    );

    expect(calls[0]).toMatchObject({
      method: "POST",
      pathName: "caregiver_alerts?on_conflict=id",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    });
    expect(calls[0].body[0]).toMatchObject({
      id: "alert-1",
      room_key: "room-a",
      channel: "public-channel",
      profile_name: "Alice",
    });
  });

  it("reads persisted messages and merges them with memory records", async () => {
    const store = createCaregiverStore({
      messageRetentionMs: 0,
      request: async (method, pathName) => {
        if (method === "GET" && pathName.startsWith("caregiver_messages?")) {
          return {
            ok: true,
            data: [
              {
                id: "stored-2",
                channel: "public-channel",
                sender_role: "caregiver",
                sender_name: "Aidant",
                message: "Stocké 2",
                message_type: "text",
                created_at: "2026-01-01T11:00:00.000Z",
              },
              {
                id: "stored-1",
                channel: "public-channel",
                sender_role: "user",
                sender_name: "Alice",
                message: "Stocké 1",
                message_type: "text",
                created_at: "2026-01-01T09:00:00.000Z",
              },
            ],
          };
        }

        return { ok: true, data: null };
      },
    });

    await store.saveCaregiverMessage(
      "room-a",
      createMessage("memory-1", "2026-01-01T10:00:00.000Z")
    );

    const messages = await store.getCaregiverMessages("room-a");

    expect(messages.map((message) => message.id)).toEqual([
      "stored-1",
      "memory-1",
      "stored-2",
    ]);
  });

  it("limits message history after merging stored and memory records", async () => {
    const store = createCaregiverStore({
      messageHistoryLimit: 2,
      messageRetentionMs: 0,
      request: async () => ({
        ok: true,
        data: [
          {
            id: "stored",
            channel: "public-channel",
            sender_role: "user",
            sender_name: "Alice",
            message: "Stocké",
            message_type: "text",
            created_at: "2026-01-01T09:00:00.000Z",
          },
        ],
      }),
    });

    await store.saveCaregiverMessage(
      "room-a",
      createMessage("memory-1", "2026-01-01T10:00:00.000Z")
    );
    await store.saveCaregiverMessage(
      "room-a",
      createMessage("memory-2", "2026-01-01T11:00:00.000Z")
    );

    const messages = await store.getCaregiverMessages("room-a");

    expect(messages.map((message) => message.id)).toEqual(["memory-1", "memory-2"]);
  });
});
