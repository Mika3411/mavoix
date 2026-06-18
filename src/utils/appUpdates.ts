export type UpdateManifest = {
  version?: unknown;
  message?: unknown;
  windowsSetupUrl?: unknown;
  windowsPortableUrl?: unknown;
  downloadUrl?: unknown;
  releaseNotesUrl?: unknown;
  important?: unknown;
};

export type AvailableAppUpdate = {
  version: string;
  message: string;
  setupUrl: string;
  portableUrl: string;
  releaseNotesUrl: string;
  important: boolean;
};

const UPDATE_SNOOZE_STORAGE_PREFIX = "maVoixUpdateSnoozeUntil:";
export const UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveUrl(value: unknown, baseUrl: string) {
  const rawUrl = cleanString(value);
  if (!rawUrl) return "";

  try {
    return new URL(rawUrl, baseUrl).href;
  } catch {
    return "";
  }
}

function getVersionParts(version: string) {
  return version
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => {
      const match = part.match(/\d+/);
      return match ? Number(match[0]) : 0;
    });
}

export function compareVersions(currentVersion: string, latestVersion: string) {
  const currentParts = getVersionParts(currentVersion);
  const latestParts = getVersionParts(latestVersion);
  const length = Math.max(currentParts.length, latestParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const latestPart = latestParts[index] || 0;

    if (latestPart > currentPart) return 1;
    if (latestPart < currentPart) return -1;
  }

  return 0;
}

export function getUpdateSnoozeStorageKey(version: string) {
  return `${UPDATE_SNOOZE_STORAGE_PREFIX}${version}`;
}

export function isUpdateSnoozed(version: string) {
  if (typeof window === "undefined") return false;

  let rawValue = "";
  try {
    rawValue =
      window.localStorage.getItem(getUpdateSnoozeStorageKey(version)) || "";
  } catch {
    return false;
  }

  const snoozeUntil = Number(rawValue || 0);

  return Number.isFinite(snoozeUntil) && snoozeUntil > Date.now();
}

export function snoozeUpdate(version: string, durationMs = UPDATE_SNOOZE_MS) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getUpdateSnoozeStorageKey(version),
      String(Date.now() + durationMs)
    );
  } catch {
    // Le bouton "Plus tard" doit rester non bloquant.
  }
}

export function parseAvailableDesktopUpdate(
  manifest: UpdateManifest,
  manifestUrl: string,
  currentVersion: string
): AvailableAppUpdate | null {
  const version = cleanString(manifest.version);
  if (!version || compareVersions(currentVersion, version) <= 0) {
    return null;
  }

  const setupUrl =
    resolveUrl(manifest.windowsSetupUrl, manifestUrl) ||
    resolveUrl(manifest.downloadUrl, manifestUrl);
  const portableUrl = resolveUrl(manifest.windowsPortableUrl, manifestUrl);

  if (!setupUrl && !portableUrl) {
    return null;
  }

  return {
    version,
    setupUrl,
    portableUrl,
    releaseNotesUrl: resolveUrl(manifest.releaseNotesUrl, manifestUrl),
    important: manifest.important === true,
    message:
      cleanString(manifest.message) ||
      "Une nouvelle version de Ma Voix est disponible.",
  };
}

export async function fetchAvailableDesktopUpdate(
  manifestUrl: string,
  currentVersion: string,
  signal?: AbortSignal
) {
  const response = await fetch(manifestUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Update manifest HTTP ${response.status}`);
  }

  const manifest = (await response.json()) as UpdateManifest;
  return parseAvailableDesktopUpdate(manifest, manifestUrl, currentVersion);
}
