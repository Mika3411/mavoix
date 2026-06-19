import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type CaregiverMessage,
  countUnreadCaregiverMessages,
  markCaregiverMessagesRead,
  mergeCaregiverMessages,
  mergeCaregiverMessagesIntoStorage,
  readCaregiverMessages,
} from "./caregiverMessages";

function message(
  id: string,
  createdAt: string,
  overrides: Partial<CaregiverMessage> = {}
): CaregiverMessage {
  return {
    id,
    channel: "channel-a",
    createdAt,
    senderRole: "caregiver",
    senderName: "Aidant",
    message: "Bonjour",
    messageType: "text",
    ...overrides,
  };
}

function createMemoryLocalStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  } as Storage;
}

describe("caregiver messages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges messages by id, filters empty text messages, and sorts by date", () => {
    const result = mergeCaregiverMessages(
      [
        message("old", "2026-01-01T09:00:00.000Z"),
        message("replace", "2026-01-01T10:00:00.000Z", {
          message: "Ancien",
        }),
      ],
      [
        message("empty", "2026-01-01T12:00:00.000Z", { message: "" }),
        message("audio", "2026-01-01T11:00:00.000Z", {
          message: "",
          messageType: "audio",
        }),
        message("replace", "2026-01-01T13:00:00.000Z", {
          message: "Remplacé",
        }),
      ]
    );

    expect(result.map((item) => item.id)).toEqual(["old", "audio", "replace"]);
    expect(result[result.length - 1]?.message).toBe("Remplacé");
  });

  it("keeps only the latest 80 messages", () => {
    const messages = Array.from({ length: 90 }, (_item, index) =>
      message(`message-${index}`, new Date(index * 1000).toISOString())
    );

    const result = mergeCaregiverMessages([], messages);

    expect(result).toHaveLength(80);
    expect(result[0].id).toBe("message-10");
    expect(result[79].id).toBe("message-89");
  });

  it("stores, reads, marks, and counts unread caregiver messages", () => {
    const localStorage = createMemoryLocalStorage();
    vi.stubGlobal("window", { localStorage } as Window);

    const messageKey = "messages";
    const readKey = "read";
    mergeCaregiverMessagesIntoStorage(messageKey, "channel-a", [
      message("caregiver-old", "2026-01-01T09:00:00.000Z"),
      message("user-new", "2026-01-01T10:00:00.000Z", {
        senderRole: "user",
      }),
      message("caregiver-new", "2026-01-01T11:00:00.000Z"),
    ]);

    expect(readCaregiverMessages(messageKey)["channel-a"]).toHaveLength(3);
    expect(countUnreadCaregiverMessages(messageKey, readKey, ["channel-a"])).toBe(2);

    markCaregiverMessagesRead(messageKey, readKey, ["channel-a"]);

    expect(countUnreadCaregiverMessages(messageKey, readKey, ["channel-a"])).toBe(0);
  });
});
