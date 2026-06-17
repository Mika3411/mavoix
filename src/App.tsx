import React, { useEffect, useMemo, useRef, useState } from "react";
import useAudioRecording from "./hooks/useAudioRecording";
import useSpeech from "./hooks/useSpeech";
import CommunicationPage from "./CommunicationPage";
import CaregiverMessagesPage from "./CaregiverMessagesPage";
import VoicePage from "./VoicePage";
import ProfileSettingsPage from "./ProfileSettingsPage";
import ProfileInfoPage from "./ProfileInfoPage";
import InstallButton from "./InstallButton";
import NoticePage, { type SectionKey } from "./NoticePage";
import DictionaryPage from "./DictionaryPage";
import { AVAILABLE_ICONS, generateId, getCategoryBackground } from "./data";
import { createStyles, getActiveTheme } from "./themes";
import useProfiles from "./hooks/useProfiles";
import { normalizePhoneForSms } from "./utils/phone";
import {
  ANDROID_APP_URL,
  API_BASE,
  getCaregiverNetworkErrorMessage,
} from "./services/config";
import {
  createCaregiverAlertLink,
  ensureCaregiverAlertLinks,
} from "./utils/caregiverAlerts";
import type { CaregiverAlertLink, VoiceEditor } from "./types";

type DownloadDevice = "desktop" | "android" | "other";
type CaregiverAlertTarget = CaregiverAlertLink & {
  alertLink: string;
  appLink: string;
};

const APK_DOWNLOAD_URL = "/ma-voix.apk";
const AIDANT_APK_DOWNLOAD_URL = "/ma-voix-aidant.apk";

function buildCaregiverAlertWebLink(channel: string) {
  const url = new URL("/aidant-alerte", API_BASE);
  url.searchParams.set("channel", channel);
  return url.href;
}

