import React, { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import useAudioRecording from "../features/speech/useAudioRecording";
import useSpeech from "../features/speech/useSpeech";
import CommunicationPage from "../features/communication/CommunicationPage";
import usePhraseEditor from "../features/communication/usePhraseEditor";
import CaregiverApkSharePage from "../features/caregivers/CaregiverApkSharePage";
import CaregiverMessagesPage from "../features/caregivers/CaregiverMessagesPage";
import useCaregiverAlerts from "../features/caregivers/useCaregiverAlerts";
import useCaregiverMessageStreams from "../features/caregivers/useCaregiverMessageStreams";
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
import useDesktopUpdates from "../features/updates/useDesktopUpdates";
import { AVAILABLE_ICONS, getCategoryBackground } from "../data";
import { createStyles, getActiveTheme } from "../themes";
import useProfiles from "../features/profiles/useProfiles";
import { normalizePhoneForSms } from "../shared/phone";

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

export default function App() {
  const [page, setPage] = useState("communication");
  const [text, setText] = useState("");

  const [selectedSmsContactId, setSelectedSmsContactId] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(getInitialViewportWidth);
  const [viewportHeight, setViewportHeight] = useState(getInitialViewportHeight);
  const [isPhraseEditMode, setIsPhraseEditMode] = useState(false);
  const [noticeInitialSection, setNoticeInitialSection] =
    useState<SectionKey>("sommaire");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

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
  const {
    availableUpdate,
    canShowDownloadPage,
    dismissDesktopUpdate,
    downloadDevice,
    openDesktopUpdateDownload,
  } = useDesktopUpdates({ showToast });
  const {
    caregiverAlertSending,
    caregiverAlertTargets,
    selectedCaregiverAlertTarget,
    selectedCaregiverAlertTargetId,
    addCaregiverAlertLink,
    copyCaregiverAlertLink,
    deleteCaregiverAlertLink,
    regenerateCaregiverAlertLink,
    selectCaregiverAlertTarget,
    sendCaregiverAlert,
    updateCaregiverAlertLink,
  } = useCaregiverAlerts({
    currentProfile,
    currentProfileId,
    downloadDevice,
    updateCurrentProfile,
    showToast,
  });
  const {
    markCaregiverMessagesRead,
    refreshCaregiverUnreadCount,
    unreadCaregiverMessageCount,
  } = useCaregiverMessageStreams({
    caregiverAlertTargets,
    currentProfileId,
    profileId: currentProfile?.id,
    page,
  });

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

  const {
    addCategory,
    categories,
    category,
    categoryOptions,
    deleteCategory,
    deletePhrase,
    filter,
    filteredPhrases,
    label,
    movePhrase,
    newCategoryIcon,
    newCategoryName,
    savePhrase,
    saveSelectedPhraseVoiceSettings,
    selectedPhrase,
    selectedPhraseId,
    setCategory,
    setFilter,
    setLabel,
    setNewCategoryIcon,
    setNewCategoryName,
    setSelectedPhraseId,
    setVoiceEditor,
    updatePhrase,
    voiceEditor,
  } = usePhraseEditor({
    currentProfile,
    customCategories,
    defaultVoice,
    defaultVoiceSettings,
    savedPhrases,
    setText,
    showToast,
    text,
    updateCurrentProfile,
  });

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
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
      html,
      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      button,
      input,
      textarea,
      select {
        font-family: inherit;
      }

      button {
        transition:
          filter 0.14s ease,
          transform 0.12s ease,
          box-shadow 0.14s ease,
          border-color 0.14s ease,
          opacity 0.14s ease !important;
      }

      button:hover:not(:disabled) {
        filter: brightness(1.05) saturate(1.06);
        transform: translateY(-1px);
      }

      button:active:not(:disabled) {
        filter: brightness(0.94) saturate(1.12);
        transform: translateY(1px) scale(0.99);
      }

      button:disabled {
        cursor: not-allowed;
      }

      button:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible,
      a:focus-visible {
        outline: 3px solid rgba(25, 194, 255, 0.54);
        outline-offset: 3px;
      }

      input:focus,
      textarea:focus,
      select:focus {
        border-color: rgba(25, 194, 255, 0.7) !important;
        box-shadow: 0 0 0 3px rgba(25, 194, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
      }

      @keyframes ma-voix-premium-bell-ring {
        0% {
          transform: rotate(0deg) scale(1);
        }
        18% {
          transform: rotate(-9deg) scale(1.06);
        }
        36% {
          transform: rotate(8deg) scale(1.07);
        }
        54% {
          transform: rotate(-5deg) scale(1.04);
        }
        72% {
          transform: rotate(3deg) scale(1.02);
        }
        100% {
          transform: rotate(0deg) scale(1);
        }
      }

      @keyframes ma-voix-premium-bell-glow {
        0% {
          opacity: 0.9;
          transform: scale(0.92);
        }
        50% {
          opacity: 1;
          transform: scale(1.12);
        }
        100% {
          opacity: 0.9;
          transform: scale(0.98);
        }
      }

      .ma-voix-premium-bell-button {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        will-change: transform, box-shadow, filter;
      }

      .ma-voix-premium-bell-shine,
      .ma-voix-premium-bell-glow,
      .ma-voix-premium-bell-glyph {
        transition:
          opacity 180ms ease,
          transform 180ms ease,
          filter 180ms ease;
        transform-origin: center;
        will-change: transform, opacity, filter;
      }

      @media (hover: hover) and (pointer: fine) {
        .ma-voix-premium-bell-button:hover:not(:disabled) {
          filter: brightness(1.08) saturate(1.14) !important;
          transform: translate3d(0, -4px, 0) scale(1.055) !important;
          box-shadow:
            0 30px 62px rgba(245, 158, 11, 0.44),
            0 18px 34px rgba(0, 0, 0, 0.36),
            inset 0 1px 0 rgba(255,255,255,0.78),
            inset 0 -14px 24px rgba(146, 64, 14, 0.14) !important;
        }

        .ma-voix-premium-bell-button:hover:not(:disabled) .ma-voix-premium-bell-glyph {
          animation: ma-voix-premium-bell-ring 680ms cubic-bezier(0.2, 0.82, 0.2, 1) both;
          filter:
            drop-shadow(0 1px 0 rgba(255,255,255,0.42))
            drop-shadow(0 8px 12px rgba(120, 53, 15, 0.22));
        }

        .ma-voix-premium-bell-button:hover:not(:disabled) .ma-voix-premium-bell-shine {
          opacity: 1 !important;
          transform: translateY(-2px) scale(1.02) !important;
        }

        .ma-voix-premium-bell-button:hover:not(:disabled) .ma-voix-premium-bell-glow {
          animation: ma-voix-premium-bell-glow 720ms ease both;
        }
      }

      .ma-voix-premium-bell-button:active:not(:disabled) {
        filter: brightness(0.98) saturate(1.2) !important;
        transform: translate3d(0, 1px, 0) scale(0.955) !important;
        box-shadow:
          0 14px 28px rgba(245, 158, 11, 0.28),
          0 8px 18px rgba(0, 0, 0, 0.34),
          inset 0 1px 0 rgba(255,255,255,0.52),
          inset 0 -8px 18px rgba(146, 64, 14, 0.2) !important;
      }

      .ma-voix-premium-bell-button:active:not(:disabled) .ma-voix-premium-bell-glyph {
        animation: ma-voix-premium-bell-ring 520ms cubic-bezier(0.2, 0.82, 0.2, 1) both;
      }

      @media (prefers-reduced-motion: reduce) {
        .ma-voix-premium-bell-button,
        .ma-voix-premium-bell-shine,
        .ma-voix-premium-bell-glow,
        .ma-voix-premium-bell-glyph {
          animation: none !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;

    return () => {
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
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
    canShowDownloadPage,
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
        ) : page === "partage-aidant" ? (
          <CaregiverApkSharePage
            styles={styles}
            activeTheme={activeTheme}
            currentProfile={currentProfile}
            emergencyContacts={emergencyContacts}
            caregiverAlertLinks={caregiverAlertTargets}
            selectedCaregiverAlertLinkId={selectedCaregiverAlertTargetId}
            addCaregiverAlertLink={addCaregiverAlertLink}
            showToast={showToast}
          />
        ) : page === "aidants" ? (
          <CaregiverMessagesPage
            styles={styles}
            caregiverAlertLinks={caregiverAlertTargets}
            selectedCaregiverAlertLinkId={selectedCaregiverAlertTargetId}
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
