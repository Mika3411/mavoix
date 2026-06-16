import React, { useEffect, useMemo, useRef, useState } from "react";
import useAudioRecording from "./hooks/useAudioRecording";
import useSpeech from "./hooks/useSpeech";
import CommunicationPage from "./CommunicationPage";
import CaregiverMessagesPage from "./CaregiverMessagesPage";
import VoicePage from "./VoicePage";
import ProfileSettingsPage from "./ProfileSettingsPage";
import ProfileInfoPage from "./ProfileInfoPage";
import NoticePage, { type SectionKey } from "./NoticePage";
import DictionaryPage from "./DictionaryPage";
import { AVAILABLE_ICONS, generateId, getCategoryBackground } from "./data";
import { createStyles, getActiveTheme } from "./themes";
import useProfiles from "./hooks/useProfiles";
import { normalizePhoneForSms } from "./utils/phone";
import { API_BASE, getCaregiverNetworkErrorMessage } from "./services/config";
import {
  createCaregiverAlertLink,
  ensureCaregiverAlertLinks,
} from "./utils/caregiverAlerts";
import type { CaregiverAlertLink, VoiceEditor } from "./types";

type CaregiverAlertTarget = CaregiverAlertLink & {
  alertLink: string;
  appLink: string;
};

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

export default function App() {
  const [mainSection, setMainSection] = useState<"communication" | "profil">("communication");
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
    voiceSettings: { rate: 1, pitch: 1, volume: 1 },
  });
  const [toastMessage, setToastMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const [openMainDropdown, setOpenMainDropdown] = useState<null | "communication" | "profil">(null);
  const [caregiverAlertSending, setCaregiverAlertSending] = useState(false);
  const [noticeInitialSection, setNoticeInitialSection] =
    useState<SectionKey>("sommaire");
  const [pinInput, setPinInput] = useState("");
  const [isProfileUnlocked, setIsProfileUnlocked] = useState(false);
  const [pinError, setPinError] = useState("");
  const [lockProfileSelectionId, setLockProfileSelectionId] = useState("");
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
  const caregiverAlertTargets = useMemo<CaregiverAlertTarget[]>(
    () =>
      ensureCaregiverAlertLinks(
        currentProfile?.caregiverAlertLinks,
        currentProfileId
      ).map((link) => ({
        ...link,
        alertLink: buildCaregiverAlertWebLink(link.channel),
        appLink: buildCaregiverAlertAppLink(link.channel),
      })),
    [currentProfile?.caregiverAlertLinks, currentProfileId]
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
    setIsSecondaryMenuOpen(false);
    setOpenMainDropdown(null);
  }

  const pinProtection = (currentProfile as any)?.pinProtection || { enabled: false, pin: "" };
  const isPinProtectionEnabled =
    Boolean(pinProtection?.enabled) && String(pinProtection?.pin || "").length === 4;

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

  const categoryOptions = [
    { name: "Toutes", icon: "🗂️" },
    { name: "Favoris", icon: "⭐" },
    ...customCategories,
  ];

  const filteredPhrases = useMemo(() => {
    if (filter === "Toutes") return savedPhrases;
    if (filter === "Favoris") return savedPhrases.filter((item) => item.favorite);
    return savedPhrases.filter((item) => item.category === filter);
  }, [savedPhrases, filter]);

  const selectedPhrase =
    savedPhrases.find((item) => item.id === selectedPhraseId) || null;

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
    if (!selectedPhrase) {
      setVoiceEditor({
        label: "",
        text: "",
        category: categories[0] || "Général",
        assignedVoice: "default",
        useProfileVoiceSettings: true,
        voiceSettings: { ...defaultVoiceSettings },
      });
      return;
    }

    setVoiceEditor({
      label: selectedPhrase.label || "",
      text: selectedPhrase.text || "",
      category: selectedPhrase.category || categories[0] || "Général",
      assignedVoice: selectedPhrase.assignedVoice || "default",
      useProfileVoiceSettings: !selectedPhrase.voiceSettings,
      voiceSettings: {
        rate: selectedPhrase.voiceSettings?.rate ?? defaultVoiceSettings.rate,
        pitch: selectedPhrase.voiceSettings?.pitch ?? defaultVoiceSettings.pitch,
        volume: selectedPhrase.voiceSettings?.volume ?? defaultVoiceSettings.volume,
      },
    });
  }, [
    selectedPhrase,
    categories,
    defaultVoiceSettings.rate,
    defaultVoiceSettings.pitch,
    defaultVoiceSettings.volume,
  ]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3000);
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

  function updatePhrase(id: string, field: string, value: any) {
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
      return { ...profile, phrases: nextPhrases };
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
      categories: [...profile.categories, { name: cleanName, icon: newCategoryIcon }],
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
      categories: profile.categories.filter((item) => item.name !== categoryName),
      phrases: profile.phrases.map((item) =>
        item.category === categoryName ? { ...item, category: "Général" } : item
      ),
    }));

    if (category === categoryName) setCategory("Général");
    if (filter === categoryName) setFilter("Toutes");
  }

  function lockProfileAccess() {
    setIsProfileUnlocked(false);
    setPinInput("");
    setPinError("");
  }

  function requestProtectedPage(targetPage: "infos" | "profil") {
    if (!isPinProtectionEnabled || isProfileUnlocked) {
      setMainSection("profil");
      setPage(targetPage);
      return;
    }

    setMainSection("profil");
    setPage(`pin:${targetPage}`);
    setPinInput("");
    setPinError("");
  }

  function unlockProtectedPage(targetPage: "infos" | "profil") {
    const expectedPin = String(pinProtection?.pin || "");

    if (pinInput === expectedPin) {
      setIsProfileUnlocked(true);
      setPinError("");
      setPinInput("");
      setMainSection("profil");
      setPage(targetPage);
      return;
    }

    setPinError("Code PIN incorrect");
  }

  function switchToSelectedProfileFromLock() {
    if (!lockProfileSelectionId || lockProfileSelectionId === currentProfileId) {
      return;
    }

    const selectedProfile = profiles.find((profile) => profile.id === lockProfileSelectionId);
    const selectedPinProtection = (selectedProfile as any)?.pinProtection || {
      enabled: false,
      pin: "",
    };
    const selectedHasPin =
      Boolean(selectedPinProtection?.enabled) &&
      String(selectedPinProtection?.pin || "").length === 4;
    const targetPage = page === "pin:profil" ? "profil" : "infos";

    setCurrentProfileId(lockProfileSelectionId);
    setMainSection("profil");
    setIsProfileUnlocked(false);
    setPinInput("");
    setPinError("");

    if (selectedHasPin) {
      setPage(`pin:${targetPage}`);
      return;
    }

    setPage(targetPage);
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
    lockProfileAccess();
  }, [currentProfileId]);

  useEffect(() => {
    if (!isPinProtectionEnabled) {
      lockProfileAccess();
    }
  }, [isPinProtectionEnabled]);

  useEffect(() => {
    setLockProfileSelectionId(currentProfileId || profiles?.[0]?.id || "");
  }, [currentProfileId, profiles]);

  useEffect(() => {
    if (!(page === "pin:infos" || page === "pin:profil")) return;
    if (pinInput.length !== 4) return;

    unlockProtectedPage(page === "pin:infos" ? "infos" : "profil");
  }, [pinInput, page]);

  useEffect(() => {
    setOpenMainDropdown(null);
  }, [page]);

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

  const secondaryButtonStyle = {
    ...styles.secondaryButton,
    width: "100%",
    justifyContent: "flex-start" as const,
    textAlign: "left" as const,
    padding: "12px 14px",
    fontSize: "15px",
  };

  const mainNavButtonStyle = (active: boolean) => ({
    ...(active ? styles.primaryButton : styles.secondaryButton),
    width: "100%",
    display: "block",
    boxSizing: "border-box" as const,
    padding: "10px 8px",
    fontSize: "clamp(12px, 3vw, 15px)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  });

  const subNavButtonStyle = (active: boolean) => ({
    ...(active ? styles.primaryButton : styles.secondaryButton),
    flex: 1,
    minWidth: 0,
    padding: "9px 12px",
    fontSize: "14px",
  });

  const dropdownPanelStyle = {
    ...styles.card,
    position: "absolute" as const,
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    padding: 10,
    borderRadius: 16,
    zIndex: 40,
    boxShadow: "0 14px 34px rgba(0, 0, 0, 0.28)",
  };

  const secondaryDropdownPanelStyle = {
    ...styles.card,
    position: "absolute" as const,
    top: "calc(100% + 10px)",
    right: 0,
    width: "280px",
    maxWidth: "calc(100vw - 40px)",
    padding: 12,
    borderRadius: 18,
    zIndex: 50,
    boxShadow: "0 16px 38px rgba(0, 0, 0, 0.32)",
    overflow: "hidden" as const,
  };

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
            position: "relative",
            zIndex: 20,
            paddingBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "space-between",
              flexWrap: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <img
                src="/picturetitle.png"
                alt="Ma Voix"
                style={{
                  height: 56,
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>
                  {currentProfile.name}
                </div>
                {(currentProfile.firstName || currentProfile.lastName) && (
                  <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4 }}>
                    {[currentProfile.firstName, currentProfile.lastName].filter(Boolean).join(" ")}
                  </div>
                )}
              </div>
            </div>

            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
                aria-label={isSecondaryMenuOpen ? "Masquer le menu secondaire" : "Afficher le menu secondaire"}
                title={isSecondaryMenuOpen ? "Masquer le menu secondaire" : "Afficher le menu secondaire"}
                style={{
                  ...styles.secondaryButton,
                  minWidth: 48,
                  width: 48,
                  height: 48,
                  padding: 0,
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                ☰
              </button>

              {isSecondaryMenuOpen && (
                <div style={secondaryDropdownPanelStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <strong style={{ fontSize: 14 }}>Menu</strong>
                    <button
                      onClick={() => setIsSecondaryMenuOpen(false)}
                      style={{
                        ...styles.secondaryButton,
                        minWidth: 40,
                        width: 40,
                        height: 40,
                        padding: 0,
                        fontSize: 18,
                      }}
                      aria-label="Fermer le menu"
                      title="Fermer"
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <button
                      style={secondaryButtonStyle}
                      onClick={() => {
                        setPage("voix");
                        setIsSecondaryMenuOpen(false);
                      }}
                    >
                      Voix
                    </button>

                    <button
                      style={secondaryButtonStyle}
                      onClick={() => {
                        setMainSection("communication");
                        setPage("aidants");
                        setIsSecondaryMenuOpen(false);
                      }}
                    >
                      Aidants
                    </button>

                    <button
                      style={secondaryButtonStyle}
                      onClick={() => {
                        setPage("dictionnaire");
                        setIsSecondaryMenuOpen(false);
                      }}
                    >
                      Dictionnaire
                    </button>

                    <button
                      style={secondaryButtonStyle}
                      onClick={() => {
                        openNoticeSection();
                      }}
                    >
                      Notice
                    </button>

                    <button
                      style={{
                        ...secondaryButtonStyle,
                        background: "#22c55e",
                        color: "white",
                        border: "none",
                      }}
                      onClick={() =>
                        window.open(
                          "https://paypal.me/anime1120",
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      Soutenez-moi ❤️
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
              gap: 10,
              marginTop: 14,
              alignItems: "stretch",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <button
                style={mainNavButtonStyle(mainSection === "communication")}
                onClick={() => {
                  setMainSection("communication");
                  setOpenMainDropdown((prev) =>
                    prev === "communication" ? null : "communication"
                  );
                }}
              >
                Communication
              </button>

              {openMainDropdown === "communication" && (
                <div style={dropdownPanelStyle}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <button
                      style={subNavButtonStyle(page === "communication")}
                      onClick={() => {
                        setMainSection("communication");
                        setPage("communication");
                        setOpenMainDropdown(null);
                      }}
                    >
                      Rapide
                    </button>
                    <button
                      style={subNavButtonStyle(page === "reglages")}
                      onClick={() => {
                        setMainSection("communication");
                        setPage("reglages");
                        setOpenMainDropdown(null);
                      }}
                    >
                      Libre
                    </button>
                    <button
                      style={subNavButtonStyle(page === "aidants")}
                      onClick={() => {
                        setMainSection("communication");
                        setPage("aidants");
                        setOpenMainDropdown(null);
                      }}
                    >
                      Aidants
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <button
                style={mainNavButtonStyle(mainSection === "profil")}
                onClick={() => {
                  setMainSection("profil");
                  setOpenMainDropdown((prev) =>
                    prev === "profil" ? null : "profil"
                  );
                }}
              >
                Profil
              </button>

              {openMainDropdown === "profil" && (
                <div style={dropdownPanelStyle}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <button
                      style={subNavButtonStyle(page === "infos" || page === "pin:infos")}
                      onClick={() => {
                        setMainSection("profil");
                        requestProtectedPage("infos");
                        setOpenMainDropdown(null);
                      }}
                    >
                      Infos
                    </button>
                    <button
                      style={subNavButtonStyle(page === "profil" || page === "pin:profil")}
                      onClick={() => {
                        setMainSection("profil");
                        requestProtectedPage("profil");
                        setOpenMainDropdown(null);
                      }}
                    >
                      Profil
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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
              paddingBottom: 24,
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
              />
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
            ) : page === "pin:infos" || page === "pin:profil" ? (
              <div style={styles.gridSingle}>
                <div
                  style={{
                    ...styles.card,
                    maxWidth: 520,
                    margin: "0 auto",
                  }}
                >
                  <h2 style={styles.sectionTitle}>Accès protégé</h2>

                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: 16,
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.78)",
                    }}
                  >
                    Entrez le code PIN pour ouvrir{' '}
                    <strong>{page === "pin:infos" ? "Infos" : "Profil"}</strong>.
                  </p>

                  <div style={{ ...styles.formGroup, marginBottom: 16 }}>
                    <label style={styles.label}>Code PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                        if (pinError) setPinError("");
                      }}
                      style={{
                        ...styles.input,
                        textAlign: "center",
                        fontSize: 28,
                        letterSpacing: "0.35em",
                      }}
                      placeholder="0000"
                    />
                  </div>

                  {pinError ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(239,68,68,0.14)",
                        border: "1px solid rgba(239,68,68,0.28)",
                        color: "#fecaca",
                        fontWeight: 700,
                      }}
                    >
                      {pinError}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => {
                          if (pinInput.length >= 4) return;
                          setPinInput((prev) => `${prev}${digit}`);
                          if (pinError) setPinError("");
                        }}
                      >
                        {digit}
                      </button>
                    ))}

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => setPinInput((prev) => prev.slice(0, -1))}
                    >
                      ⌫
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => {
                        if (pinInput.length >= 4) return;
                        setPinInput((prev) => `${prev}0`);
                        if (pinError) setPinError("");
                      }}
                    >
                      0
                    </button>

                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={() =>
                        unlockProtectedPage(page === "pin:infos" ? "infos" : "profil")
                      }
                    >
                      OK
                    </button>
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      padding: 14,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      Ce n&apos;est pas votre profil ?
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "rgba(255,255,255,0.72)",
                        marginBottom: 12,
                      }}
                    >
                      Vous pouvez choisir un autre profil sans connaître le code PIN de celui-ci.
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={lockProfileSelectionId}
                        onChange={(e) => setLockProfileSelectionId(e.target.value)}
                        style={{
                          ...styles.input,
                          flex: 1,
                          minWidth: 220,
                        }}
                      >
                        {(profiles || []).map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={switchToSelectedProfileFromLock}
                        disabled={!lockProfileSelectionId || lockProfileSelectionId === currentProfileId}
                      >
                        Changer de profil
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => {
                        setMainSection("communication");
                        setPage("communication");
                        setPinInput("");
                        setPinError("");
                      }}
                    >
                      Retour
                    </button>
                  </div>
                </div>
              </div>
            ) : page === "infos" ? (
              <ProfileInfoPage
                styles={styles}
                currentProfile={currentProfile}
                onSpeak={(message) => speakText(message, "default")}
              />
            ) : page === "notice" ? (
              <NoticePage
                styles={styles}
                initialSection={noticeInitialSection}
              />
            ) : page === "dictionnaire" ? (
              <DictionaryPage styles={styles} />
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
      </div>

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

