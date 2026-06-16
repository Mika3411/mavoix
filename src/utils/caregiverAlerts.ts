import { generateId } from "../data";
import type { CaregiverAlertLink } from "../types";

const CAREGIVER_ALERT_CHANNEL_KEY = "maVoixCaregiverAlertChannel";
const CAREGIVER_ALERT_LEGACY_PROFILE_KEY =
  "maVoixCaregiverAlertChannelLegacyProfileId";

export function createCaregiverAlertChannel() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `alert-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

function getCaregiverAlertChannelStorageKey(profileId: string) {
  return `${CAREGIVER_ALERT_CHANNEL_KEY}:${profileId || "default"}`;
}

function getLegacyCaregiverAlertChannelForProfile(profileId: string) {
  if (typeof window === "undefined") return "";

  const normalizedProfileId = profileId || "default";
  const profileStorageKey =
    getCaregiverAlertChannelStorageKey(normalizedProfileId);
  const savedChannel = window.localStorage.getItem(profileStorageKey);
  if (savedChannel) return savedChannel;

  const legacyChannel = window.localStorage.getItem(CAREGIVER_ALERT_CHANNEL_KEY);
  const legacyProfileId = window.localStorage.getItem(
    CAREGIVER_ALERT_LEGACY_PROFILE_KEY
  );

  if (legacyChannel && !legacyProfileId) {
    window.localStorage.setItem(profileStorageKey, legacyChannel);
    window.localStorage.setItem(
      CAREGIVER_ALERT_LEGACY_PROFILE_KEY,
      normalizedProfileId
    );
    return legacyChannel;
  }

  return "";
}

export function createCaregiverAlertLink(
  index = 0,
  profileId = ""
): CaregiverAlertLink {
  return {
    id: generateId(),
    name: index === 0 ? "Aidant principal" : `Aidant ${index + 1}`,
    channel:
      index === 0
        ? getLegacyCaregiverAlertChannelForProfile(profileId) ||
          createCaregiverAlertChannel()
        : createCaregiverAlertChannel(),
    enabled: true,
  };
}

export function ensureCaregiverAlertLink(
  link: Partial<CaregiverAlertLink> | undefined,
  index = 0,
  profileId = ""
): CaregiverAlertLink {
  const fallback = createCaregiverAlertLink(index, profileId);

  return {
    id: link?.id || fallback.id,
    name: String(link?.name || fallback.name),
    channel: String(link?.channel || fallback.channel),
    enabled: link?.enabled ?? true,
  };
}

export function ensureCaregiverAlertLinks(
  links: Partial<CaregiverAlertLink>[] | undefined,
  profileId = ""
): CaregiverAlertLink[] {
  if (Array.isArray(links) && links.length > 0) {
    return links.map((link, index) =>
      ensureCaregiverAlertLink(link, index, profileId)
    );
  }

  return [createCaregiverAlertLink(0, profileId)];
}
