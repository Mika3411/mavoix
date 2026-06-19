import type { CSSProperties } from "react";

import React from "react";
import { formatTextSmart } from "./utils/textFormatting";
import { createCompactCardStyle } from "./utils/profileCardStyles";

const CONFIG_SECTIONS = [
  { id: "identite", label: "Identité" },
  { id: "sante", label: "Santé" },
  { id: "contacts", label: "Contacts" },
  { id: "phrases", label: "Phrases" },
  { id: "securite", label: "Sécurité" },
];

const VIRTUAL_KEYBOARD_ROWS = [
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["Maj", "W", "X", "C", "V", "B", "N", "Retour", "Mot", "Entrée"],
  ["'", "-", ".", "Espace", ",", "?", "!"],
];
const VIRTUAL_KEYBOARD_LONG_PRESS_DELAY_MS = 460;
const VIRTUAL_KEYBOARD_NUMBER_LABELS: Record<string, string> = {
  A: "1",
  Z: "2",
  E: "3",
  R: "4",
  T: "5",
  Y: "6",
  U: "7",
  I: "8",
  O: "9",
  P: "0",
};
const VIRTUAL_KEYBOARD_VARIANTS: Record<string, string[]> = {
  A: ["1", "à", "â", "ä", "æ", "@"],
  C: ["ç"],
  E: ["3", "é", "è", "ê", "ë", "€"],
  I: ["8", "î", "ï"],
  N: ["ñ"],
  O: ["9", "ô", "ö", "œ"],
  P: ["0"],
  R: ["4"],
  S: ["$", "ś", "š", "ş"],
  T: ["5"],
  U: ["7", "ù", "û", "ü"],
  Y: ["6", "ÿ"],
  Z: ["2"],
};

type ActionIconName = "keyboard" | "microphone" | "recordStop" | "listen" | "voiceStop";

