import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import useAudioRecording from "../features/speech/useAudioRecording";
import useSpeech from "../features/speech/useSpeech";
import CommunicationPage from "../features/communication/CommunicationPage";
import CaregiverMessagesPage from "../features/caregivers/CaregiverMessagesPage";
import VoicePage from "../features/speech/VoicePage";
import ProfileSettingsPage from "../features/profiles/settings/ProfileSettingsPage";
import ProfileInfoPage from "../features/profiles/ProfileInfoPage";
import NoticePage, { type SectionKey } from "../NoticePage";
import DictionaryPage from "../features/dictionary/DictionaryPage";
import {
  AppFooterNavigation,
  AppHeader,
  FloatingCaregiverAlertButton,
} from "./navigation/AppNavigation";
import DesktopUpdateBanner from "../features/updates/DesktopUpdateBanner";
import DownloadPage from "../features/updates/DownloadPage";
import { AVAILABLE_ICONS, generateId, getCategoryBackground } from "../data";
import { createStyles, getActiveTheme } from "../themes";
import useProfiles from "../features/profiles/useProfiles";
import { normalizePhoneForSms } from "../shared/phone";
import {
  type DownloadDevice,
  detectDownloadDevice,
} from "../features/updates/downloadDevice";
import {
  ANDROID_APP_URL,
  APP_VERSION,
  API_BASE,
  UPDATE_MANIFEST_URL,
  getCaregiverNetworkErrorMessage,
} from "../services/config";
import {
  createCaregiverAlertLink,
  ensureCaregiverAlertLinks,
} from "../features/caregivers/caregiverLinks";
import {
  type CaregiverMessage,
  countUnreadCaregiverMessages,
  getCaregiverMessageReadStorageKey,
  getCaregiverMessageStorageKey,
  initializeCaregiverReadState,
  markCaregiverMessagesRead as markCaregiverMessagesReadInStorage,
  mergeCaregiverMessagesIntoStorage,
} from "../features/caregivers/caregiverMessages";
import {
  type AvailableAppUpdate,
  fetchAvailableDesktopUpdate,
  isUpdateSnoozed,
  snoozeUpdate,
} from "../features/updates/appUpdates";
import type { CaregiverAlertLink, Phrase, VoiceEditor } from "../shared/types";