function buildCaregiverAlertAppLink(channel: string) {
  const url = new URL("mavoix-aidant://open");
  url.searchParams.set("apiBase", API_BASE);
  url.searchParams.set("channel", channel);
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

function detectDownloadDevice(): DownloadDevice {
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

function getInitialViewportWidth() {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth;
}

function areVoiceEditorsEqual(a: VoiceEditor, b: VoiceEditor) {
  return (
    a.label === b.label &&
    a.text === b.text &&
    a.category === b.category &&
    a.assignedVoice === b.assignedVoice &&
    a.useProfileVoiceSettings === b.useProfileVoiceSettings &&
    a.voiceSettings.rate === b.voiceSettings.rate &&
    a.voiceSettings.pitch === b.voiceSettings.pitch &&
    a.voiceSettings.volume === b.voiceSettings.volume
  );
}

export default function App() {
  const [page, setPage] = useState("communication");
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Général");
  const [filter, setFilter] = useState("Toutes");

  const [selectedSmsContactId, setSelectedSmsContactId] = useState("");


  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💬");

  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [voiceEditor, setVoiceEditor] = useState<VoiceEditor>({
    label: "",
    text: "",
    category: "Général",
    assignedVoice: "default",
    useProfileVoiceSettings: true,
    voiceSettings: {
      rate: 1,
      pitch: 1,
      volume: 1,
    },
  });

  const [toastMessage, setToastMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(getInitialViewportWidth);
  const [isPhraseEditMode, setIsPhraseEditMode] = useState(false);
  const [caregiverAlertSending, setCaregiverAlertSending] = useState(false);
  const [noticeInitialSection, setNoticeInitialSection] =
    useState<SectionKey>("sommaire");
  const [downloadDevice, setDownloadDevice] = useState<DownloadDevice>(() =>
    detectDownloadDevice()
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    profiles,
    currentProfileId,
    setCurrentProfileId,
    currentProfile,
    customCategories,
    savedPhrases,
    audioMap,
    defaultVoice,
    defaultVoiceSettings,
    emergencyContacts,
    privacyStatus,
    enablePrivacyPassword,
    unlockPrivateData,
    lockPrivateData,
    updateCurrentProfile,
    updateCurrentProfileField,
    updateNestedProfileField,
    addTreatment,
    updateTreatment,
    deleteTreatment,
    updateProfilePhoto,
    removeProfilePhoto,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    createNewProfile,
    duplicateCurrentProfile,
    deleteCurrentProfile,
    exportAllProfiles,
    importAllProfiles,
  } = useProfiles();

  const availableSmsContacts = useMemo(
    () =>
      emergencyContacts.filter(
        (contact) => contact.name?.trim() && contact.phone?.trim()
      ),
    [emergencyContacts]
  );

  const activeTheme = getActiveTheme(currentProfile);
  const styles = createStyles(activeTheme);
  const isCompactLayout = viewportWidth <= 640;
  const caregiverAlertTargets = useMemo<CaregiverAlertTarget[]>(
    () =>
      ensureCaregiverAlertLinks(
        currentProfile?.caregiverAlertLinks,
        currentProfileId
      ).map((link) => ({
        ...link,
        alertLink: buildCaregiverAlertWebLink(link.channel),
        appLink:
          downloadDevice === "android"
            ? buildCaregiverAlertAppLink(link.channel)
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

  function selectCaregiverAlertTarget(linkId: string) {
    updateCurrentProfile((profile) => ({
      ...profile,
      selectedCaregiverAlertLinkId: linkId,
    }));
  }

  function openNoticeSection(section: SectionKey = "sommaire") {
    setNoticeInitialSection(section);
    setPage("notice");
    setIsMoreMenuOpen(false);
  }

  const {
    voices,
    voiceStatus,
    isListening,
    testVoice,
    speakText,
    stopSpeaking,
    startDictation,
    stopDictation,
  } = useSpeech({
    language: currentProfile?.language || "fr-FR",
    defaultVoice,
    defaultVoiceSettings,
    savedPhrases,
    audioMap,
    setText,
  });

  const {
    recordingPhraseId,
    startRecording,
    stopRecording,
    deleteRecording,
  } = useAudioRecording({ updateCurrentProfile });


  useEffect(() => {
    if (availableSmsContacts.length === 0) {
      if (selectedSmsContactId) {
        setSelectedSmsContactId("");
      }
      return;
    }

    const selectedExists = availableSmsContacts.some(
      (contact) => contact.id === selectedSmsContactId
    );

    if (!selectedExists) {
      setSelectedSmsContactId(availableSmsContacts[0].id);
    }
  }, [availableSmsContacts, selectedSmsContactId]);

  const categories = useMemo(
    () => customCategories.map((item) => item.name),
    [customCategories]
  );

  useEffect(() => {
    if (!categories.includes(category) && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const categoryOptions = useMemo(
    () => [
      { name: "Toutes", icon: "🗂️" },
      { name: "Favoris", icon: "⭐" },
      ...customCategories,
    ],
    [customCategories]
  );

  const filteredPhrases = useMemo(() => {
    if (filter === "Toutes") return savedPhrases;
    if (filter === "Favoris") {
      return savedPhrases.filter((item) => item.favorite);
    }
    return savedPhrases.filter((item) => item.category === filter);
  }, [savedPhrases, filter]);

  const selectedPhrase = useMemo(
    () => savedPhrases.find((item) => item.id === selectedPhraseId) || null,
    [savedPhrases, selectedPhraseId]
  );

  useEffect(() => {
    if (savedPhrases.length === 0) {
      setSelectedPhraseId(null);
      return;
    }

    const exists = savedPhrases.some((item) => item.id === selectedPhraseId);
    if (!exists) {
      setSelectedPhraseId(savedPhrases[0].id);
    }
  }, [savedPhrases, selectedPhraseId]);


  useEffect(() => {
    if (typeof window === "undefined") return;

    const detectedDevice = detectDownloadDevice();
    setDownloadDevice(detectedDevice);

    if (detectedDevice !== "desktop") {
      const targetUrl = new URL(ANDROID_APP_URL, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isCurrentAndroidTarget =
        targetUrl.origin === currentUrl.origin &&
        targetUrl.pathname.replace(/\/+$/, "") ===
          currentUrl.pathname.replace(/\/+$/, "");

      if (!isCurrentAndroidTarget) {
        window.location.replace(targetUrl.href);
      }
    }
  }, []);

  useEffect(() => {
    const fallbackCategory = categories[0] || "Général";
    let nextVoiceEditor: VoiceEditor;

    if (!selectedPhrase) {
      nextVoiceEditor = {
        label: "",
        text: "",
        category: fallbackCategory,
        assignedVoice: "default",
        useProfileVoiceSettings: true,
        voiceSettings: {
          ...defaultVoiceSettings,
        },
      };
    } else {
      nextVoiceEditor = {
        label: selectedPhrase.label || "",
        text: selectedPhrase.text || "",
        category: selectedPhrase.category || fallbackCategory,
        assignedVoice: selectedPhrase.assignedVoice || "default",
        useProfileVoiceSettings: !selectedPhrase.voiceSettings,
        voiceSettings: {
          rate: selectedPhrase.voiceSettings?.rate ?? defaultVoiceSettings.rate,
          pitch: selectedPhrase.voiceSettings?.pitch ?? defaultVoiceSettings.pitch,
          volume:
            selectedPhrase.voiceSettings?.volume ?? defaultVoiceSettings.volume,
        },
      };
    }

    setVoiceEditor((current) =>
      areVoiceEditorsEqual(current, nextVoiceEditor) ? current : nextVoiceEditor
    );
  }, [selectedPhrase, categories, defaultVoiceSettings.rate, defaultVoiceSettings.pitch, defaultVoiceSettings.volume]);
  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  function savePhrase() {
    if (!text.trim()) return;

    const newPhrase = {
      id: generateId(),
      label: label.trim() || text.trim().slice(0, 30),
      text: text.trim(),
      category,
      assignedVoice: defaultVoice,
      voiceSettings: null,
      favorite: false,
    };

    updateCurrentProfile((profile) => ({
      ...profile,
      phrases: [newPhrase, ...profile.phrases],
    }));

    setText("");
    setLabel("");

    showToast("Phrase enregistrée");
  }

  function getSmsTextToSend() {
    return text.trim();
  }

  function sendTextMessage() {
    const selectedContact = emergencyContacts.find(
      (contact) => contact.id === selectedSmsContactId
    );

    if (!selectedContact?.phone?.trim()) {
      showToast("Ajoute d'abord un contact avec un numéro.");
      return;
    }

    const message = getSmsTextToSend();
    if (!message) {
      showToast("Écris un message avant l'envoi.");
      return;
    }

    const phone = normalizePhoneForSms(selectedContact.phone);
    const encodedMessage = encodeURIComponent(message);
    const smsUrl = `sms:${phone}?body=${encodedMessage}`;
    window.location.href = smsUrl;
  }

  function updatePhrase(id, field, value) {
    updateCurrentProfile((profile) => ({
      ...profile,
      phrases: profile.phrases.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function saveSelectedPhraseVoiceSettings() {
    if (!selectedPhraseId) return;

    updateCurrentProfile((profile) => ({
      ...profile,
      phrases: profile.phrases.map((item) =>
        item.id === selectedPhraseId
          ? {
              ...item,
              label: voiceEditor.label,
              text: voiceEditor.text,
              category: voiceEditor.category,
              assignedVoice: voiceEditor.assignedVoice,
              voiceSettings: voiceEditor.useProfileVoiceSettings
                ? null
                : {
                    rate: Number(voiceEditor.voiceSettings?.rate ?? 1),
                    pitch: Number(voiceEditor.voiceSettings?.pitch ?? 1),
                    volume: Number(voiceEditor.voiceSettings?.volume ?? 1),
                  },
            }
          : item
      ),
    }));
  }

  function deletePhrase(id) {
    const phraseToDelete = savedPhrases.find((item) => item.id === id);
    const phraseLabel = phraseToDelete?.label || phraseToDelete?.text || "cette phrase";

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Supprimer "${phraseLabel}" ?`)
    ) {
      return;
    }

    updateCurrentProfile((profile) => {
      const nextAudioMap = { ...profile.audioMap };
      delete nextAudioMap[id];

      return {
        ...profile,
        phrases: profile.phrases.filter((item) => item.id !== id),
        audioMap: nextAudioMap,
      };
    });
  }

  function movePhrase(id, direction) {
    updateCurrentProfile((profile) => {
      const index = profile.phrases.findIndex((item) => item.id === id);
      if (index === -1) return profile;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= profile.phrases.length) return profile;

      const nextPhrases = [...profile.phrases];
      [nextPhrases[index], nextPhrases[newIndex]] = [
        nextPhrases[newIndex],
        nextPhrases[index],
      ];

      return {
        ...profile,
        phrases: nextPhrases,
      };
    });
  }

  function addCategory() {
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    const exists = currentProfile.categories.some(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (exists) {
      alert("Cette catégorie existe déjà.");
      return;
    }

    updateCurrentProfile((profile) => ({
      ...profile,
      categories: [
        ...profile.categories,
        { name: cleanName, icon: newCategoryIcon },
      ],
    }));

    setCategory(cleanName);
    setNewCategoryName("");
    setNewCategoryIcon("💬");
  }

  function deleteCategory(categoryName) {
    const protectedCategories = ["Général", "Urgence"];
    if (protectedCategories.includes(categoryName)) {
      alert("Cette catégorie de base ne peut pas être supprimée.");
      return;
    }

    updateCurrentProfile((profile) => ({
      ...profile,
      categories: profile.categories.filter(
        (item) => item.name !== categoryName
      ),
      phrases: profile.phrases.map((item) =>
        item.category === categoryName ? { ...item, category: "Général" } : item
      ),
    }));

    if (category === categoryName) setCategory("Général");
    if (filter === categoryName) setFilter("Toutes");
  }
  function updateCaregiverAlertLink(
    linkId: string,
    patch: Partial<Pick<CaregiverAlertLink, "name" | "enabled">>
  ) {
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
  }

  function addCaregiverAlertLink() {
    updateCurrentProfile((profile) => {
      const links = ensureCaregiverAlertLinks(
        profile.caregiverAlertLinks,
        profile.id
      );

      return {
        ...profile,
        caregiverAlertLinks: [
          ...links,
          createCaregiverAlertLink(links.length, profile.id),
        ],
      };
    });
  }

  function deleteCaregiverAlertLink(linkId: string) {
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
  }

  async function copyCaregiverAlertLink(linkId: string) {
    const target = caregiverAlertTargets.find((link) => link.id === linkId);
    if (!target) return;

    try {
      await window.navigator.clipboard.writeText(target.alertLink);
      showToast(`Lien ${target.name || "aidant"} copié`);
    } catch {
      window.prompt("Lien du téléphone aidant", target.alertLink);
    }
  }

  async function sendCaregiverAlert() {
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
  }

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncViewportWidth = () => setViewportWidth(window.innerWidth);
    syncViewportWidth();

    window.addEventListener("resize", syncViewportWidth);
    window.addEventListener("orientationchange", syncViewportWidth);

    return () => {
      window.removeEventListener("resize", syncViewportWidth);
      window.removeEventListener("orientationchange", syncViewportWidth);
    };
  }, []);

  useEffect(() => {
    setIsMoreMenuOpen(false);
    if (page !== "communication") {
      setIsPhraseEditMode(false);
    }
  }, [page, isNavHidden]);

  useEffect(() => {
    const styleId = "global-button-interactions";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      button {
        transition:
          filter 0.14s ease,
          transform 0.08s ease,
          box-shadow 0.14s ease,
          border-color 0.14s ease,
          opacity 0.14s ease !important;
      }

      button:hover:not(:disabled) {
        filter: brightness(1.08) saturate(1.08);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 18px rgba(0, 0, 0, 0.18);
      }

      button:active:not(:disabled) {
        filter: brightness(0.92) saturate(1.18);
        transform: translateY(1px) scale(0.985);
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.06);
      }

      button:disabled {
        cursor: not-allowed;
      }
    `;

    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Impossible de basculer en plein écran :", error);
    }
  }

  return (
    <div
      style={{
        ...styles.page,
        minHeight: "100vh",
        height: "100dvh",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...styles.container,
          width: "100%",
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            ...styles.header,
            gap: isCompactLayout ? 10 : 16,
            alignItems: isCompactLayout ? "flex-start" : "center",
            transform: isNavHidden
              ? isCompactLayout
                ? "translateY(calc(-100% - 4px))"
                : "translateY(calc(-100% + 18px))"
              : "translateY(0)",
            transition: "transform 0.3s ease",
            position: "relative",
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isCompactLayout ? 10 : 16,
              minWidth: 0,
              width: isCompactLayout ? "100%" : undefined,
            }}
          >
            <img
              src="/picturetitle.png"
              alt="Ma Voix"
              style={{
                height: isCompactLayout ? 64 : 80,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />

            <div
              style={{
                fontSize: isCompactLayout ? 20 : 22,
                fontWeight: 600,
                lineHeight: 1.15,
                minWidth: 0,
                wordBreak: "break-word",
              }}
            >
              {currentProfile.name}
              {currentProfile.firstName || currentProfile.lastName
                ? ` ${[currentProfile.firstName, currentProfile.lastName]
                    .filter(Boolean)
                    .join(" ")}`
              : ""}
            </div>
          </div>

          <div
            style={{
              ...styles.topButtons,
              position: "relative",
              gap: isCompactLayout ? 6 : 10,
              flexWrap: "wrap",
              width: isCompactLayout ? "100%" : undefined,
              display: isCompactLayout ? "grid" : "flex",
              gridTemplateColumns: isCompactLayout
                ? "repeat(2, minmax(0, 1fr))"
                : undefined,
            }}
          >
            <button
              style={{
                ...(page === "communication"
                  ? styles.primaryButton
                  : styles.secondaryButton),
                padding: isCompactLayout ? "6px 8px" : "6px 18px",
                fontSize: isCompactLayout ? 13 : 15,
                width: isCompactLayout ? "100%" : undefined,
                minHeight: isCompactLayout ? 42 : undefined,
                borderRadius: isCompactLayout ? 14 : undefined,
                lineHeight: isCompactLayout ? 1.1 : undefined,
              }}
              onClick={() => setPage("communication")}
            >
              Communication
            </button>

            <button
              style={
                {
                  ...(page === "reglages"
                    ? styles.primaryButton
                    : styles.secondaryButton),
                  padding: isCompactLayout ? "6px 8px" : "12px 14px",
                  fontSize: isCompactLayout ? 13 : 15,
                  width: isCompactLayout ? "100%" : undefined,
                  minHeight: isCompactLayout ? 42 : undefined,
                  borderRadius: isCompactLayout ? 14 : undefined,
                  lineHeight: isCompactLayout ? 1.1 : undefined,
                }
              }
              onClick={() => setPage("reglages")}
            >
              Parler
            </button>

            <button
              style={
                {
                  ...(page === "infos"
                    ? styles.primaryButton
                    : styles.secondaryButton),
                  padding: isCompactLayout ? "6px 8px" : "12px 14px",
                  fontSize: isCompactLayout ? 13 : 15,
                  width: isCompactLayout ? "100%" : undefined,
                  minHeight: isCompactLayout ? 42 : undefined,
                  borderRadius: isCompactLayout ? 14 : undefined,
                  lineHeight: isCompactLayout ? 1.1 : undefined,
                }
              }
              onClick={() => setPage("infos")}
            >
              Infos
            </button>

            <div
              style={{
                position: "relative",
                width: isCompactLayout ? "100%" : undefined,
              }}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMoreMenuOpen}
                aria-label="Menu"
                title="Menu"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                style={{
                  ...styles.secondaryButton,
                  padding: isCompactLayout ? "6px 8px" : "6px 18px",
                  fontSize: isCompactLayout ? 13 : 15,
                  width: isCompactLayout ? "100%" : undefined,
                  minHeight: isCompactLayout ? 42 : undefined,
                  borderRadius: isCompactLayout ? 14 : undefined,
                  lineHeight: isCompactLayout ? 1.1 : undefined,
                }}
              >
                ☰
              </button>

              {isMoreMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    minWidth: isCompactLayout ? 0 : 220,
                    width: isCompactLayout
                      ? "min(260px, calc(100vw - 24px))"
                      : undefined,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: 10,
                    borderRadius: 18,
                    background: activeTheme?.cardBackground || "#1e293b",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    zIndex: 50,
                  }}
                >
                  <button
                    style={page === "voix" ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => {
                      setPage("voix");
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    Voix
                  </button>

                  <button
                    style={page === "profil" ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => {
                      setPage("profil");
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    Configurer
                  </button>

                  <button
                    style={page === "aidants" ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => {
                      setPage("aidants");
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    Aidants
                  </button>

                  <button
                    style={page === "dictionnaire" ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => {
                      setPage("dictionnaire");
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    Dictionnaire
                  </button>

                  <button
                    style={page === "telechargement" ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => {
                      setPage("telechargement");
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    Téléchargement
                  </button>

                  <button
                    style={page === "notice" ? styles.primaryButton : styles.secondaryButton}
                    onClick={() => openNoticeSection()}
                  >
                    Notice
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      window.open(
                        "https://paypal.me/anime1120",
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                    style={{
                      padding: "6px 18px",
                      fontSize: "15px",
                      borderRadius: "18px",
                      background: "#22c55e",
                      color: "white",
                      border: "none",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Soutenez-moi ❤️
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsNavHidden((prev) => !prev)}
          aria-label={isNavHidden ? "Afficher la barre de navigation" : "Masquer la barre de navigation"}
          title={isNavHidden ? "Afficher la navigation" : "Masquer la navigation"}
          style={{
            position: isCompactLayout && !isNavHidden ? "relative" : "absolute",
            top: isCompactLayout && !isNavHidden ? "auto" : isNavHidden ? 18 : 108,
            left: isCompactLayout && !isNavHidden ? "auto" : "50%",
            transform:
              isCompactLayout && !isNavHidden ? "none" : "translateX(-50%)",
            alignSelf: isCompactLayout && !isNavHidden ? "center" : undefined,
            margin: isCompactLayout && !isNavHidden ? "-2px auto 8px" : undefined,
            flexShrink: 0,
            zIndex: 30,
            width: 56,
            height: 28,
            borderRadius:
              isCompactLayout && !isNavHidden ? "16px" : "0 0 16px 16px",
            border: "none",
            background: activeTheme?.cardBackground || "#1e293b",
            color: activeTheme?.textColor || "#ffffff",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            opacity: isMoreMenuOpen ? 0 : 1,
            pointerEvents: isMoreMenuOpen ? "none" : "auto",
            transition: "top 0.3s ease, transform 0.2s ease, opacity 0.2s ease",
          }}
        >
          {isNavHidden ? "↓" : "↑"}
        </button>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            marginTop: isNavHidden
              ? isCompactLayout
                ? "-150px"
                : "-90px"
              : "0px",
            transition: "margin-top 0.3s ease",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              minHeight: 0,
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              paddingBottom: isCompactLayout ? 24 : 140,
            }}
          >
        {page === "communication" ? (
          <CommunicationPage
            styles={styles}
            categoryOptions={categoryOptions}
            filter={filter}
            setFilter={setFilter}
            filteredPhrases={filteredPhrases}
            getCategoryBackground={getCategoryBackground}
            speakText={speakText}
            movePhrase={movePhrase}
            updatePhrase={updatePhrase}
            deletePhrase={deletePhrase}
            isEditMode={isPhraseEditMode}
            setIsEditMode={setIsPhraseEditMode}
          />
        ) : page === "voix" ? (
          <VoicePage
            styles={styles}
            defaultVoice={defaultVoice}
            defaultVoiceSettings={defaultVoiceSettings}
            voices={voices}
            voiceStatus={voiceStatus}
            testVoice={testVoice}
            updateCurrentProfileField={updateCurrentProfileField}
            currentProfile={currentProfile}
            savedPhrases={savedPhrases}
            selectedPhraseId={selectedPhraseId}
            setSelectedPhraseId={setSelectedPhraseId}
            selectedPhrase={selectedPhrase}
            voiceEditor={voiceEditor}
            setVoiceEditor={setVoiceEditor}
            categories={categories}
            saveSelectedPhraseVoiceSettings={saveSelectedPhraseVoiceSettings}
            speakText={speakText}
            recordingPhraseId={recordingPhraseId}
            stopRecording={stopRecording}
            startRecording={startRecording}
            audioMap={audioMap}
            deleteRecording={deleteRecording}
          />
        ) : page === "infos" ? (
          <ProfileInfoPage
            styles={styles}
            currentProfile={currentProfile}
            onSpeak={(message) => speakText(message, "default")}
          />
        ) : page === "telechargement" ? (
          <div
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, rgba(37,99,235,0.22), rgba(15,23,42,0.88))",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 28,
                padding: 28,
                boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -10,
                  fontSize: 120,
                  opacity: 0.08,
                  pointerEvents: "none",
                }}
              >
                ⬇️
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.2, opacity: 0.75, textTransform: "uppercase", marginBottom: 10 }}>
                Centre de téléchargement
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, lineHeight: 1.15 }}>
                Installe Ma Voix sur le bon appareil
              </div>
              <div style={{ fontSize: 18, opacity: 0.9, lineHeight: 1.6, maxWidth: 820 }}>
                Choisis la version adaptée à ton appareil. Sur ordinateur, tu peux installer l'application depuis le navigateur. Sur Android, tu peux télécharger l'application pour smartphone ou tablette.
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: downloadDevice === "desktop" ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {downloadDevice === "desktop" ? "✅ Appareil détecté : PC" : "💻 Version PC disponible"}
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: downloadDevice === "android" ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {downloadDevice === "android" ? "✅ Appareil détecté : Android" : "📱 Version Android disponible"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 20,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  background: activeTheme?.cardBackground || "#0f172a",
                  border: downloadDevice === "desktop" ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 28,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  boxShadow: "0 16px 35px rgba(0,0,0,0.18)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: downloadDevice === "desktop" ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {downloadDevice === "desktop" ? "Recommandé ici" : "PC uniquement"}
                </div>

                <div style={{ fontSize: 44, lineHeight: 1 }}>💻</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Version PC</div>
                  <div style={{ fontSize: 17, opacity: 0.88, lineHeight: 1.6 }}>
                    Installe l'application directement depuis le navigateur sur ordinateur. Idéal pour un accès rapide comme une vraie appli.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, opacity: 0.82 }}>
                  <div>• Installation rapide sur Windows, Mac ou Linux</div>
                  <div>• Lance l'application depuis le bureau ou le menu démarrer</div>
                  <div>• Mise à jour simple depuis le site</div>
                </div>

                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                  {downloadDevice === "desktop" ? (
                    <InstallButton styles={styles} />
                  ) : (
                    <button
                      disabled
                      style={{
                        ...styles.secondaryButton,
                        opacity: 0.5,
                        cursor: "not-allowed",
                      }}
                    >
                      Bouton visible sur PC
                    </button>
                  )}
                  <div style={{ fontSize: 13, opacity: 0.65 }}>
                    Le bouton d'installation PWA s'affiche uniquement sur ordinateur.
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: activeTheme?.cardBackground || "#0f172a",
                  border: downloadDevice === "android" ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 28,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  boxShadow: "0 16px 35px rgba(0,0,0,0.18)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    right: 18,
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: downloadDevice === "android" ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {downloadDevice === "android" ? "Recommandé ici" : "Android uniquement"}
                </div>

                <div style={{ fontSize: 44, lineHeight: 1 }}>📱</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Version Android</div>
                  <div style={{ fontSize: 17, opacity: 0.88, lineHeight: 1.6 }}>
                    Télécharge l'application pour installer Ma Voix sur smartphone ou tablette Android.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, opacity: 0.82 }}>
                  <div>• Compatible téléphones et tablettes Android</div>
                  <div>• Installation depuis le fichier téléchargé</div>
                  <div>• À ouvrir directement sur le téléphone ou la tablette</div>
                </div>

                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                  <a
                    href={APK_DOWNLOAD_URL}
                    download
                    style={{
                      ...styles.primaryButton,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      padding: "12px 22px",
                    }}
                  >
                    Télécharger l'application
                  </a>
                  <a
                    href={AIDANT_APK_DOWNLOAD_URL}
                    download
                    style={{
                      ...styles.secondaryButton,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      padding: "10px 18px",
                    }}
                  >
                    Télécharger l'application aidant
                  </a>
                  <div style={{ fontSize: 13, opacity: 0.65 }}>
                    {downloadDevice === "android"
                      ? "Télécharge Ma Voix pour l'utilisateur, ou l'application aidant pour le téléphone aidant."
                      : "Depuis un PC, télécharge les fichiers puis transfère le bon APK sur chaque téléphone Android."}
                  </div>
                </div>
              </div>
            </div>

            {downloadDevice === "other" && (
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 22,
                  padding: 18,
                  fontSize: 16,
                  lineHeight: 1.6,
                  opacity: 0.86,
                }}
              >
                Sur cet appareil, les boutons de téléchargement sont masqués. Ouvre cette page depuis un PC pour l'installation ordinateur, ou depuis un appareil Android pour l'application Android.
              </div>
            )}
          </div>
        ) : page === "notice" ? (
          <NoticePage
            styles={styles}
            initialSection={noticeInitialSection}
          />
        ) : page === "dictionnaire" ? (
          <DictionaryPage styles={styles} />
        ) : page === "aidants" ? (
          <CaregiverMessagesPage
            styles={styles}
            caregiverAlertLinks={caregiverAlertTargets}
            currentProfile={currentProfile}
            currentProfileId={currentProfileId}
            text={text}
            setText={setText}
            isListening={isListening}
            startDictation={startDictation}
            speakText={speakText}
            showToast={showToast}
          />
        ) : (
          <ProfileSettingsPage
            styles={styles}
            page={page}
            currentProfile={currentProfile}
            updateCurrentProfileField={updateCurrentProfileField}
            updateNestedProfileField={updateNestedProfileField}
            updateProfilePhoto={updateProfilePhoto}
            removeProfilePhoto={removeProfilePhoto}
            addTreatment={addTreatment}
            updateTreatment={updateTreatment}
            deleteTreatment={deleteTreatment}
            currentProfileId={currentProfileId}
            setCurrentProfileId={setCurrentProfileId}
            profiles={profiles}
            setFilter={setFilter}
            createNewProfile={() => createNewProfile({ onAfterCreate: () => { setFilter("Toutes"); setCategory("Général"); } })}
            duplicateCurrentProfile={duplicateCurrentProfile}
            deleteCurrentProfile={() => deleteCurrentProfile({ onAfterDelete: () => { setFilter("Toutes"); setCategory("Général"); } })}
            exportAllProfiles={exportAllProfiles}
            importAllProfiles={(event) => importAllProfiles(event, { onAfterImport: () => { setFilter("Toutes"); setCategory("Général"); } })}
            fileInputRef={fileInputRef}
            privacyStatus={privacyStatus}
            enablePrivacyPassword={enablePrivacyPassword}
            unlockPrivateData={unlockPrivateData}
            lockPrivateData={lockPrivateData}
            caregiverAlertLinks={caregiverAlertTargets}
            addCaregiverAlertLink={addCaregiverAlertLink}
            updateCaregiverAlertLink={updateCaregiverAlertLink}
            deleteCaregiverAlertLink={deleteCaregiverAlertLink}
            copyCaregiverAlertLink={copyCaregiverAlertLink}
            selectedCaregiverAlertLinkId={selectedCaregiverAlertTargetId}
            selectCaregiverAlertTarget={selectCaregiverAlertTarget}
            openNoticeSection={openNoticeSection}
            text={text}
            setText={setText}
            isListening={isListening}
            stopDictation={stopDictation}
            startDictation={startDictation}
            speakText={speakText}
            stopSpeaking={stopSpeaking}
            savePhrase={savePhrase}
            label={label}
            setLabel={setLabel}
            category={category}
            setCategory={setCategory}
            categories={categories}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            newCategoryIcon={newCategoryIcon}
            setNewCategoryIcon={setNewCategoryIcon}
            AVAILABLE_ICONS={AVAILABLE_ICONS}
            addCategory={addCategory}
            customCategories={customCategories}
            deleteCategory={deleteCategory}
            emergencyContacts={emergencyContacts}
            addEmergencyContact={addEmergencyContact}
            updateEmergencyContact={updateEmergencyContact}
            deleteEmergencyContact={deleteEmergencyContact}
            selectedSmsContactId={selectedSmsContactId}
            setSelectedSmsContactId={setSelectedSmsContactId}
            onSendSms={sendTextMessage}
          />
        )}
          </div>
        </div>

        {isCompactLayout && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 4px 0",
              borderTop: `1px solid ${activeTheme?.inputBorder || "#334155"}`,
              background: activeTheme?.pageBackground || "#0b1220",
              boxShadow: "0 -14px 28px rgba(2,6,23,0.74)",
              position: "relative",
              zIndex: 40,
            }}
          >
            <button
              onClick={toggleFullscreen}
              style={{
                padding: "12px 16px",
                borderRadius: "18px",
                background: isFullscreen ? "#475569" : "#0f766e",
                color: "white",
                border: "none",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 8px 25px rgba(0,0,0,0.24)",
                minHeight: 48,
              }}
            >
              {isFullscreen ? "Quitter" : "Plein écran"}
            </button>

            <button
              onClick={sendCaregiverAlert}
              disabled={caregiverAlertSending}
              aria-label={
                caregiverAlertSending
                  ? "Envoi de l'appel aidant"
                  : selectedCaregiverAlertTarget
                  ? `Appel aidant : ${
                      selectedCaregiverAlertTarget.name || "aidant"
                    }`
                  : "Appel aidant"
              }
              title={
                caregiverAlertSending
                  ? "Envoi de l'appel aidant"
                  : selectedCaregiverAlertTarget
                  ? `Appel aidant : ${
                      selectedCaregiverAlertTarget.name || "aidant"
                    }`
                  : "Appel aidant"
              }
              style={{
                width: 56,
                height: 56,
                padding: 0,
                borderRadius: "18px",
                background: caregiverAlertSending ? "#92400e" : "#f59e0b",
                color: "#111827",
                border: "none",
                fontSize: "23px",
                fontWeight: 800,
                cursor: caregiverAlertSending ? "wait" : "pointer",
                boxShadow: "0 8px 25px rgba(0,0,0,0.24)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              🔔
            </button>
          </div>
        )}
      </div>

      {!isCompactLayout && (
        <button
          onClick={toggleFullscreen}
          style={{
            position: "fixed",
            left: 20,
            bottom: 20,
            zIndex: 9999,
            padding: "14px 18px",
            borderRadius: "18px",
            background: isFullscreen ? "#475569" : "#0f766e",
            color: "white",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
          }}
        >
          {isFullscreen ? "Quitter" : "Plein écran"}
        </button>
      )}

      {!isCompactLayout && (
        <button
          onClick={sendCaregiverAlert}
          disabled={caregiverAlertSending}
          aria-label={
            caregiverAlertSending
              ? "Envoi de l'appel aidant"
              : selectedCaregiverAlertTarget
              ? `Appel aidant : ${
                  selectedCaregiverAlertTarget.name || "aidant"
                }`
              : "Appel aidant"
          }
          title={
            caregiverAlertSending
              ? "Envoi de l'appel aidant"
              : selectedCaregiverAlertTarget
              ? `Appel aidant : ${
                  selectedCaregiverAlertTarget.name || "aidant"
                }`
              : "Appel aidant"
          }
          style={{
            position: "fixed",
            right: 20,
            bottom: 96,
            zIndex: 9999,
            width: 62,
            height: 62,
            padding: 0,
            borderRadius: "18px",
            background: caregiverAlertSending ? "#92400e" : "#f59e0b",
            color: "#111827",
            border: "none",
            fontSize: "24px",
            fontWeight: 800,
            cursor: caregiverAlertSending ? "wait" : "pointer",
            boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          🔔
        </button>
      )}

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "18px 28px",
            borderRadius: 16,
            fontSize: "1.2rem",
            fontWeight: "bold",
            zIndex: 9999,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

