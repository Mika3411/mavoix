import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE, getCaregiverNetworkErrorMessage } from "../../services/config";
import type { DownloadDevice } from "../updates/downloadDevice";
import type {
  CaregiverAlertTarget,
  Profile,
} from "../../shared/types";
import {
  createCaregiverAlertLink,
  ensureCaregiverAlertLinks,
} from "./caregiverLinks";

type UpdateCurrentProfile = (updater: (profile: Profile) => Profile) => void;

type UseCaregiverAlertsOptions = {
  currentProfile: Profile;
  currentProfileId: string;
  downloadDevice: DownloadDevice;
  updateCurrentProfile: UpdateCurrentProfile;
  showToast: (message: string) => void;
};

type AddCaregiverAlertLinkOptions = {
  name?: string;
  select?: boolean;
};

function appendCaregiverAccessKey(url: URL, accessKey?: string) {
  if (accessKey) {
    url.searchParams.set("key", accessKey);
  }
}

function buildCaregiverAlertWebLink(channel: string, accessKey?: string) {
  const url = new URL("/aidant-alerte", API_BASE);
  url.searchParams.set("channel", channel);
  appendCaregiverAccessKey(url, accessKey);
  return url.href;
}

function buildCaregiverAlertAppLink(channel: string, accessKey?: string) {
  const url = new URL("mavoix-aidant://open");
  url.searchParams.set("apiBase", API_BASE);
  url.searchParams.set("channel", channel);
  appendCaregiverAccessKey(url, accessKey);
  return url.href;
}

function getCaregiverAlertErrorMessage(
  response: Response,
  data: { details?: string; error?: string }
) {
  if (response.status === 404) {
    return "Serveur d'alerte non déployé sur Render. Redéploie le backend, puis réessaie.";
  }

  return data?.details || data?.error || "Impossible d'envoyer l'alerte.";
}

