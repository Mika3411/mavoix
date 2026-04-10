import React, { useEffect, useMemo, useRef, useState } from "react";
import useAudioRecording from "./hooks/useAudioRecording";
import useSpeech from "./hooks/useSpeech";
import CommunicationPage from "./CommunicationPage";
import VoicePage from "./VoicePage";
import ProfileSettingsPage from "./ProfileSettingsPage";
import ProfileInfoPage from "./ProfileInfoPage";
import CreditsPage from "./CreditsPage";
import InstallButton from "./InstallButton";
import NoticePage from "./NoticePage";
import { AVAILABLE_ICONS, generateId, getCategoryBackground } from "./data";
import { createStyles, getActiveTheme } from "./themes";
import useProfiles from "./hooks/useProfiles";
import useAI from "./hooks/useAI";
import { normalizePhoneForSms } from "./utils/phone";
import type { VoiceEditor } from "./types";

export default function App() {
  const [page, setPage] = useState("communication");
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Général");
  const [filter, setFilter] = useState("Toutes");

  const realtimeAiMode = "realtime_correction_and_prediction";
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

  const availableSmsContacts = emergencyContacts.filter(
    (contact) => contact.name?.trim() && contact.phone?.trim()
  );

  const activeTheme = getActiveTheme(currentProfile);
  const styles = createStyles(activeTheme);

  const {
    aiGeneratedText,
    setAiGeneratedText,
    aiLoading,
    aiError,
    setAiError,
    aiUsage,
    aiStatusLoading,
    creditsPurchaseLoading,
    creditsMessage,
    handleGenerateButtonClick,
    purchaseCredits,
  } = useAI({
    currentProfileId,
    text,
    mode: realtimeAiMode,
    onBlocked: () => setPage("credits"),
  });

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
      setSelectedSmsContactId("");
      return;
    }

    const selectedExists = availableSmsContacts.some(
      (contact) => contact.id === selectedSmsContactId
    );

    if (!selectedExists) {
      setSelectedSmsContactId(availableSmsContacts[0].id);
    }
  }, [availableSmsContacts, selectedSmsContactId]);

  const categories = customCategories.map((item) => item.name);

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
    if (filter === "Favoris") {
      return savedPhrases.filter((item) => item.favorite);
    }
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
        voiceSettings: {
          ...defaultVoiceSettings,
        },
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
  }, [selectedPhrase, categories, defaultVoiceSettings.rate, defaultVoiceSettings.pitch, defaultVoiceSettings.volume]);
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

    setToastMessage("Phrase enregistrée");

    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  function getSmsTextToSend() {
    const preferredText = aiGeneratedText.trim() || text.trim();
    return preferredText;
  }

  function sendTextMessage() {
    const selectedContact = emergencyContacts.find(
      (contact) => contact.id === selectedSmsContactId
    );

    if (!selectedContact?.phone?.trim()) {
      setToastMessage("Ajoute d'abord un contact avec un numéro.");
      setTimeout(() => setToastMessage(""), 3000);
      return;
    }

    const message = getSmsTextToSend();
    if (!message) {
      setToastMessage("Écris un message avant l'envoi.");
      setTimeout(() => setToastMessage(""), 3000);
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
  function openInfosAndAskForHelp() {
    setPage("infos");
    speakText("J'ai besoin d'aide immédiatement", "default");
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
            transform: isNavHidden ? "translateY(calc(-100% + 18px))" : "translateY(0)",
            transition: "transform 0.3s ease",
            position: "relative",
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src="/picturetitle.png"
              alt="Ma Voix"
              style={{
                height: 80,
                objectFit: "contain",
              }}
            />

            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {currentProfile.name}
              {currentProfile.firstName || currentProfile.lastName
                ? ` ${[currentProfile.firstName, currentProfile.lastName]
                    .filter(Boolean)
                    .join(" ")}`
                : ""}
            </div>
          </div>

          <div style={styles.topButtons}>
            <button
              style={{
                ...(page === "communication"
                  ? styles.primaryButton
                  : styles.secondaryButton),
                padding: "6px 18px",
                fontSize: "15px",
              }}
              onClick={() => setPage("communication")}
            >
              Communication
            </button>

            <button
              style={
                page === "voix" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("voix")}
            >
              Voix
            </button>

            <button
              style={
                page === "infos" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("infos")}
            >
              Infos
            </button>

            <button
              style={
                page === "profil"
                  ? styles.primaryButton
                  : styles.secondaryButton
              }
              onClick={() => setPage("profil")}
            >
              Profil
            </button>

            <button
              style={
                page === "reglages"
                  ? styles.primaryButton
                  : styles.secondaryButton
              }
              onClick={() => setPage("reglages")}
            >
              Générer
            </button>

            <button
              style={
                page === "credits" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("credits")}
            >
              Crédits {aiUsage.creditsRemaining > 0 ? `(${aiUsage.creditsRemaining})` : ""}
            </button>

            <button
              style={
                page === "notice" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("notice")}
            >
              Notice
            </button>


            <button
              onClick={() =>
                window.open(
                  "https://paypal.me/anime1120",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
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
        </div>

        <button
          onClick={() => setIsNavHidden((prev) => !prev)}
          aria-label={isNavHidden ? "Afficher la barre de navigation" : "Masquer la barre de navigation"}
          title={isNavHidden ? "Afficher la navigation" : "Masquer la navigation"}
          style={{
            position: "absolute",
            top: isNavHidden ? 18 : 108,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            width: 56,
            height: 28,
            borderRadius: "0 0 16px 16px",
            border: "none",
            background: activeTheme?.cardBackground || "#1e293b",
            color: activeTheme?.text || "#ffffff",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            transition: "top 0.3s ease, transform 0.2s ease",
          }}
        >
          {isNavHidden ? "↓" : "↑"}
        </button>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            marginTop: isNavHidden ? "-90px" : "0px",
            transition: "margin-top 0.3s ease",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <InstallButton styles={styles} />

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              minHeight: 0,
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              paddingBottom: 140,
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
        ) : page === "credits" ? (
          <CreditsPage
            styles={styles}
            aiUsage={aiUsage}
            aiStatusLoading={aiStatusLoading}
            creditsPurchaseLoading={creditsPurchaseLoading}
            creditsMessage={creditsMessage}
            onPurchase={purchaseCredits}
            onBackToEditor={() => setPage("reglages")}
          />
        ) : page === "notice" ? (
          <NoticePage styles={styles} />
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
            aiGeneratedText={aiGeneratedText}
            aiLoading={aiLoading}
            aiError={aiError}
            aiUsage={aiUsage}
            aiStatusLoading={aiStatusLoading}
            generateTextWithAI={handleGenerateButtonClick}
            setAiGeneratedText={setAiGeneratedText}
            goToCreditsPage={() => setPage("credits")}
          />
        )}
          </div>
        </div>
      </div>

      
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

      <button
        onClick={openInfosAndAskForHelp}
        style={{
          ...styles.urgentFloatingButton,
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 9999,
        }}
      >
        🚨 URGENCE
      </button>

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