type CaregiverAlertTarget = CaregiverAlertLink & {
  alertLink: string;
  appLink: string;
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

function buildCaregiverMessageStreamUrl(channel: string, accessKey?: string) {
  const url = new URL("/api/caregiver-messages/stream", API_BASE);
  url.searchParams.set("channel", channel);
  appendCaregiverAccessKey(url, accessKey);
  url.searchParams.set("role", "user");
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

function getSafeCssColor(value: unknown, fallback: string) {
  const color = typeof value === "string" ? value.trim() : "";
  if (!color) return fallback;

  return /^[#(),.%\w\s-]+$/.test(color) ? color : fallback;
}

function getInitialViewportWidth() {
  if (typeof window === "undefined") return 1024;
  return window.innerWidth;
}

function getInitialViewportHeight() {
  if (typeof window === "undefined") return 768;
  return window.innerHeight;
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(getInitialViewportWidth);
  const [viewportHeight, setViewportHeight] = useState(getInitialViewportHeight);
  const [isPhraseEditMode, setIsPhraseEditMode] = useState(false);
  const [caregiverAlertSending, setCaregiverAlertSending] = useState(false);
  const [unreadCaregiverMessageCount, setUnreadCaregiverMessageCount] =
    useState(0);
  const [noticeInitialSection, setNoticeInitialSection] =
    useState<SectionKey>("sommaire");
  const [downloadDevice, setDownloadDevice] = useState<DownloadDevice>(() =>
    detectDownloadDevice()
  );
  const [availableUpdate, setAvailableUpdate] =
    useState<AvailableAppUpdate | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(page);

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
    exportCurrentProfile,
    importCurrentProfile,
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
  const isLandscapeMobileLayout =
    viewportWidth > viewportHeight && viewportHeight <= 520 && viewportWidth <= 960;
  const isFooterNavLayout = isCompactLayout || isLandscapeMobileLayout;
  const isNativeApp = Capacitor.isNativePlatform();
  const pageSafeAreaPadding = {
    paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
    paddingRight: "calc(12px + env(safe-area-inset-right, 0px))",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    paddingLeft: "calc(12px + env(safe-area-inset-left, 0px))",
  };
  const canShowDownloadPage = downloadDevice !== "other";
  const updateDownloadUrl =
    availableUpdate?.setupUrl || availableUpdate?.portableUrl || "";
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
  const caregiverMessageChannels = useMemo(
    () =>
      caregiverAlertTargets
        .map((target) => target.channel)
        .filter((channel): channel is string => Boolean(channel)),
    [caregiverAlertTargets]
  );
  const caregiverMessageChannelKey = useMemo(
    () =>
      caregiverAlertTargets
        .map((target) => `${target.channel}:${target.accessKey || ""}`)
        .join("|"),
    [caregiverAlertTargets]
  );
  const caregiverMessageStorageKey = useMemo(
    () =>
      getCaregiverMessageStorageKey(
        currentProfileId || currentProfile?.id || "default"
      ),
    [currentProfileId, currentProfile?.id]
  );
  const caregiverMessageReadStorageKey = useMemo(
    () =>
      getCaregiverMessageReadStorageKey(
        currentProfileId || currentProfile?.id || "default"
      ),
    [currentProfileId, currentProfile?.id]
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
  const refreshCaregiverUnreadCount = useCallback(() => {
    setUnreadCaregiverMessageCount(
      countUnreadCaregiverMessages(
        caregiverMessageStorageKey,
        caregiverMessageReadStorageKey,
        caregiverMessageChannels
      )
    );
  }, [
    caregiverMessageChannels,
    caregiverMessageReadStorageKey,
    caregiverMessageStorageKey,
  ]);
  const markCaregiverMessagesRead = useCallback(
    (channels: string[] = caregiverMessageChannels) => {
      markCaregiverMessagesReadInStorage(
        caregiverMessageStorageKey,
        caregiverMessageReadStorageKey,
        channels
      );
      setUnreadCaregiverMessageCount(
        countUnreadCaregiverMessages(
          caregiverMessageStorageKey,
          caregiverMessageReadStorageKey,
          caregiverMessageChannels
        )
      );
    },
    [
      caregiverMessageChannels,
      caregiverMessageReadStorageKey,
      caregiverMessageStorageKey,
    ]
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

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    initializeCaregiverReadState(
      caregiverMessageStorageKey,
      caregiverMessageReadStorageKey,
      caregiverMessageChannels
    );
    refreshCaregiverUnreadCount();
  }, [
    caregiverMessageChannels,
    caregiverMessageReadStorageKey,
    caregiverMessageStorageKey,
    refreshCaregiverUnreadCount,
  ]);

  useEffect(() => {
    if (page === "aidants") {
      markCaregiverMessagesRead();
    }
  }, [markCaregiverMessagesRead, page]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof EventSource === "undefined" ||
      caregiverMessageChannels.length === 0
    ) {
      setUnreadCaregiverMessageCount(0);
      return;
    }

    const sources = caregiverAlertTargets
      .filter((target) => target.channel)
      .map((target) => {
        const source = new EventSource(
          buildCaregiverMessageStreamUrl(target.channel, target.accessKey)
        );

        const syncUnreadCount = () => {
          if (pageRef.current === "aidants") {
            markCaregiverMessagesRead([target.channel]);
            return;
          }

          refreshCaregiverUnreadCount();
        };

        source.addEventListener("caregiver-message-history", (event) => {
          try {
            const payload = JSON.parse((event as MessageEvent).data || "{}");
            const messages = Array.isArray(payload.messages)
              ? (payload.messages as CaregiverMessage[])
              : [];
            mergeCaregiverMessagesIntoStorage(
              caregiverMessageStorageKey,
              target.channel,
              messages
            );
            syncUnreadCount();
          } catch {}
        });

        source.addEventListener("caregiver-message", (event) => {
          try {
            const payload = JSON.parse((event as MessageEvent).data || "{}");
            mergeCaregiverMessagesIntoStorage(
              caregiverMessageStorageKey,
              target.channel,
              [payload as CaregiverMessage]
            );
            syncUnreadCount();
          } catch {}
        });

        return source;
      });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [
    caregiverAlertTargets,
    caregiverMessageChannelKey,
    caregiverMessageStorageKey,
    markCaregiverMessagesRead,
    refreshCaregiverUnreadCount,
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

    if (Capacitor.isNativePlatform()) {
      return;
    }

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

    const newPhrase: Phrase = {
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

  function updatePhrase(id: string, field: keyof Phrase, value: unknown) {
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

  function deletePhrase(id: string) {
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

  function movePhrase(id: string, direction: "up" | "down") {
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

  function deleteCategory(categoryName: string) {
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

  function regenerateCaregiverAlertLink(linkId: string) {
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
  }

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncViewportSize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    syncViewportSize();

    window.addEventListener("resize", syncViewportSize);
    window.addEventListener("orientationchange", syncViewportSize);

    return () => {
      window.removeEventListener("resize", syncViewportSize);
      window.removeEventListener("orientationchange", syncViewportSize);
    };
  }, []);

  useEffect(() => {
    setIsMoreMenuOpen(false);
    if (page !== "communication") {
      setIsPhraseEditMode(false);
    }
  }, [page]);

  useEffect(() => {
    if (page === "telechargement" && !canShowDownloadPage) {
      setPage("communication");
    }
  }, [canShowDownloadPage, page]);

  useEffect(() => {
    if (!isMoreMenuOpen) return;

    function closeMenusOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        moreMenuRef.current?.contains(target)
      ) {
        return;
      }

      setIsMoreMenuOpen(false);
    }

    function closeMenusOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeMenusOnOutsidePointer, true);
    window.addEventListener("keydown", closeMenusOnEscape);

    return () => {
      window.removeEventListener(
        "pointerdown",
        closeMenusOnOutsidePointer,
        true
      );
      window.removeEventListener("keydown", closeMenusOnEscape);
    };
  }, [isMoreMenuOpen]);

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

  useEffect(() => {
    const styleId = "theme-scrollbar-styles";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const track = getSafeCssColor(activeTheme?.inputBackground, "#0a1020");
    const thumb = getSafeCssColor(activeTheme?.accentColor, "#3b82f6");
    const thumbHover = getSafeCssColor(
      activeTheme?.inputBorder || activeTheme?.accentColor,
      thumb
    );

    styleElement.textContent = `
      :root {
        --ma-voix-scrollbar-track: ${track};
        --ma-voix-scrollbar-thumb: ${thumb};
        --ma-voix-scrollbar-thumb-hover: ${thumbHover};
      }

      * {
        scrollbar-color: var(--ma-voix-scrollbar-thumb) var(--ma-voix-scrollbar-track);
        scrollbar-width: thin;
      }

      *::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }

      *::-webkit-scrollbar-track {
        background: var(--ma-voix-scrollbar-track);
        border-radius: 999px;
      }

      *::-webkit-scrollbar-thumb {
        background: var(--ma-voix-scrollbar-thumb);
        border: 3px solid var(--ma-voix-scrollbar-track);
        border-radius: 999px;
      }

      *::-webkit-scrollbar-thumb:hover {
        background: var(--ma-voix-scrollbar-thumb-hover);
      }

      *::-webkit-scrollbar-corner {
        background: var(--ma-voix-scrollbar-track);
      }
    `;

    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [
    activeTheme?.accentColor,
    activeTheme?.inputBackground,
    activeTheme?.inputBorder,
  ]);

  const navigationProps = {
    styles,
    activeTheme,
    page,
    setPage,
    currentProfile,
    isCompactLayout,
    isLandscapeMobileLayout,
    isFooterNavLayout,
    isNativeApp,
    isMoreMenuOpen,
    setIsMoreMenuOpen,
    moreMenuRef,
    unreadCaregiverMessageCount,
    caregiverAlertSending,
    selectedCaregiverAlertTargetName: selectedCaregiverAlertTarget
      ? selectedCaregiverAlertTarget.name || "aidant"
      : "",
    sendCaregiverAlert,
    markCaregiverMessagesRead,
    openNoticeSection,
  };

  return (
    <div
      style={{
        ...styles.page,
        ...pageSafeAreaPadding,
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
        <AppHeader {...navigationProps} />

        {availableUpdate && (
          <DesktopUpdateBanner
            styles={styles}
            activeTheme={activeTheme}
            isCompactLayout={isCompactLayout}
            availableUpdate={availableUpdate}
            onUpdate={openDesktopUpdateDownload}
            onDismiss={dismissDesktopUpdate}
          />
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
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
              paddingBottom: isFooterNavLayout ? 24 : 140,
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
        ) : page === "telechargement" && canShowDownloadPage ? (
          <DownloadPage
            styles={styles}
            activeTheme={activeTheme}
            downloadDevice={downloadDevice}
          />
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
            onCaregiverMessagesChanged={refreshCaregiverUnreadCount}
            markCaregiverMessagesRead={markCaregiverMessagesRead}
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
            exportCurrentProfile={exportCurrentProfile}
            importCurrentProfile={(event: React.ChangeEvent<HTMLInputElement>) => importCurrentProfile(event, { onAfterImport: () => { setFilter("Toutes"); setCategory("Général"); } })}
            exportAllProfiles={exportAllProfiles}
            importAllProfiles={(event: React.ChangeEvent<HTMLInputElement>) => importAllProfiles(event, { onAfterImport: () => { setFilter("Toutes"); setCategory("Général"); } })}
            fileInputRef={fileInputRef}
            privacyStatus={privacyStatus}
            enablePrivacyPassword={enablePrivacyPassword}
            unlockPrivateData={unlockPrivateData}
            lockPrivateData={lockPrivateData}
            caregiverAlertLinks={caregiverAlertTargets}
            addCaregiverAlertLink={addCaregiverAlertLink}
            updateCaregiverAlertLink={updateCaregiverAlertLink}
            deleteCaregiverAlertLink={deleteCaregiverAlertLink}
            regenerateCaregiverAlertLink={regenerateCaregiverAlertLink}
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

        {isFooterNavLayout && <AppFooterNavigation {...navigationProps} />}
      </div>

      {!isFooterNavLayout && !isNativeApp && (
        <FloatingCaregiverAlertButton
          caregiverAlertSending={caregiverAlertSending}
          selectedCaregiverAlertTargetName={
            selectedCaregiverAlertTarget
              ? selectedCaregiverAlertTarget.name || "aidant"
              : ""
          }
          sendCaregiverAlert={sendCaregiverAlert}
        />
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