export default function useCaregiverAlerts({
  currentProfile,
  currentProfileId,
  downloadDevice,
  updateCurrentProfile,
  showToast,
}: UseCaregiverAlertsOptions) {
  const [caregiverAlertSending, setCaregiverAlertSending] = useState(false);

  const caregiverAlertTargets = useMemo<CaregiverAlertTarget[]>(
    () =>
      ensureCaregiverAlertLinks(
        currentProfile?.caregiverAlertLinks,
        currentProfileId
      ).map((link) => ({
        ...link,
        alertLink: buildCaregiverAlertWebLink(link.channel, link.accessKey),
        appLink:
          downloadDevice === "android"
            ? buildCaregiverAlertAppLink(link.channel, link.accessKey)
            : "",
      })),
    [currentProfile?.caregiverAlertLinks, currentProfileId, downloadDevice]
  );

  const enabledCaregiverAlertTargets = useMemo(
    () => caregiverAlertTargets.filter((link) => link.enabled),
    [caregiverAlertTargets]
  );

  const selectedCaregiverAlertTargetId =
    currentProfile?.selectedCaregiverAlertLinkId || "";
  const selectedCaregiverAlertTarget = useMemo(
    () =>
      enabledCaregiverAlertTargets.find(
        (link) => link.id === selectedCaregiverAlertTargetId
      ) ||
      enabledCaregiverAlertTargets[0] ||
      null,
    [enabledCaregiverAlertTargets, selectedCaregiverAlertTargetId]
  );

  useEffect(() => {
    if (enabledCaregiverAlertTargets.length === 0) {
      return;
    }

    const selectedExists = enabledCaregiverAlertTargets.some(
      (link) => link.id === selectedCaregiverAlertTargetId
    );

    if (!selectedExists) {
      updateCurrentProfile((profile) => ({
        ...profile,
        selectedCaregiverAlertLinkId: enabledCaregiverAlertTargets[0].id,
      }));
    }
  }, [
    enabledCaregiverAlertTargets,
    selectedCaregiverAlertTargetId,
    updateCurrentProfile,
  ]);

  const selectCaregiverAlertTarget = useCallback(
    (linkId: string) => {
      updateCurrentProfile((profile) => ({
        ...profile,
        selectedCaregiverAlertLinkId: linkId,
      }));
    },
    [updateCurrentProfile]
  );

  const updateCaregiverAlertLink = useCallback(
    (
      linkId: string,
      patch: Partial<Pick<CaregiverAlertTarget, "name" | "enabled">>
    ) => {
      updateCurrentProfile((profile) => {
        const links = ensureCaregiverAlertLinks(
          profile.caregiverAlertLinks,
          profile.id
        );

        return {
          ...profile,
          caregiverAlertLinks: links.map((link) =>
            link.id === linkId ? { ...link, ...patch } : link
          ),
        };
      });
    },
    [updateCurrentProfile]
  );

  const addCaregiverAlertLink = useCallback(
    (options: AddCaregiverAlertLinkOptions = {}) => {
      const existingLinks = ensureCaregiverAlertLinks(
        currentProfile?.caregiverAlertLinks,
        currentProfileId
      );
      const caregiverName = String(options.name || "").trim();
      const createdLink = {
        ...createCaregiverAlertLink(existingLinks.length, currentProfileId),
        ...(caregiverName ? { name: caregiverName } : {}),
      };

      updateCurrentProfile((profile) => {
        const links = ensureCaregiverAlertLinks(
          profile.caregiverAlertLinks,
          profile.id
        );

        return {
          ...profile,
          caregiverAlertLinks: [...links, createdLink],
          ...(options.select
            ? { selectedCaregiverAlertLinkId: createdLink.id }
            : {}),
        };
      });

      return createdLink.id;
    },
    [currentProfile?.caregiverAlertLinks, currentProfileId, updateCurrentProfile]
  );

  const deleteCaregiverAlertLink = useCallback(
    (linkId: string) => {
      updateCurrentProfile((profile) => {
        const links = ensureCaregiverAlertLinks(
          profile.caregiverAlertLinks,
          profile.id
        );

        if (links.length <= 1) {
          return profile;
        }

        return {
          ...profile,
          caregiverAlertLinks: links.filter((link) => link.id !== linkId),
        };
      });
    },
    [updateCurrentProfile]
  );

  const regenerateCaregiverAlertLink = useCallback(
    (linkId: string) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm(
          "Regénérer ce lien ? L'ancien lien aidant ne recevra plus les nouvelles alertes."
        )
      ) {
        return;
      }

      updateCurrentProfile((profile) => {
        const links = ensureCaregiverAlertLinks(
          profile.caregiverAlertLinks,
          profile.id
        );

        return {
          ...profile,
          caregiverAlertLinks: links.map((link, index) => {
            if (link.id !== linkId) return link;

            const refreshedLink = createCaregiverAlertLink(index, profile.id);
            return {
              ...link,
              channel: refreshedLink.channel,
              accessKey: refreshedLink.accessKey,
            };
          }),
        };
      });
    },
    [updateCurrentProfile]
  );

  const copyCaregiverAlertLink = useCallback(
    async (linkId: string) => {
      const target = caregiverAlertTargets.find((link) => link.id === linkId);
      if (!target) return;

      try {
        await window.navigator.clipboard.writeText(target.alertLink || "");
        showToast(`Lien ${target.name || "aidant"} copié`);
      } catch {
        window.prompt("Lien du téléphone aidant", target.alertLink || "");
      }
    },
    [caregiverAlertTargets, showToast]
  );

  const sendCaregiverAlert = useCallback(async () => {
    if (caregiverAlertSending) return;

    if (enabledCaregiverAlertTargets.length === 0) {
      showToast("Aucun aidant disponible pour Appel aidant");
      return;
    }

    if (!selectedCaregiverAlertTarget) {
      showToast("Choisis l'aidant à prévenir");
      return;
    }

    try {
      setCaregiverAlertSending(true);

      const response = await fetch(`${API_BASE}/api/caregiver-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selectedCaregiverAlertTarget.channel,
          accessKey: selectedCaregiverAlertTarget.accessKey || "",
          profileName: currentProfile?.firstName || currentProfile?.name || "",
          message: "J'ai besoin de mon aidant.",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getCaregiverAlertErrorMessage(response, data));
      }

      const deliveredTo = Number(data?.deliveredTo || 0);
      const caregiverName =
        selectedCaregiverAlertTarget.name || "l'aidant sélectionné";

      if (deliveredTo > 0) {
        showToast(`Alarme envoyée à ${caregiverName}`);
      } else {
        showToast(`${caregiverName} n'est pas connecté`);
      }
    } catch (error) {
      showToast(
        getCaregiverNetworkErrorMessage(
          error,
          "Impossible d'envoyer l'alerte aidant"
        )
      );
    } finally {
      setCaregiverAlertSending(false);
    }
  }, [
    caregiverAlertSending,
    currentProfile?.firstName,
    currentProfile?.name,
    enabledCaregiverAlertTargets.length,
    selectedCaregiverAlertTarget,
    showToast,
  ]);

  return {
    caregiverAlertSending,
    caregiverAlertTargets,
    enabledCaregiverAlertTargets,
    selectedCaregiverAlertTarget,
    selectedCaregiverAlertTargetId,
    addCaregiverAlertLink,
    copyCaregiverAlertLink,
    deleteCaregiverAlertLink,
    regenerateCaregiverAlertLink,
    selectCaregiverAlertTarget,
    sendCaregiverAlert,
    updateCaregiverAlertLink,
  };
}
