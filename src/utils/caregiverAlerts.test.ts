import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCaregiverAccessKey,
  createCaregiverAlertLink,
  ensureCaregiverAlertLink,
  ensureCaregiverAlertLinks,
} from "./caregiverAlerts";

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

describe("caregiver alert links", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates access keys compatible with backend validation", () => {
    const key = createCaregiverAccessKey();

    expect(key).toMatch(/^[a-zA-Z0-9_-]{22,160}$/);
  });

  it("keeps valid keys and replaces invalid keys during normalization", () => {
    const validKey = "abcdefghijklmnopqrstuvwxyz";
    const withValidKey = ensureCaregiverAlertLink(
      {
        id: "link-1",
        name: "Aidant",
        channel: "channel-1",
        accessKey: validKey,
        enabled: false,
      },
      0,
      "profile-1"
    );
    const withInvalidKey = ensureCaregiverAlertLink(
      {
        id: "link-2",
        name: "Aidant",
        channel: "",
        accessKey: "bad",
        enabled: true,
      },
      1,
      "profile-1"
    );

    expect(withValidKey.accessKey).toBe(validKey);
    expect(withValidKey.enabled).toBe(false);
    expect(withInvalidKey.accessKey).toMatch(/^[a-zA-Z0-9_-]{22,160}$/);
  });

  it("migrates the legacy caregiver channel only for the first profile link", () => {
    const localStorage = createMemoryLocalStorage();
    localStorage.setItem("maVoixCaregiverAlertChannel", "legacy-channel");
    vi.stubGlobal("window", { localStorage } as Window);

    const link = createCaregiverAlertLink(0, "profile-a");

    expect(link.channel).toBe("legacy-channel");
    expect(localStorage.getItem("maVoixCaregiverAlertChannel:profile-a")).toBe(
      "legacy-channel"
    );
    expect(localStorage.getItem("maVoixCaregiverAlertChannelLegacyProfileId")).toBe(
      "profile-a"
    );
  });

  it("creates a default enabled caregiver link when none exists", () => {
    const links = ensureCaregiverAlertLinks(undefined, "profile-a");

    expect(links).toHaveLength(1);
    expect(links[0].enabled).toBe(true);
    expect(links[0].accessKey).toMatch(/^[a-zA-Z0-9_-]{22,160}$/);
  });
});
