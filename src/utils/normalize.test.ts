import { describe, expect, it } from "vitest";

import { ensurePinProtection, ensureProfile } from "./normalize";

describe("profile normalization", () => {
  it("normalizes legacy emergency contact and default medical fields", () => {
    const profile = ensureProfile({
      id: "profile-1",
      name: "Alice",
      emergencyContact: "Maman",
    });

    expect(profile.name).toBe("Alice");
    expect(profile.emergencyContacts?.[0]).toMatchObject({
      name: "Maman",
      usage: "contact",
    });
    expect(profile.medicalInfo).toMatchObject({
      bloodType: "",
      allergies: "",
      medicalHistory: "",
      condition: "",
      treatments: [],
    });
  });

  it("sanitizes pin protection to a four-digit value", () => {
    expect(
      ensurePinProtection({
        enabled: true,
        pin: "12a3-456",
      })
    ).toEqual({
      enabled: true,
      pin: "1234",
    });
  });

  it("adds secure caregiver links when a profile has none", () => {
    const profile = ensureProfile({
      id: "profile-without-caregiver",
      name: "Profil",
      caregiverAlertLinks: [],
    });

    expect(profile.caregiverAlertLinks).toHaveLength(1);
    expect(profile.caregiverAlertLinks?.[0].accessKey).toMatch(
      /^[a-zA-Z0-9_-]{22,160}$/
    );
  });
});
