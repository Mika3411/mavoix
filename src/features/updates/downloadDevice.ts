export type DownloadDevice = "desktop" | "android" | "other";

export function detectDownloadDevice(): DownloadDevice {
  if (typeof window === "undefined") return "desktop";

  const ua = window.navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIpadOSDesktopUa =
    /Macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1;
  const isMobileOrTablet =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    isIpadOSDesktopUa;

  if (isAndroid) return "android";
  if (!isMobileOrTablet) return "desktop";
  return "other";
}
