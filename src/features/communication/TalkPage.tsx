import type { CSSProperties } from "react";

import React from "react";
import type {
  EmergencyContact,
  Profile,
  SpeakText,
  StateSetter,
  StyleMap,
} from "../../shared/types";
import { formatTextSmart } from "../dictionary/textFormatting";

const VIRTUAL_KEYBOARD_ROWS = [
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["Maj", "W", "X", "C", "V", "B", "N", "Retour", "Mot", "Entree"],
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

type ActionIconName =
  | "keyboard"
  | "microphone"
  | "recordStop"
  | "listen"
  | "voiceStop";
type SendMode = "sms" | "whatsapp";
type SuggestionHistory = Record<string, number>;

type TalkPageProps = {
  styles: StyleMap;
  currentProfile: Profile;
  currentProfileId: string;
  text: string;
  setText: StateSetter<string>;
  isListening: boolean;
  stopDictation: () => void;
  startDictation: () => void;
  speakText: SpeakText;
  stopSpeaking: () => void | Promise<void>;
  emergencyContacts: EmergencyContact[];
};

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
        <rect
          x="10.75"
          y="20"
          width="10.5"
          height="2.35"
          rx="1"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "microphone") {
    return (
      <svg {...commonProps} viewBox="0 0 24 24">
        <rect
          x="8.75"
          y="3.5"
          width="6.5"
          height="10"
          rx="3.25"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 11.5v.7a6.5 6.5 0 0 0 13 0v-.7M12 18.7V21M8.8 21h6.4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "recordStop") {
    return (
      <svg {...commonProps}>
        <circle
          cx="16"
          cy="16"
          r="11.25"
          stroke="currentColor"
          strokeWidth="2.2"
          opacity="0.65"
        />
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
        <path
          d="M12.4 12.2v7.6"
          stroke="currentColor"
          strokeWidth="1.55"
          opacity="0.6"
        />
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

function getContactUsage(contact: EmergencyContact) {
  return contact?.usage || "contact";
}

function normalizeWhatsAppPhone(rawPhone: string) {
  const cleaned = String(rawPhone || "")
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+33")) return cleaned.slice(1);
  if (cleaned.startsWith("33")) return cleaned;
  if (cleaned.startsWith("0")) return `33${cleaned.slice(1)}`;
  return cleaned.replace(/^\+/, "");
}

export default function TalkPage({
  styles,
  currentProfile,
  currentProfileId,
  text,
  setText,
  isListening,
  stopDictation,
  startDictation,
  speakText,
  stopSpeaking,
  emergencyContacts,
}: TalkPageProps) {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const isCompactLayout = viewportWidth <= 640;
  const standardTextAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const virtualKeyboardLongPressTimerRef = React.useRef<number | null>(null);
  const virtualKeyboardSuppressClickRef = React.useRef("");
  const virtualKeyboardHoveredVariantRef = React.useRef("");
  const virtualKeyboardActionSize = isCompactLayout ? 44 : 48;
  const virtualKeyboardActionPadding = isCompactLayout ? "8px 6px" : "10px 10px";
  const virtualKeyboardActionIconSize = isCompactLayout ? 23 : 27;
  const virtualKeyboardKeyMinHeight = isCompactLayout ? 48 : 52;
  const virtualKeyboardKeyPadding = isCompactLayout ? "8px 4px" : "10px 6px";
  const virtualKeyboardVariantSize = isCompactLayout ? 44 : 48;

  const [sendMode, setSendMode] = React.useState<SendMode>("sms");
  const [selectedSendContactId, setSelectedSendContactId] = React.useState(
    emergencyContacts?.[0]?.id || ""
  );
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = React.useState(false);
  const [isVirtualKeyboardShiftActive, setIsVirtualKeyboardShiftActive] =
    React.useState(false);
  const [virtualKeyboardVariantMenu, setVirtualKeyboardVariantMenu] =
    React.useState<{ key: string } | null>(null);
  const [virtualKeyboardHoveredVariant, setVirtualKeyboardHoveredVariant] =
    React.useState("");

  const sendableContacts = React.useMemo(
    () =>
      (emergencyContacts || []).filter(
        (contact) =>
          (contact.name || contact.phone) && getContactUsage(contact) !== "urgence"
      ),
    [emergencyContacts]
  );

  const profileHistoryStorageKey = React.useMemo(() => {
    const profileKey =
      currentProfileId ||
      currentProfile?.id ||
      currentProfile?.name ||
      "default";
    return `phraseSuggestionHistory:${profileKey}`;
  }, [currentProfileId, currentProfile?.id, currentProfile?.name]);

  const [, setSuggestionHistory] = React.useState<SuggestionHistory>({});

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(profileHistoryStorageKey);
      setSuggestionHistory(saved ? JSON.parse(saved) : {});
    } catch (error) {
      console.error("Impossible de lire l'historique :", error);
      setSuggestionHistory({});
    }
  }, [profileHistoryStorageKey]);

  function persistSuggestionHistory(nextHistory: SuggestionHistory) {
    try {
      window.localStorage.setItem(
        profileHistoryStorageKey,
        JSON.stringify(nextHistory)
      );
    } catch (error) {
      console.error("Impossible d'enregistrer l'historique :", error);
    }
  }

  function saveWordToHistory(word: string) {
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

  function rememberLastTypedWord(value: string) {
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

  function focusStandardTextArea(
    nextCursorStart: number | null = null,
    nextCursorEnd: number | null = null
  ) {
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

  function applyTextInput(
    nextValue: string,
    nextCursorStart: number | null = null,
    nextCursorEnd: number | null = null
  ) {
    setText(formatTextSmart(nextValue));
    focusStandardTextArea(nextCursorStart, nextCursorEnd);
  }

  function handleTextAreaChange(value: string) {
    setText(formatTextSmart(value));

    if (/\s$/.test(value)) {
      rememberLastTypedWord(value);
    }
  }

  function insertVirtualKeyboardText(value: string) {
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

  function isVirtualKeyboardLetter(key: string) {
    return /^[A-Z]$/.test(key);
  }

  function getVirtualKeyboardKeyValue(key: string) {
    if (!isVirtualKeyboardLetter(key)) {
      return key;
    }

    return isVirtualKeyboardShiftActive ? key : key.toLowerCase();
  }

  function getVirtualKeyboardKeyLabel(key: string, displayedKey: string) {
    if (key === "Retour") return "⌫";
    if (key === "Entree") return "↵";
    if (key === "Mot") return "Mot";
    return displayedKey;
  }

  function getVirtualKeyboardKeyVariants(key: string) {
    if (!isVirtualKeyboardLetter(key)) {
      return [];
    }

    const variants = VIRTUAL_KEYBOARD_VARIANTS[key] || [];

    return variants.map((variant) =>
      isVirtualKeyboardShiftActive ? variant.toUpperCase() : variant
    );
  }

  function getVirtualKeyboardVariantFromPoint(clientX: number, clientY: number) {
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

  function setVirtualKeyboardHoveredVariantValue(variant: string) {
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

  function startVirtualKeyboardLongPress(key: string) {
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

  function insertVirtualKeyboardVariant(variant: string) {
    virtualKeyboardSuppressClickRef.current = "";
    closeVirtualKeyboardVariantMenu();
    insertVirtualKeyboardText(variant);
  }

  function handleVirtualKeyboardKey(key: string) {
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

    if (key === "Entree") {
      insertVirtualKeyboardText("\n");
      return;
    }

    insertVirtualKeyboardText(getVirtualKeyboardKeyValue(key));
  }

  function handleVirtualKeyboardButtonClick(key: string) {
    cancelVirtualKeyboardLongPress();

    if (virtualKeyboardSuppressClickRef.current === key) {
      virtualKeyboardSuppressClickRef.current = "";
      return;
    }

    virtualKeyboardSuppressClickRef.current = "";
    handleVirtualKeyboardKey(key);
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

  const virtualKeyboardActionStyle = (
    baseStyle: CSSProperties
  ): CSSProperties => ({
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

    const activeVariantMenu = virtualKeyboardVariantMenu;

    function handleVariantPointerMove(event: PointerEvent) {
      const variant = getVirtualKeyboardVariantFromPoint(
        event.clientX,
        event.clientY
      );

      if (variant !== virtualKeyboardHoveredVariantRef.current) {
        setVirtualKeyboardHoveredVariantValue(variant);
      }
    }

    function handleVariantPointerUp(event: PointerEvent) {
      const variant =
        getVirtualKeyboardVariantFromPoint(event.clientX, event.clientY) ||
        virtualKeyboardHoveredVariantRef.current;

      virtualKeyboardSuppressClickRef.current = activeVariantMenu.key;

      if (variant) {
        insertVirtualKeyboardVariant(variant);
      } else {
        closeVirtualKeyboardVariantMenu();
        focusStandardTextArea();
      }

      event.preventDefault();
      event.stopPropagation();
    }

    function handleVariantPointerCancel(event: PointerEvent) {
      virtualKeyboardSuppressClickRef.current = activeVariantMenu.key;
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

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Parler maintenant</h2>

        <div style={styles.formGroup}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                viewportWidth > 1180 ? "minmax(0, 1fr) 320px" : "1fr",
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
                    viewportWidth > 900
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
                    ...virtualKeyboardActionStyle(
                      isVirtualKeyboardOpen
                        ? styles.primaryButton
                        : styles.secondaryButton
                    ),
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
                    ...virtualKeyboardActionStyle(
                      isListening ? styles.recordingButton : styles.primaryButton
                    ),
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
                                      : key === "Entree"
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
                                      : key === "Entree"
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
                                  key === "Entree" ||
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
                                      ...(virtualKeyboardHoveredVariant === variant
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
                  <label style={styles.label}>Mode d'envoi</label>
                  <select
                    value={sendMode}
                    onChange={(e) => setSendMode(e.target.value as SendMode)}
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
