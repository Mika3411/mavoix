import { useEffect, useState } from "react";
import {
  APP_VERSION,
  UPDATE_MANIFEST_URL,
} from "../../services/config";
import {
  type AvailableAppUpdate,
  fetchAvailableDesktopUpdate,
  isUpdateSnoozed,
  snoozeUpdate,
} from "./appUpdates";
import {
  type DownloadDevice,
  detectDownloadDevice,
} from "./downloadDevice";

type UseDesktopUpdatesOptions = {
  showToast: (message: string) => void;
};

export default function useDesktopUpdates({
  showToast,
}: UseDesktopUpdatesOptions) {
  const [downloadDevice, setDownloadDevice] = useState<DownloadDevice>(() =>
    detectDownloadDevice()
  );
  const [availableUpdate, setAvailableUpdate] =
    useState<AvailableAppUpdate | null>(null);

  const canShowDownloadPage = downloadDevice !== "other";
  const updateDownloadUrl =
    availableUpdate?.setupUrl || availableUpdate?.portableUrl || "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    setDownloadDevice(detectDownloadDevice());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.maVoixDesktopApp?.isDesktopApp !== true) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    let isCancelled = false;

    fetchAvailableDesktopUpdate(
      UPDATE_MANIFEST_URL,
      APP_VERSION,
      controller.signal
    )
      .then((update) => {
        if (isCancelled || !update || isUpdateSnoozed(update.version)) return;
        setAvailableUpdate(update);
      })
      .catch(() => {
        // La mise à jour ne doit jamais empêcher Ma Voix de démarrer.
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  function openDesktopUpdateDownload() {
    if (!availableUpdate || !updateDownloadUrl) return;

    window.open(updateDownloadUrl, "_blank", "noopener,noreferrer");
    showToast("Téléchargement de la mise à jour ouvert");
  }

  function dismissDesktopUpdate() {
    if (!availableUpdate) return;

    snoozeUpdate(availableUpdate.version);
    setAvailableUpdate(null);
    showToast("Rappel masqué pendant 24 h");
  }

  return {
    availableUpdate,
    canShowDownloadPage,
    dismissDesktopUpdate,
    downloadDevice,
    openDesktopUpdateDownload,
  };
}