function ActionIcon({
  name,
  size = 26,
}: {
  name: ActionIconName;
  size?: number;
}) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: "false",
    style: { display: "block", flex: "0 0 auto" },
  } as const;

  if (name === "keyboard") {
    return (
      <svg {...commonProps}>
        <rect
          x="4.75"
          y="8.5"
          width="22.5"
          height="15"
          rx="3.4"
          stroke="currentColor"
          strokeWidth="2.15"
        />
        <path
          d="M10 26.5h12"
          stroke="currentColor"
          strokeWidth="2.15"
          strokeLinecap="round"
          opacity="0.6"
        />
        {[
          [8.5, 12],
          [13, 12],
          [17.5, 12],
          [22, 12],
          [8.5, 16],
          [13, 16],
          [17.5, 16],
          [22, 16],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="2.8"
            height="2.35"
            rx="0.75"
            fill="currentColor"
          />
        ))}
        <rect x="10.75" y="20" width="10.5" height="2.35" rx="1" fill="currentColor" />
      </svg>
    );
  }

  if (name === "microphone") {
    return (
      <svg {...commonProps}>
        <rect
          x="12"
          y="5"
          width="8"
          height="14"
          rx="4"
          stroke="currentColor"
          strokeWidth="2.3"
        />
        <path
          d="M8 14.25v1.35c0 4.55 3.45 8 8 8s8-3.45 8-8v-1.35"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M16 23.6v4.15M12.25 27.75h7.5"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M14.25 9h3.5M14.25 13h3.5"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          opacity="0.72"
        />
      </svg>
    );
  }

  if (name === "recordStop") {
    return (
      <svg {...commonProps}>
        <circle cx="16" cy="16" r="11.25" stroke="currentColor" strokeWidth="2.2" opacity="0.65" />
        <rect x="11.5" y="11.5" width="9" height="9" rx="2" fill="currentColor" />
        <path
          d="M8.25 8.25 23.75 23.75"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    );
  }

  if (name === "listen") {
    return (
      <svg {...commonProps}>
        <path
          d="M8.25 10.5h3.9l5.35-4.1c.9-.68 2.2-.05 2.2 1.08v17.04c0 1.13-1.3 1.76-2.2 1.08l-5.35-4.1h-3.9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2.15"
          strokeLinejoin="round"
        />
        <path
          d="M23.25 11.2c1.15 1.25 1.75 2.8 1.75 4.8s-.6 3.55-1.75 4.8M26.7 8.25c1.85 2.05 2.8 4.55 2.8 7.75s-.95 5.7-2.8 7.75"
          stroke="currentColor"
          strokeWidth="2.15"
          strokeLinecap="round"
        />
        <path d="M12.4 12.2v7.6" stroke="currentColor" strokeWidth="1.55" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path
        d="M8.75 10.75h3.55l4.85-3.7c.8-.62 1.98-.05 1.98.96v15.98c0 1.01-1.18 1.58-1.98.96l-4.85-3.7H8.75a1.9 1.9 0 0 1-1.9-1.9v-6.7a1.9 1.9 0 0 1 1.9-1.9Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <rect x="21.35" y="11.35" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <path
        d="M22.25 22.35 28 27.75M28 22.35l-5.75 5.4"
        stroke="currentColor"
        strokeWidth="2.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ProfileSettingsPage(props: any) {
  const {
    styles,
    page,
    currentProfile,
    updateCurrentProfileField,
    updateNestedProfileField,
    updateProfilePhoto,
    removeProfilePhoto,
    addTreatment,
    updateTreatment,
    deleteTreatment,
    currentProfileId,
    setCurrentProfileId,
    profiles,
    setFilter,
    setCategory,
    createNewProfile,
    duplicateCurrentProfile,
    deleteCurrentProfile,
    exportCurrentProfile,
    importCurrentProfile,
    exportAllProfiles,
    importAllProfiles,
    fileInputRef,
    privacyStatus,
    enablePrivacyPassword,
    unlockPrivateData,
    lockPrivateData,
    caregiverAlertLinks = [],
    addCaregiverAlertLink,
    updateCaregiverAlertLink,
    deleteCaregiverAlertLink,
    copyCaregiverAlertLink,
    selectedCaregiverAlertLinkId = "",
    selectCaregiverAlertTarget,
    openNoticeSection,
    text,
    setText,
    isListening,
    stopDictation,
    startDictation,
    speakText,
    stopSpeaking,
    savePhrase,
    label,
    setLabel,
    category,
    categories,
    newCategoryName,
    setNewCategoryName,
    newCategoryIcon,
    setNewCategoryIcon,
    AVAILABLE_ICONS,
    addCategory,
    customCategories,
    deleteCategory,
    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
  } = props;
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [configSection, setConfigSection] = React.useState("identite");
  const standardTextAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const virtualKeyboardLongPressTimerRef = React.useRef<number | null>(null);
  const virtualKeyboardSuppressClickRef = React.useRef("");
  const virtualKeyboardHoveredVariantRef = React.useRef("");
  const isCompactLayout =
    typeof window !== "undefined" && window.innerWidth <= 640;
  const virtualKeyboardActionSize = isCompactLayout ? 44 : 48;
  const virtualKeyboardActionPadding = isCompactLayout ? "8px 6px" : "10px 10px";
  const virtualKeyboardActionIconSize = isCompactLayout ? 23 : 27;
  const virtualKeyboardKeyMinHeight = isCompactLayout ? 48 : 52;
  const virtualKeyboardKeyPadding = isCompactLayout ? "8px 4px" : "10px 6px";
  const virtualKeyboardVariantSize = isCompactLayout ? 44 : 48;

  const [sendMode, setSendMode] = React.useState("sms");
  const [selectedSendContactId, setSelectedSendContactId] = React.useState(
    emergencyContacts?.[0]?.id || ""
  );
  const [privacyPassword, setPrivacyPassword] = React.useState("");
  const [privacyPasswordConfirm, setPrivacyPasswordConfirm] = React.useState("");
  const [privacyUnlockPassword, setPrivacyUnlockPassword] = React.useState("");
  const [privacyActionMessage, setPrivacyActionMessage] = React.useState("");
  const [privacyActionLoading, setPrivacyActionLoading] = React.useState(false);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = React.useState(false);
  const [isVirtualKeyboardShiftActive, setIsVirtualKeyboardShiftActive] =
    React.useState(false);
  const [virtualKeyboardVariantMenu, setVirtualKeyboardVariantMenu] =
    React.useState<{ key: string } | null>(null);
  const [virtualKeyboardHoveredVariant, setVirtualKeyboardHoveredVariant] =
    React.useState("");
  const availableCaregiverAlertLinks = React.useMemo(
    () => (caregiverAlertLinks || []).filter((link) => link.enabled),
    [caregiverAlertLinks]
  );
  const selectedCaregiverAlertLink =
    availableCaregiverAlertLinks.find(
      (link) => link.id === selectedCaregiverAlertLinkId
    ) ||
    availableCaregiverAlertLinks[0] ||
    null;

  async function handleEnablePrivacyPassword() {
    try {
      setPrivacyActionLoading(true);
      setPrivacyActionMessage("");

      if (privacyPassword !== privacyPasswordConfirm) {
        throw new Error("Les deux mots de passe ne correspondent pas.");
      }

      await enablePrivacyPassword?.(privacyPassword);
      setPrivacyPassword("");
      setPrivacyPasswordConfirm("");
      setPrivacyActionMessage("Verrou par mot de passe activé.");
    } catch (error) {
      setPrivacyActionMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'activer le verrou."
      );
    } finally {
      setPrivacyActionLoading(false);
    }
  }

  async function handleUnlockPrivateData() {
    try {
      setPrivacyActionLoading(true);
      setPrivacyActionMessage("");
      await unlockPrivateData?.(privacyUnlockPassword);
      setPrivacyUnlockPassword("");
      setPrivacyActionMessage("Données médicales déverrouillées.");
    } catch (error) {
      setPrivacyActionMessage(
        error instanceof Error
          ? "Mot de passe incorrect ou coffre illisible."
          : "Impossible de déverrouiller les données."
      );
    } finally {
      setPrivacyActionLoading(false);
    }
  }

  function getContactUsage(contact) {
    return contact?.usage || "contact";
  }

  const sendableContacts = (emergencyContacts || []).filter(
    (contact) =>
      (contact.name || contact.phone) && getContactUsage(contact) !== "urgence"
  );

  const profileHistoryStorageKey = React.useMemo(() => {
    const profileKey =
      currentProfileId ||
      currentProfile?.id ||
      currentProfile?.name ||
      "default";
    return `phraseSuggestionHistory:${profileKey}`;
  }, [currentProfileId, currentProfile?.id, currentProfile?.name]);

  const [suggestionHistory, setSuggestionHistory] = React.useState({});

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(profileHistoryStorageKey);
      setSuggestionHistory(saved ? JSON.parse(saved) : {});
    } catch (error) {
      console.error("Impossible de lire l'historique :", error);
      setSuggestionHistory({});
    }
  }, [profileHistoryStorageKey]);

  function persistSuggestionHistory(nextHistory) {
    try {
      window.localStorage.setItem(
        profileHistoryStorageKey,
        JSON.stringify(nextHistory)
      );
    } catch (error) {
      console.error("Impossible d'enregistrer l'historique :", error);
    }
  }

  function saveWordToHistory(word) {
    const normalized = String(word || "").trim().toLowerCase();
    if (!normalized) return;

    setSuggestionHistory((prev) => {
      const nextHistory = {
        ...(prev || {}),
        [normalized]: Number(prev?.[normalized] || 0) + 1,
      };
      persistSuggestionHistory(nextHistory);
      return nextHistory;
    });
  }

  function rememberLastTypedWord(value) {
    const typedWords = String(value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const lastTypedWord = typedWords[typedWords.length - 1];

    if (lastTypedWord) {
      saveWordToHistory(lastTypedWord);
    }
  }

  function focusStandardTextArea(nextCursorStart = null, nextCursorEnd = null) {
    window.requestAnimationFrame(() => {
      const textarea = standardTextAreaRef.current;
      if (!textarea) return;

      textarea.focus();

      const startPos =
        typeof nextCursorStart === "number"
          ? nextCursorStart
          : textarea.value.length;
      const endPos =
        typeof nextCursorEnd === "number" ? nextCursorEnd : startPos;

      try {
        textarea.setSelectionRange(startPos, endPos);
      } catch (error) {
        console.error("Impossible de positionner le curseur :", error);
      }
    });
  }

  function applyTextInput(nextValue, nextCursorStart = null, nextCursorEnd = null) {
    setText(formatTextSmart(nextValue));
    focusStandardTextArea(nextCursorStart, nextCursorEnd);
  }

  function handleTextAreaChange(value) {
    setText(formatTextSmart(value));

    if (/\s$/.test(value)) {
      rememberLastTypedWord(value);
    }
  }

  function insertVirtualKeyboardText(value) {
    const textarea = standardTextAreaRef.current;
    const currentText = String(text || "");
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const nextText = `${currentText.slice(0, selectionStart)}${value}${currentText.slice(selectionEnd)}`;
    const nextCursor = selectionStart + value.length;

    if (/\s$/.test(value)) {
      rememberLastTypedWord(currentText.slice(0, selectionStart));
    }

    applyTextInput(nextText, nextCursor, nextCursor);
  }

  function deleteVirtualKeyboardText() {
    const textarea = standardTextAreaRef.current;
    const currentText = String(text || "");
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;

    if (selectionStart !== selectionEnd) {
      const nextText = `${currentText.slice(0, selectionStart)}${currentText.slice(selectionEnd)}`;
      applyTextInput(nextText, selectionStart, selectionStart);
      return;
    }

    if (selectionStart <= 0) {
      focusStandardTextArea(0, 0);
      return;
    }

    const nextText = `${currentText.slice(0, selectionStart - 1)}${currentText.slice(selectionStart)}`;
    applyTextInput(nextText, selectionStart - 1, selectionStart - 1);
  }

  function deleteVirtualKeyboardWord() {
    const textarea = standardTextAreaRef.current;
    const currentText = String(text || "");
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;

    if (selectionStart !== selectionEnd) {
      const nextText = `${currentText.slice(0, selectionStart)}${currentText.slice(selectionEnd)}`;
      applyTextInput(nextText, selectionStart, selectionStart);
      return;
    }

    if (selectionStart <= 0) {
      focusStandardTextArea(0, 0);
      return;
    }

    const beforeCursor = currentText.slice(0, selectionStart);
    const trimmedEndLength = beforeCursor.replace(/\s+$/, "").length;
    const wordMatch = beforeCursor.slice(0, trimmedEndLength).match(/\S+$/);
    const deleteFrom = wordMatch
      ? trimmedEndLength - wordMatch[0].length
      : trimmedEndLength;
    const nextText = `${currentText.slice(0, deleteFrom)}${currentText.slice(selectionStart)}`;

    applyTextInput(nextText, deleteFrom, deleteFrom);
  }

  function isVirtualKeyboardLetter(key) {
    return /^[A-Z]$/.test(key);
  }

  function getVirtualKeyboardKeyValue(key) {
    if (!isVirtualKeyboardLetter(key)) {
      return key;
    }

    return isVirtualKeyboardShiftActive ? key : key.toLowerCase();
  }

  function getVirtualKeyboardKeyLabel(key, displayedKey) {
    if (key === "Retour") return "⌫";
    if (key === "Entrée") return "↵";
    if (key === "Mot") return "Mot";
    return displayedKey;
  }

  function getVirtualKeyboardKeyVariants(key) {
    if (!isVirtualKeyboardLetter(key)) {
      return [];
    }

    const variants = VIRTUAL_KEYBOARD_VARIANTS[key] || [];

    return variants.map((variant) =>
      isVirtualKeyboardShiftActive ? variant.toUpperCase() : variant
    );
  }

  function getVirtualKeyboardVariantFromPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);

    if (!(target instanceof Element)) {
      return "";
    }

    return (
      target
        .closest("[data-virtual-keyboard-variant]")
        ?.getAttribute("data-virtual-keyboard-variant") || ""
    );
  }

  function setVirtualKeyboardHoveredVariantValue(variant) {
    virtualKeyboardHoveredVariantRef.current = variant;
    setVirtualKeyboardHoveredVariant(variant);
  }

  function clearVirtualKeyboardLongPressTimer() {
    if (virtualKeyboardLongPressTimerRef.current === null) {
      return;
    }

    window.clearTimeout(virtualKeyboardLongPressTimerRef.current);
    virtualKeyboardLongPressTimerRef.current = null;
  }

  function startVirtualKeyboardLongPress(key) {
    const variants = getVirtualKeyboardKeyVariants(key);

    if (!variants.length) {
      return;
    }

    clearVirtualKeyboardLongPressTimer();
    virtualKeyboardSuppressClickRef.current = "";
    setVirtualKeyboardHoveredVariantValue("");
    virtualKeyboardLongPressTimerRef.current = window.setTimeout(() => {
      virtualKeyboardLongPressTimerRef.current = null;
      virtualKeyboardSuppressClickRef.current = key;
      setVirtualKeyboardVariantMenu({ key });
      focusStandardTextArea();
    }, VIRTUAL_KEYBOARD_LONG_PRESS_DELAY_MS);
  }

  function cancelVirtualKeyboardLongPress() {
    clearVirtualKeyboardLongPressTimer();
  }

  function closeVirtualKeyboardVariantMenu() {
    setVirtualKeyboardHoveredVariantValue("");
    setVirtualKeyboardVariantMenu(null);
  }

  function insertVirtualKeyboardVariant(variant) {
    virtualKeyboardSuppressClickRef.current = "";
    closeVirtualKeyboardVariantMenu();
    insertVirtualKeyboardText(variant);
  }

  function handleVirtualKeyboardKey(key) {
    closeVirtualKeyboardVariantMenu();

    if (key === "Maj") {
      setIsVirtualKeyboardShiftActive((prev) => !prev);
      focusStandardTextArea();
      return;
    }

    if (key === "Espace") {
      insertVirtualKeyboardText(" ");
      return;
    }

    if (key === "Retour") {
      deleteVirtualKeyboardText();
      return;
    }

    if (key === "Mot") {
      deleteVirtualKeyboardWord();
      return;
    }

    if (key === "Entrée") {
      insertVirtualKeyboardText("\n");
      return;
    }

    insertVirtualKeyboardText(getVirtualKeyboardKeyValue(key));
  }

  function handleVirtualKeyboardButtonClick(key) {
    cancelVirtualKeyboardLongPress();

    if (virtualKeyboardSuppressClickRef.current === key) {
      virtualKeyboardSuppressClickRef.current = "";
      return;
    }

    virtualKeyboardSuppressClickRef.current = "";
    handleVirtualKeyboardKey(key);
  }

  function getWordBoundaries(value, selectionStart, selectionEnd) {
    let start = selectionStart;
    let end = selectionEnd;

    while (start > 0 && /[^\s.,;:!?()"“”'’«»]/.test(value[start - 1])) {
      start -= 1;
    }

    while (end < value.length && /[^\s.,;:!?()"“”'’«»]/.test(value[end])) {
      end += 1;
    }

    return { start, end };
  }

  React.useEffect(
    () => () => {
      clearVirtualKeyboardLongPressTimer();
    },
    []
  );

  React.useEffect(() => {
    if (!virtualKeyboardVariantMenu) {
      return;
    }

    function handleVariantPointerMove(event) {
      const variant = getVirtualKeyboardVariantFromPoint(
        event.clientX,
        event.clientY
      );

      if (variant !== virtualKeyboardHoveredVariantRef.current) {
        setVirtualKeyboardHoveredVariantValue(variant);
      }
    }

    function handleVariantPointerUp(event) {
      const variant =
        getVirtualKeyboardVariantFromPoint(event.clientX, event.clientY) ||
        virtualKeyboardHoveredVariantRef.current;

      virtualKeyboardSuppressClickRef.current = virtualKeyboardVariantMenu.key;

      if (variant) {
        insertVirtualKeyboardVariant(variant);
      } else {
        closeVirtualKeyboardVariantMenu();
        focusStandardTextArea();
      }

      event.preventDefault();
      event.stopPropagation();
    }

    function handleVariantPointerCancel(event) {
      virtualKeyboardSuppressClickRef.current = virtualKeyboardVariantMenu.key;
      closeVirtualKeyboardVariantMenu();
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("pointermove", handleVariantPointerMove, true);
    window.addEventListener("pointerup", handleVariantPointerUp, true);
    window.addEventListener("pointercancel", handleVariantPointerCancel, true);

    return () => {
      window.removeEventListener("pointermove", handleVariantPointerMove, true);
      window.removeEventListener("pointerup", handleVariantPointerUp, true);
      window.removeEventListener(
        "pointercancel",
        handleVariantPointerCancel,
        true
      );
    };
  }, [virtualKeyboardVariantMenu]);

  React.useEffect(() => {
    if (!sendableContacts.length) {
      setSelectedSendContactId("");
      return;
    }

    const stillExists = sendableContacts.some(
      (contact) => contact.id === selectedSendContactId
    );

    if (!stillExists) {
      setSelectedSendContactId(sendableContacts[0].id);
    }
  }, [sendableContacts, selectedSendContactId]);

  function sanitizePhoneInput(value) {
    const raw = String(value || "");
    let cleaned = raw.replace(/[^\d+]/g, "");

    if (!cleaned) return "";

    if (cleaned.startsWith("+")) {
      cleaned = `+${cleaned.slice(1).replace(/\+/g, "")}`;
    } else {
      cleaned = cleaned.replace(/\+/g, "");
    }

    return cleaned;
  }

  function formatPhoneForStorage(value) {
    const cleaned = sanitizePhoneInput(value);

    if (!cleaned) return "";
    if (cleaned.startsWith("+33")) return cleaned;
    if (cleaned.startsWith("33")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+33${cleaned.slice(1)}`;
    if (cleaned.startsWith("+")) return cleaned;
    return `+${cleaned}`;
  }

  function normalizeWhatsAppPhone(rawPhone) {
    const cleaned = String(rawPhone || "")
      .replace(/\s+/g, "")
      .replace(/[^\d+]/g, "");

    if (cleaned.startsWith("+33")) return cleaned.slice(1);
    if (cleaned.startsWith("33")) return cleaned;
    if (cleaned.startsWith("0")) return `33${cleaned.slice(1)}`;
    return cleaned.replace(/^\+/, "");
  }

  function handleSendMessage() {
    const selectedContact =
      sendableContacts.find((contact) => contact.id === selectedSendContactId) ||
      sendableContacts[0];

    if (!selectedContact?.phone) {
      window.alert("Ajoute d'abord un numéro de contact dans Configurer.");
      return;
    }

    const message = (text || "").trim();

    if (!message) {
      window.alert("Aucun message à envoyer.");
      return;
    }

    if (sendMode === "whatsapp") {
      const phone = normalizeWhatsAppPhone(selectedContact.phone);
      const appUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.location.href = appUrl;
      window.setTimeout(() => {
        window.open(webUrl, "_blank", "noopener,noreferrer");
      }, 1200);
      return;
    }

    const smsUrl = `sms:${selectedContact.phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  }

  function handleConfirmDeleteProfile() {
    deleteCurrentProfile();
    setShowDeleteConfirm(false);
  }

  function updateCustomThemeField(field, value) {
    updateCurrentProfileField("customTheme", {
      ...(currentProfile.customTheme || {}),
      [field]: value,
    });
  }

  const themeOptionStyle = (mode) =>
    currentProfile.themeMode === mode
      ? styles.primaryButton
      : styles.secondaryButton;
  const compactThemeOptionStyle = (mode): CSSProperties => ({
    ...themeOptionStyle(mode),
    minWidth: 0,
    minHeight: 56,
    padding: "9px 8px",
    borderRadius: 16,
    fontSize: 16,
    lineHeight: 1.1,
    whiteSpace: "normal",
  });
  const virtualKeyboardActionStyle = (baseStyle: CSSProperties): CSSProperties => ({
    ...baseStyle,
    height: virtualKeyboardActionSize,
    minHeight: virtualKeyboardActionSize,
    padding: virtualKeyboardActionPadding,
    borderRadius: isCompactLayout ? 14 : 18,
    lineHeight: 1.1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });

  if (page === "profil") {
    const compactViewportWidth = isCompactLayout
      ? "calc(100vw - 52px)"
      : "100%";
    const caregiverPanelWidth = "100%";
    const caregiverControlsWidth = "100%";
    const compactCard = createCompactCardStyle(styles.card, {
      marginBottom: 20,
      minWidth: 0,
      maxWidth: "100%",
      overflow: "hidden",
    });
    const caregiverCardStyle: CSSProperties = {
      ...compactCard,
      width: compactViewportWidth,
      maxWidth: compactViewportWidth,
      inlineSize: compactViewportWidth,
      maxInlineSize: compactViewportWidth,
      justifySelf: "start",
      boxSizing: "border-box",
      minWidth: 0,
      overflow: "hidden",
    };
    const configContentGrid: CSSProperties = {
      display: "grid",
      gridTemplateColumns: isCompactLayout
        ? "minmax(0, max-content)"
        : "repeat(auto-fit, minmax(min(390px, 100%), 1fr))",
      gap: 20,
      alignItems: "start",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
    };
    const activeConfigSection =
      CONFIG_SECTIONS.find((section) => section.id === configSection) ||
      CONFIG_SECTIONS[0];
    const configSectionMenuStyle: CSSProperties = {
      ...styles.card,
      padding: 12,
      marginBottom: 16,
      borderRadius: 18,
      boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
    };
    const configSectionSelectWrapStyle: CSSProperties = {
      position: "relative",
      marginTop: 8,
    };
    const configSectionSelectStyle: CSSProperties = {
      ...styles.input,
      minHeight: 50,
      marginTop: 0,
      padding: "10px 42px 10px 12px",
      borderRadius: 14,
      fontWeight: 800,
      appearance: "none",
      WebkitAppearance: "none",
    };
    const caregiverPanelStyle: CSSProperties = {
      display: "grid",
      gap: 12,
      padding: 12,
      justifyItems: "stretch",
      borderRadius: 18,
      border: `1px solid ${styles.input.borderColor || "rgba(148, 163, 184, 0.32)"}`,
      background: "rgba(15, 23, 42, 0.20)",
      boxSizing: "border-box",
      width: caregiverPanelWidth,
      maxWidth: caregiverPanelWidth,
      inlineSize: caregiverPanelWidth,
      maxInlineSize: caregiverPanelWidth,
      minWidth: 0,
      overflow: "hidden",
    };
    const caregiverHeaderStyle: CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      minWidth: 0,
      maxWidth: "100%",
      overflow: "hidden",
    };
    const caregiverFieldGroupStyle: CSSProperties = {
      ...styles.formGroup,
      marginBottom: 0,
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
      boxSizing: "border-box",
    };
    const caregiverToggleStyle: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 999,
      border: `1px solid ${styles.input.borderColor || "rgba(148, 163, 184, 0.32)"}`,
      background: styles.input.background || "rgba(15, 23, 42, 0.55)",
      fontSize: 13,
      fontWeight: 800,
      lineHeight: 1,
    };
    const caregiverLinkBoxStyle: CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      padding: "6px 6px 6px 10px",
      borderRadius: 14,
      border: styles.input.border,
      background: styles.input.background,
      color: styles.input.color,
      boxSizing: "border-box",
      width: caregiverControlsWidth,
      maxWidth: caregiverControlsWidth,
      inlineSize: caregiverControlsWidth,
      maxInlineSize: caregiverControlsWidth,
      minWidth: 0,
      overflow: "hidden",
    };
    const caregiverLinkTextStyle: CSSProperties = {
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      display: "block",
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.2,
    };
    const caregiverActionGridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: "40px minmax(0, 1fr) 40px",
      gap: 6,
      alignItems: "stretch",
      minWidth: 0,
      width: caregiverControlsWidth,
      maxWidth: caregiverControlsWidth,
      inlineSize: caregiverControlsWidth,
      maxInlineSize: caregiverControlsWidth,
      overflow: "hidden",
      boxSizing: "border-box",
    };
    const compactCaregiverButtonStyle: CSSProperties = {
      ...styles.secondaryButton,
      width: "100%",
      minHeight: 40,
      padding: "8px 10px",
      borderRadius: 14,
      fontSize: 14,
      lineHeight: 1.1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      textDecoration: "none",
      boxSizing: "border-box",
      minWidth: 0,
      maxWidth: "100%",
      overflow: "hidden",
      whiteSpace: "normal",
    };
    const caregiverIconButtonStyle: CSSProperties = {
      ...compactCaregiverButtonStyle,
      minHeight: 40,
      padding: 0,
      borderRadius: 12,
      fontSize: 18,
      lineHeight: 1,
      whiteSpace: "nowrap",
    };
    const caregiverModeButtonStyle: CSSProperties = {
      ...compactCaregiverButtonStyle,
      minHeight: 40,
      padding: "8px 8px",
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 800,
      whiteSpace: "nowrap",
    };
    const primaryCaregiverButtonStyle: CSSProperties = {
      ...styles.primaryButton,
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      minHeight: 44,
      padding: "10px 12px",
      borderRadius: 16,
      fontSize: 16,
      lineHeight: 1.1,
      boxSizing: "border-box",
    };
    const securityPrimaryButtonStyle: CSSProperties = {
      ...styles.primaryButton,
      width: "100%",
      minHeight: 48,
      padding: "10px 12px",
      borderRadius: 16,
      fontSize: 18,
      lineHeight: 1.1,
      boxSizing: "border-box",
    };
    const securityActionGridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 10,
      alignItems: "stretch",
      width: "100%",
      minWidth: 0,
    };
    const securityActionButtonStyle: CSSProperties = {
      ...styles.secondaryButton,
      width: "100%",
      minHeight: 46,
      padding: "10px 12px",
      borderRadius: 16,
      fontSize: 16,
      lineHeight: 1.1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      boxSizing: "border-box",
    };
    const profileActionGridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns:
        "minmax(0, 1.12fr) minmax(0, 0.9fr) minmax(0, 1.08fr)",
      gap: 10,
      alignItems: "stretch",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
    };
    const profileActionButtonStyle: CSSProperties = {
      ...styles.secondaryButton,
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      minHeight: 56,
      padding: "10px 10px",
      borderRadius: 18,
      fontSize: 16,
      fontWeight: 800,
      lineHeight: 1.1,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
    const profilePrimaryActionButtonStyle: CSSProperties = {
      ...profileActionButtonStyle,
      ...styles.primaryButton,
      borderRadius: 18,
      padding: "10px 10px",
    };
    const profileDeleteActionButtonStyle: CSSProperties = {
      ...profileActionButtonStyle,
      ...styles.deleteButton,
      minHeight: 56,
      padding: "10px 10px",
      borderRadius: 18,
      fontSize: 15,
      border: styles.deleteButton.border,
    };

    if (privacyStatus?.passwordProtected && privacyStatus?.locked) {
      return (
        <div style={styles.gridSingle}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Données médicales verrouillées</h2>

            <div style={{ ...styles.infoBox, marginBottom: 14, lineHeight: 1.55 }}>
              Les informations médicales et d'identité de ce profil sont protégées
              par un mot de passe local. Le mot de passe n'est pas stocké.
            </div>

            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              <label style={styles.label}>Mot de passe local</label>
              <input
                type="password"
                value={privacyUnlockPassword}
                onChange={(e) => setPrivacyUnlockPassword(e.target.value)}
                style={styles.input}
                placeholder="Déverrouiller les données médicales"
              />

              <button
                type="button"
                style={styles.primaryButton}
                onClick={handleUnlockPrivateData}
                disabled={privacyActionLoading || !privacyUnlockPassword}
              >
                {privacyActionLoading ? "Déverrouillage..." : "Déverrouiller"}
              </button>

              {privacyActionMessage ? (
                <div
                  style={{
                    ...styles.infoBox,
                    color:
                      privacyActionMessage.toLowerCase().includes("incorrect") ||
                      privacyActionMessage.toLowerCase().includes("impossible")
                        ? "#fecaca"
                        : undefined,
                  }}
                >
                  {privacyActionMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div style={configSectionMenuStyle}>
          <label style={styles.label} htmlFor="profile-config-section">
            Rubrique du profil
          </label>
          <div style={configSectionSelectWrapStyle}>
            <select
              id="profile-config-section"
              value={activeConfigSection.id}
              onChange={(event) => setConfigSection(event.target.value)}
              style={configSectionSelectStyle}
              aria-label="Choisir une rubrique du profil"
            >
              {CONFIG_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: 16,
                fontWeight: 900,
                opacity: 0.72,
              }}
            >
              ▾
            </span>
          </div>
        </div>

        <div
          style={{
            ...configContentGrid,
          }}
        >
        {configSection === "identite" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Profil utilisateur</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Photo de profil</label>

            {currentProfile.profilePhoto ? (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={currentProfile.profilePhoto}
                  alt="Photo du profil"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 18,
                    border: "2px solid rgba(255,255,255,0.12)",
                  }}
                />
              </div>
            ) : null}

            <div style={styles.inlineButtons}>
              <label style={styles.importLabel}>
                Choisir une photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={updateProfilePhoto}
                  style={{ display: "none" }}
                />
              </label>

              {currentProfile.profilePhoto ? (
                <button
                  style={styles.deleteButton}
                  onClick={removeProfilePhoto}
                >
                  Supprimer la photo
                </button>
              ) : null}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom du profil</label>
              <input
                value={currentProfile.name}
                onChange={(e) =>
                  updateCurrentProfileField("name", e.target.value)
                }
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Prénom</label>
              <input
                value={currentProfile.firstName || ""}
                onChange={(e) =>
                  updateCurrentProfileField("firstName", e.target.value)
                }
                style={styles.input}
                placeholder="Ex : Lina"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom de famille</label>
              <input
                value={currentProfile.lastName || ""}
                onChange={(e) =>
                  updateCurrentProfileField("lastName", e.target.value)
                }
                style={styles.input}
                placeholder="Ex : Martin"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Date de naissance</label>
              <input
                type="date"
                value={currentProfile.birthDate || ""}
                onChange={(e) =>
                  updateCurrentProfileField("birthDate", e.target.value)
                }
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Adresse</label>
            <textarea
              value={currentProfile.address || ""}
              onChange={(e) =>
                updateCurrentProfileField("address", e.target.value)
              }
              style={styles.smallTextarea}
              placeholder="Adresse complète"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Langue</label>
            <input
              value={currentProfile.language}
              onChange={(e) =>
                updateCurrentProfileField("language", e.target.value)
              }
              style={styles.input}
              placeholder="fr-FR"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Besoins principaux</label>
            <textarea
              value={currentProfile.mainNeeds}
              onChange={(e) =>
                updateCurrentProfileField("mainNeeds", e.target.value)
              }
              style={styles.smallTextarea}
              placeholder="Ex : eau, douleur, toilette, repos..."
            />
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Thème visuel</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Choisir un thème</label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "dark")}
                style={compactThemeOptionStyle("dark")}
              >
                🌙 Sombre
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "light")}
                style={compactThemeOptionStyle("light")}
              >
                ☀️ Clair
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCurrentProfileField("themeMode", "colorful")
                }
                style={compactThemeOptionStyle("colorful")}
              >
                🎨 Coloré
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "custom")}
                style={compactThemeOptionStyle("custom")}
              >
                🛠️ Personnalisé
              </button>
            </div>
          </div>

          {currentProfile.themeMode === "custom" ? (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fond de page</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.pageBackground || "#111827"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("pageBackground", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fond des cartes</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.cardBackground || "#0f172a"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("cardBackground", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Texte principal</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.textColor || "#e5eefc"}
                    onChange={(e) =>
                      updateCustomThemeField("textColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Titres</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.titleColor || "#f8fafc"}
                    onChange={(e) =>
                      updateCustomThemeField("titleColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Sous-titres</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.subtitleColor || "#94a3b8"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("subtitleColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fond des champs</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.inputBackground || "#0a1020"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("inputBackground", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Contour des champs</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.inputBorder || "#334155"}
                    onChange={(e) =>
                      updateCustomThemeField("inputBorder", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Bouton principal</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.primaryButtonBackground ||
                      "#2563eb"
                    }
                    onChange={(e) =>
                      updateCustomThemeField(
                        "primaryButtonBackground",
                        e.target.value
                      )
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Bouton secondaire</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.secondaryButtonBackground ||
                      "#1e293b"
                    }
                    onChange={(e) =>
                      updateCustomThemeField(
                        "secondaryButtonBackground",
                        e.target.value
                      )
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Texte bouton secondaire</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.secondaryButtonText ||
                      "#e2e8f0"
                    }
                    onChange={(e) =>
                      updateCustomThemeField(
                        "secondaryButtonText",
                        e.target.value
                      )
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Couleur d'accent</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.accentColor || "#3b82f6"}
                    onChange={(e) =>
                      updateCustomThemeField("accentColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        </>
        ) : null}

        {configSection === "sante" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Santé</h2>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Groupe sanguin</label>
              <input
                value={currentProfile.medicalInfo?.bloodType || ""}
                onChange={(e) =>
                  updateNestedProfileField(
                    "medicalInfo",
                    "bloodType",
                    e.target.value
                  )
                }
                style={styles.input}
                placeholder="Ex : O+"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Allergies</label>
              <input
                value={currentProfile.medicalInfo?.allergies || ""}
                onChange={(e) =>
                  updateNestedProfileField(
                    "medicalInfo",
                    "allergies",
                    e.target.value
                  )
                }
                style={styles.input}
                placeholder="Ex : pénicilline, arachides"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Antécédents médicaux importants</label>
            <textarea
              value={currentProfile.medicalInfo?.medicalHistory || ""}
              onChange={(e) =>
                updateNestedProfileField(
                  "medicalInfo",
                  "medicalHistory",
                  e.target.value
                )
              }
              style={styles.smallTextarea}
              placeholder="Ex : AVC, diabète, épilepsie..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Handicap / condition particulière
            </label>
            <textarea
              value={currentProfile.medicalInfo?.condition || ""}
              onChange={(e) =>
                updateNestedProfileField(
                  "medicalInfo",
                  "condition",
                  e.target.value
                )
              }
              style={styles.smallTextarea}
              placeholder="Ex : non verbal, autisme, malentendant..."
            />
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Traitements en cours</h2>

          <div style={styles.customCategoryList}>
            {(currentProfile.medicalInfo?.treatments || []).map((treatment) => (
              <div key={treatment.id} style={styles.categoryManagerBox}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <input
                    value={treatment.name}
                    onChange={(e) =>
                      updateTreatment(treatment.id, "name", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Nom du traitement"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Dosage</label>
                  <input
                    value={treatment.dosage}
                    onChange={(e) =>
                      updateTreatment(treatment.id, "dosage", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Ex : 500 mg"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fréquence</label>
                  <input
                    value={treatment.frequency}
                    onChange={(e) =>
                      updateTreatment(treatment.id, "frequency", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Ex : matin et soir"
                  />
                </div>

                <button
                  style={styles.deleteButton}
                  onClick={() => deleteTreatment(treatment.id)}
                >
                  Supprimer ce traitement
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button style={styles.primaryButton} onClick={addTreatment}>
              Ajouter un traitement
            </button>
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Médecin traitant</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nom</label>
            <input
              value={currentProfile.doctorInfo?.name || ""}
              onChange={(e) =>
                updateNestedProfileField("doctorInfo", "name", e.target.value)
              }
              style={styles.input}
              placeholder="Nom du médecin"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Téléphone</label>
            <input
              value={currentProfile.doctorInfo?.phone || ""}
              onChange={(e) =>
                updateNestedProfileField("doctorInfo", "phone", e.target.value)
              }
              style={styles.input}
              placeholder="06 00 00 00 00"
            />
          </div>
        </div>

        </>
        ) : null}

        {configSection === "contacts" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Contacts</h2>

          <div style={styles.customCategoryList}>
            {emergencyContacts.map((contact, index) => (
              <div key={contact.id} style={styles.categoryManagerBox}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <input
                    value={contact.name}
                    onChange={(e) =>
                      updateEmergencyContact(contact.id, "name", e.target.value)
                    }
                    style={styles.input}
                    placeholder={`Contact ${index + 1}`}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Téléphone</label>
                  <input
                    value={contact.phone}
                    onChange={(e) =>
                      updateEmergencyContact(
                        contact.id,
                        "phone",
                        sanitizePhoneInput(e.target.value)
                      )
                    }
                    onBlur={(e) =>
                      updateEmergencyContact(
                        contact.id,
                        "phone",
                        formatPhoneForStorage(e.target.value)
                      )
                    }
                    style={styles.input}
                    placeholder="+33600000000"
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      color: "rgba(255,255,255,0.62)",
                    }}
                  >
                    Format forcé : +33 pour les numéros français.
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Privilège / rôle</label>
                  <input
                    value={contact.relation}
                    onChange={(e) =>
                      updateEmergencyContact(
                        contact.id,
                        "relation",
                        e.target.value
                      )
                    }
                    style={styles.input}
                    placeholder="Maman, médecin, voisin..."
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <button
                    style={styles.deleteButton}
                    onClick={() => deleteEmergencyContact(contact.id)}
                  >
                    Supprimer ce contact
                  </button>

                  <select
                    value={getContactUsage(contact)}
                    onChange={(e) =>
                      updateEmergencyContact(contact.id, "usage", e.target.value)
                    }
                    style={{
                      ...styles.input,
                      minWidth: 180,
                      maxWidth: 220,
                    }}
                  >
                    <option value="contact">Contact</option>
                    <option value="urgence">Urgence</option>
                    <option value="both">Les deux</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button style={styles.primaryButton} onClick={addEmergencyContact}>
              Ajouter un contact
            </button>
          </div>
        </div>

        </>
        ) : null}

        {configSection === "phrases" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Phrases rapides</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Texte de la phrase</label>
            <textarea
              value={text}
              onChange={(e) => setText(formatTextSmart(e.target.value))}
              style={styles.smallTextarea}
              placeholder="Ex : J'ai besoin d'eau"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Libellé du bouton</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={styles.input}
                placeholder="Ex : Besoin d'eau"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.input}
              >
                {(categories || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            style={styles.primaryButton}
            onClick={savePhrase}
            disabled={!String(text || "").trim()}
          >
            Enregistrer la phrase
          </button>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Catégories personnalisées</h2>

          <div style={styles.categoryManagerBox}>
            <h3 style={styles.managerTitle}>Ajouter une catégorie</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nom de la catégorie</label>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={styles.input}
                placeholder="Ex : Loisirs, Travail, Douleur"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Choisir une icône</label>
              <div style={styles.iconPickerGrid}>
                {(AVAILABLE_ICONS || []).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCategoryIcon(icon)}
                    style={
                      newCategoryIcon === icon
                        ? {
                            ...styles.iconButton,
                            ...styles.iconButtonActive,
                          }
                        : styles.iconButton
                    }
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <button style={styles.primaryButton} onClick={addCategory}>
              Ajouter la catégorie
            </button>

            <div style={styles.customCategoryList}>
              {(customCategories || []).map((cat) => (
                <div key={cat.name} style={styles.customCategoryItem}>
                  <div style={styles.customCategoryInfo}>
                    <span style={styles.customCategoryIcon}>{cat.icon}</span>
                    <span style={styles.customCategoryName}>{cat.name}</span>
                  </div>

                  <button
                    style={styles.deleteButton}
                    onClick={() => deleteCategory(cat.name)}
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        </>
        ) : null}

        {configSection === "securite" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Données administratives sensibles</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Numéro de sécurité sociale</label>
            <input
              value={currentProfile.socialSecurityNumber || ""}
              onChange={(e) =>
                updateCurrentProfileField(
                  "socialSecurityNumber",
                  e.target.value
                )
              }
              style={styles.input}
              placeholder="Ex : 1 86 05 75 123 456 78"
            />
          </div>
        </div>

        <div style={caregiverCardStyle}>
          <h2 style={styles.sectionTitle}>Téléphone aidant</h2>

          <div style={{ ...styles.infoBox, marginBottom: 14, lineHeight: 1.55 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              À quoi ça sert ?
            </strong>
            Ça sert à choisir quel téléphone aidant reçoit l'alerte quand la
            personne appuie sur la cloche orange. Crée un lien pour chaque
            aidant, ouvre ce lien sur son téléphone, puis coche les aidants
            disponibles dans <strong>Appel aidant</strong>. Ensuite, choisis
            ici l'aidant à prévenir.
          </div>

          {availableCaregiverAlertLinks.length > 0 ? (
            <div style={{ ...styles.formGroup, marginBottom: 14 }}>
              <label style={styles.label}>Aidant appelé par la cloche</label>
              <select
                value={selectedCaregiverAlertLink?.id || ""}
                onChange={(event) =>
                  selectCaregiverAlertTarget?.(event.target.value)
                }
                disabled={availableCaregiverAlertLinks.length <= 1}
                style={styles.input}
              >
                {availableCaregiverAlertLinks.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.name || "Aidant"}
                  </option>
                ))}
              </select>
              <div
                style={{
                  ...styles.infoBox,
                  marginTop: 10,
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                Le bouton Appel aidant enverra l'alarme uniquement à cet
                aidant.
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gap: 12,
              minWidth: 0,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {caregiverAlertLinks.map((link, index) => (
              <div
                key={link.id}
                style={caregiverPanelStyle}
              >
                <div style={caregiverHeaderStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...styles.label, margin: 0 }}>
                      Aidant {index + 1}
                    </div>
                    <div style={{ ...styles.text, fontSize: 13, opacity: 0.72 }}>
                      {link.name || `Aidant ${index + 1}`}
                    </div>
                  </div>

                  <label
                    style={caregiverToggleStyle}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(link.enabled)}
                      onChange={(e) =>
                        updateCaregiverAlertLink?.(link.id, {
                          enabled: e.target.checked,
                        })
                      }
                    />
                    Disponible
                  </label>
                </div>

                <div style={caregiverFieldGroupStyle}>
                  <label style={styles.label}>Nom de l'aidant</label>
                  <input
                    value={link.name || ""}
                    onChange={(e) =>
                      updateCaregiverAlertLink?.(link.id, {
                        name: e.target.value,
                      })
                    }
                    style={{
                      ...styles.input,
                      width: caregiverControlsWidth,
                      maxWidth: caregiverControlsWidth,
                      inlineSize: caregiverControlsWidth,
                      maxInlineSize: caregiverControlsWidth,
                      minWidth: 0,
                    }}
                    placeholder={`Aidant ${index + 1}`}
                  />
                </div>

                <div style={caregiverFieldGroupStyle}>
                  <label style={styles.label}>Lien d'alarme</label>
                  <div style={caregiverLinkBoxStyle}>
                    <span
                      title={link.alertLink || ""}
                      style={{
                        ...caregiverLinkTextStyle,
                        opacity: link.alertLink ? 1 : 0.62,
                      }}
                    >
                      {link.alertLink || "Lien indisponible"}
                    </span>
                  </div>
                </div>

                <div style={caregiverActionGridStyle}>
                  <button
                    type="button"
                    aria-label="Copier le lien"
                    title="Copier le lien"
                    style={{ ...caregiverIconButtonStyle, gridColumn: 1 }}
                    onClick={() => copyCaregiverAlertLink?.(link.id)}
                  >
                    📋
                  </button>

                  {link.alertLink ? (
                    <a
                      href={link.alertLink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Ouvrir le mode aidant"
                      title="Ouvrir le mode aidant"
                      style={{
                        ...caregiverModeButtonStyle,
                        gridColumn: 2,
                      }}
                    >
                      Mode aidant
                    </a>
                  ) : null}

                  {link.appLink ? (
                    <a
                      href={link.appLink}
                      aria-label="Ouvrir l'application aidant"
                      title="Ouvrir l'application aidant"
                      style={{
                        ...caregiverModeButtonStyle,
                        gridColumn: "1 / -1",
                      }}
                    >
                      App aidant
                    </a>
                  ) : null}

                  <button
                    type="button"
                    aria-label="Supprimer l'aidant"
                    title="Supprimer l'aidant"
                    style={{
                      ...caregiverIconButtonStyle,
                      gridColumn: 3,
                      opacity: caregiverAlertLinks.length <= 1 ? 0.55 : 1,
                      cursor:
                        caregiverAlertLinks.length <= 1
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={caregiverAlertLinks.length <= 1}
                    onClick={() => deleteCaregiverAlertLink?.(link.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(74px, 0.34fr)",
              gap: 10,
              marginTop: 14,
              alignItems: "stretch",
              width: caregiverPanelWidth,
              maxWidth: caregiverPanelWidth,
              inlineSize: caregiverPanelWidth,
              maxInlineSize: caregiverPanelWidth,
              minWidth: 0,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              style={primaryCaregiverButtonStyle}
              onClick={addCaregiverAlertLink}
            >
              Ajouter un aidant
            </button>

            <button
              type="button"
              style={{
                ...compactCaregiverButtonStyle,
                minHeight: 44,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
              }}
              onClick={() => openNoticeSection?.("aidant")}
            >
              Aide
            </button>
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Profils</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Choisir un profil</label>
            <select
              value={currentProfileId}
              onChange={(e) => {
                setCurrentProfileId(e.target.value);
                setFilter("Toutes");
                setCategory("Général");
              }}
              style={styles.input}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <div style={profileActionGridStyle}>
            <button
              type="button"
              style={profilePrimaryActionButtonStyle}
              onClick={createNewProfile}
            >
              Ajouter un profil
            </button>

            <button
              type="button"
              style={profileActionButtonStyle}
              onClick={duplicateCurrentProfile}
            >
              Dupliquer
            </button>

            <button
              type="button"
              style={profileDeleteActionButtonStyle}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Supprimer ce profil
            </button>
          </div>

          <div style={{ height: 20 }} />

          <div style={styles.categoryManagerBox}>
            <h3 style={styles.managerTitle}>Sauvegarde</h3>

            <div
              style={{
                ...styles.infoBox,
                marginBottom: 14,
                lineHeight: 1.55,
              }}
            >
              <strong>Confidentialité locale</strong>
              <br />
              {!privacyStatus?.privateDataLoaded
                ? "Chargement des données médicales protégées..."
                : privacyStatus?.passwordProtected
                ? "Les données médicales sont verrouillées par un mot de passe local non stocké."
                : privacyStatus?.protectedAtRest
                ? "Les données médicales et d'identité sont chiffrées dans le stockage local de cet appareil."
                : "Les données sont enregistrées localement, mais le chiffrement du navigateur n'est pas disponible."}
              {privacyStatus?.error ? (
                <div style={{ marginTop: 8, color: "#fecaca", fontWeight: 700 }}>
                  {privacyStatus.error}
                </div>
              ) : null}
              <div style={{ marginTop: 8, opacity: 0.78 }}>
                Les exports JSON restent lisibles et doivent être partagés avec prudence.
              </div>
              {privacyStatus?.passwordProtected ? (
                <div style={{ marginTop: 8, opacity: 0.78 }}>
                  Si le mot de passe est perdu, les données médicales locales ne pourront pas être récupérées.
                </div>
              ) : null}
            </div>

            {privacyStatus?.passwordProtected && privacyStatus?.locked ? (
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <label style={styles.label}>Mot de passe local</label>
                <input
                  type="password"
                  value={privacyUnlockPassword}
                  onChange={(e) => setPrivacyUnlockPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Déverrouiller les données médicales"
                />
                <button
                  type="button"
                  style={securityPrimaryButtonStyle}
                  onClick={handleUnlockPrivateData}
                  disabled={privacyActionLoading || !privacyUnlockPassword}
                >
                  {privacyActionLoading ? "Déverrouillage..." : "Déverrouiller"}
                </button>
              </div>
            ) : null}

            {!privacyStatus?.passwordProtected && privacyStatus?.privateDataLoaded ? (
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <label style={styles.label}>Ajouter un mot de passe local</label>
                <input
                  type="password"
                  value={privacyPassword}
                  onChange={(e) => setPrivacyPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Minimum 8 caractères"
                />
                <input
                  type="password"
                  value={privacyPasswordConfirm}
                  onChange={(e) => setPrivacyPasswordConfirm(e.target.value)}
                  style={styles.input}
                  placeholder="Confirmer le mot de passe"
                />
                <button
                  type="button"
                  style={securityPrimaryButtonStyle}
                  onClick={handleEnablePrivacyPassword}
                  disabled={
                    privacyActionLoading ||
                    !privacyPassword ||
                    !privacyPasswordConfirm
                  }
                >
                  {privacyActionLoading ? "Activation..." : "Activer le verrou"}
                </button>
              </div>
            ) : null}

            {privacyStatus?.passwordProtected && privacyStatus?.privateDataLoaded ? (
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  style={securityActionButtonStyle}
                  onClick={() => {
                    lockPrivateData?.();
                    setPrivacyActionMessage("Données médicales verrouillées.");
                  }}
                >
                  Verrouiller maintenant
                </button>
              </div>
            ) : null}

            {privacyActionMessage ? (
              <div
                style={{
                  ...styles.infoBox,
                  marginBottom: 14,
                  color:
                    privacyActionMessage.toLowerCase().includes("impossible") ||
                    privacyActionMessage.toLowerCase().includes("incorrect") ||
                    privacyActionMessage.toLowerCase().includes("correspondent")
                      ? "#fecaca"
                      : undefined,
                }}
              >
                {privacyActionMessage}
              </div>
            ) : null}

            <div style={securityActionGridStyle}>
              <button
                type="button"
                style={securityActionButtonStyle}
                onClick={exportCurrentProfile}
              >
                Exporter ce profil
              </button>

              <label style={{ ...securityActionButtonStyle, cursor: "pointer" }}>
                Importer un profil
                <input
                  type="file"
                  accept="application/json"
                  onChange={importCurrentProfile}
                  style={{ display: "none" }}
                />
              </label>

              <button
                type="button"
                style={securityActionButtonStyle}
                onClick={exportAllProfiles}
              >
                Exporter tous les profils
              </button>

              <label style={{ ...securityActionButtonStyle, cursor: "pointer" }}>
                Importer tous les profils
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={importAllProfiles}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        </div>

        </>
        ) : null}

        {showDeleteConfirm ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-profile-title"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 6, 23, 0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 1000,
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              style={{
                ...styles.card,
                width: "100%",
                maxWidth: 520,
                padding: 24,
                borderRadius: 22,
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="delete-profile-title"
                style={{ ...styles.sectionTitle, marginBottom: 12 }}
              >
                Supprimer ce profil
              </h2>

              <p style={{ ...styles.text, marginBottom: 12 }}>
                Êtes-vous sûr de vouloir supprimer ce profil ?
              </p>

              <p
                style={{
                  ...styles.text,
                  color: "#fca5a5",
                  fontWeight: 700,
                  marginBottom: 20,
                }}
              >
                Cette action est irréversible. Les informations de ce profil seront supprimées.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  style={styles.deleteButton}
                  onClick={handleConfirmDeleteProfile}
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      </>
    );
  }

  if (page === "reglages") {
    return (
      <div style={styles.gridSingle}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Parler maintenant</h2>

          <div style={styles.formGroup}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 1180 ? "minmax(0, 1fr) 320px" : "1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div>
                <label style={styles.label}>Texte à dire</label>

                <textarea
                  ref={standardTextAreaRef}
                  value={text}
                  onChange={(e) => handleTextAreaChange(e.target.value)}
                  style={styles.textarea}
                  placeholder="Écrire ici..."
                />

                <div
                  style={{
                    marginTop: isCompactLayout ? 8 : 12,
                    display: "grid",
                    gridTemplateColumns:
                      window.innerWidth > 900
                        ? "repeat(4, minmax(0, 1fr))"
                        : isCompactLayout
                          ? "repeat(4, minmax(0, 1fr))"
                          : "1fr",
                    gap: isCompactLayout ? 6 : 12,
                  }}
                >
                  <button
                    aria-label={
                      isVirtualKeyboardOpen
                        ? "Masquer le clavier virtuel"
                        : "Afficher le clavier virtuel"
                    }
                    title={
                      isVirtualKeyboardOpen
                        ? "Masquer le clavier virtuel"
                        : "Afficher le clavier virtuel"
                    }
                    style={{
                      ...virtualKeyboardActionStyle(isVirtualKeyboardOpen
                        ? styles.primaryButton
                        : styles.secondaryButton),
                    }}
                    onClick={() => {
                      setIsVirtualKeyboardOpen((prev) => !prev);
                      focusStandardTextArea();
                    }}
                  >
                    <ActionIcon name="keyboard" size={virtualKeyboardActionIconSize} />
                  </button>

                  <button
                    aria-label={isListening ? "Arrêter la dictée" : "Dicter"}
                    title={isListening ? "Arrêter la dictée" : "Dicter"}
                    style={{
                      ...virtualKeyboardActionStyle(isListening
                        ? styles.recordingButton
                        : styles.primaryButton),
                    }}
                    onClick={isListening ? stopDictation : startDictation}
                  >
                    <ActionIcon
                      name={isListening ? "recordStop" : "microphone"}
                      size={virtualKeyboardActionIconSize}
                    />
                  </button>

                  <button
                    aria-label="Écouter"
                    title="Écouter"
                    style={{
                      ...virtualKeyboardActionStyle(styles.secondaryButton),
                    }}
                    onClick={() => speakText(text)}
                  >
                    <ActionIcon name="listen" size={virtualKeyboardActionIconSize} />
                  </button>

                  <button
                    aria-label="Stop voix"
                    title="Stop voix"
                    style={{
                      ...virtualKeyboardActionStyle(styles.secondaryButton),
                    }}
                    onClick={stopSpeaking}
                  >
                    <ActionIcon name="voiceStop" size={virtualKeyboardActionIconSize} />
                  </button>
                </div>

                {isVirtualKeyboardOpen ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: isCompactLayout ? 10 : 14,
                      borderRadius: 18,
                      background: styles.input.background || "rgba(15,23,42,0.62)",
                      border:
                        styles.input.border || "1px solid rgba(148,163,184,0.28)",
                      display: "grid",
                      gap: isCompactLayout ? 6 : 8,
                    }}
                  >
                    {VIRTUAL_KEYBOARD_ROWS.map((row, rowIndex) => (
                      <div
                        key={`keyboard-row-${rowIndex}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
                          gap: isCompactLayout ? 5 : 7,
                          width: "100%",
                        }}
                      >
                        {row.map((key, keyIndex) => {
                          const displayedKey = getVirtualKeyboardKeyValue(key);
                          const keyLabel = getVirtualKeyboardKeyLabel(
                            key,
                            displayedKey
                          );
                          const keyVariants = getVirtualKeyboardKeyVariants(key);
                          const numberLabel =
                            VIRTUAL_KEYBOARD_NUMBER_LABELS[key] || "";
                          const hasVariants = keyVariants.length > 0;
                          const isVariantMenuOpen =
                            virtualKeyboardVariantMenu?.key === key;
                          const isVariantMenuNearLeftEdge = keyIndex <= 1;
                          const isVariantMenuNearRightEdge =
                            keyIndex >= 8 || keyIndex >= row.length - 2;

                          return (
                            <div
                              key={`${rowIndex}-${key}`}
                              style={{
                                gridColumn:
                                  key === "Espace" ? "4 / span 4" : undefined,
                                minWidth: 0,
                                position: "relative",
                              }}
                            >
                              <button
                                type="button"
                                aria-label={
                                  key === "Maj"
                                    ? isVirtualKeyboardShiftActive
                                      ? "Désactiver les majuscules"
                                      : "Activer les majuscules"
                                    : key === "Retour"
                                      ? "Effacer une lettre"
                                      : key === "Mot"
                                        ? "Effacer le mot précédent"
                                        : key === "Entrée"
                                          ? "Insérer un retour à la ligne"
                                          : key === "Espace"
                                            ? "Insérer un espace"
                                            : hasVariants
                                              ? `Touche ${displayedKey}${
                                                  numberLabel
                                                    ? `, chiffre ${numberLabel}`
                                                    : ""
                                                }, appui long pour variantes`
                                              : `Touche ${displayedKey}`
                                }
                                title={
                                  key === "Maj"
                                    ? "Majuscules"
                                    : key === "Retour"
                                      ? "Effacer"
                                      : key === "Mot"
                                        ? "Effacer le mot précédent"
                                        : key === "Entrée"
                                          ? "Retour à la ligne"
                                          : key === "Espace"
                                            ? "Espace"
                                            : hasVariants
                                              ? `${displayedKey} - appui long`
                                              : displayedKey
                                }
                                style={{
                                  ...(key === "Maj" && isVirtualKeyboardShiftActive
                                    ? styles.primaryButton
                                    : styles.secondaryButton),
                                  width: "100%",
                                  minWidth: 0,
                                  minHeight: virtualKeyboardKeyMinHeight,
                                  padding: virtualKeyboardKeyPadding,
                                  borderRadius: 14,
                                  fontSize:
                                    key === "Maj" ||
                                    key === "Retour" ||
                                    key === "Mot" ||
                                    key === "Entrée" ||
                                    key === "Espace"
                                      ? 13
                                      : 16,
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  whiteSpace: "nowrap",
                                  position: "relative",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  touchAction: "manipulation",
                                }}
                                onPointerDown={() =>
                                  startVirtualKeyboardLongPress(key)
                                }
                                onPointerUp={cancelVirtualKeyboardLongPress}
                                onPointerLeave={cancelVirtualKeyboardLongPress}
                                onPointerCancel={cancelVirtualKeyboardLongPress}
                                onClick={() => handleVirtualKeyboardButtonClick(key)}
                              >
                                {numberLabel ? (
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      position: "absolute",
                                      top: isCompactLayout ? 4 : 5,
                                      right: isCompactLayout ? 6 : 8,
                                      fontSize: isCompactLayout ? 9 : 11,
                                      fontWeight: 950,
                                      lineHeight: 1,
                                      opacity: 0.95,
                                      pointerEvents: "none",
                                    }}
                                  >
                                    {numberLabel}
                                  </span>
                                ) : null}
                                <span style={{ pointerEvents: "none" }}>
                                  {keyLabel}
                                </span>
                              </button>

                              {isVariantMenuOpen ? (
                                <div
                                  role="menu"
                                  aria-label={`Variantes de ${displayedKey}`}
                                  style={{
                                    position: "absolute",
                                    left: isVariantMenuNearLeftEdge
                                      ? 0
                                      : isVariantMenuNearRightEdge
                                        ? undefined
                                        : "50%",
                                    right: isVariantMenuNearRightEdge
                                      ? 0
                                      : undefined,
                                    bottom: "calc(100% + 8px)",
                                    transform:
                                      isVariantMenuNearLeftEdge ||
                                      isVariantMenuNearRightEdge
                                        ? undefined
                                        : "translateX(-50%)",
                                    zIndex: 30,
                                    display: "grid",
                                    gridTemplateColumns: `repeat(4, ${virtualKeyboardVariantSize}px)`,
                                    gap: 6,
                                    padding: 6,
                                    borderRadius: 14,
                                    background:
                                      styles.card.background ||
                                      styles.input.background ||
                                      "rgba(15,23,42,0.96)",
                                    border:
                                      styles.input.border ||
                                      "1px solid rgba(148,163,184,0.38)",
                                    boxShadow: "0 14px 32px rgba(0,0,0,0.32)",
                                  }}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                  }}
                                >
                                  {keyVariants.map((variant) => (
                                    <button
                                      key={`${key}-${variant}`}
                                      type="button"
                                      role="menuitem"
                                      data-virtual-keyboard-variant={variant}
                                      aria-label={`Insérer ${variant}`}
                                      title={variant}
                                      style={{
                                        ...(virtualKeyboardHoveredVariant ===
                                        variant
                                          ? styles.primaryButton
                                          : styles.secondaryButton),
                                        width: virtualKeyboardVariantSize,
                                        minWidth: virtualKeyboardVariantSize,
                                        height: virtualKeyboardVariantSize,
                                        minHeight: virtualKeyboardVariantSize,
                                        padding: 0,
                                        borderRadius: 12,
                                        fontSize: 17,
                                        fontWeight: 900,
                                        lineHeight: 1,
                                      }}
                                      onPointerEnter={() =>
                                        setVirtualKeyboardHoveredVariantValue(
                                          variant
                                        )
                                      }
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        insertVirtualKeyboardVariant(variant);
                                      }}
                                    >
                                      {variant}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  position: "relative",
                  justifySelf: "end",
                  width: "100%",
                  maxWidth: 360,
                }}
              >
                <div
                  style={{
                    ...styles.card,
                    padding: 14,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Envoyer à</label>
                    <select
                      value={selectedSendContactId || ""}
                      onChange={(e) => setSelectedSendContactId(e.target.value)}
                      style={styles.input}
                      disabled={!sendableContacts.length}
                    >
                      {sendableContacts.length === 0 ? (
                        <option value="">Aucun contact disponible</option>
                      ) : (
                        sendableContacts.map((contact, index) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name || `Contact ${index + 1}`}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Mode d’envoi</label>
                    <select
                      value={sendMode}
                      onChange={(e) => setSendMode(e.target.value)}
                      style={styles.input}
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={handleSendMessage}
                    disabled={!sendableContacts.length}
                  >
                    📩 Envoyer à{" "}
                    {sendableContacts.find(
                      (contact) => contact.id === selectedSendContactId
                    )?.name || sendableContacts[0]?.name || "..."}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}

