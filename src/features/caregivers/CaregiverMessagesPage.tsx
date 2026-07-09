import React from "react";
import { API_BASE, getCaregiverNetworkErrorMessage } from "../../services/config";
import {
  type CaregiverMessage,
  type CaregiverMessageStore,
  mergeCaregiverMessages,
  readCaregiverMessages,
  writeCaregiverMessages,
} from "./caregiverMessages";
import { deletePreviousGrapheme } from "../../utils/textEditing";
import { formatTextSmartWithSelection } from "../dictionary/textFormatting";
import type {
  CaregiverAlertTarget as ProfileCaregiverAlertTarget,
  Profile,
  SpeakText,
  StateSetter,
  StyleMap,
} from "../../shared/types";

type CaregiverTarget = {
  id: string;
  name: string;
  channel: string;
  accessKey?: string;
};

type MessageStore = {
  key: string;
  data: CaregiverMessageStore;
};

const INCOMING_MESSAGE_SOUND_URL = "/message-bip.mp3";

function MicrophoneIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "0 0 auto" }}
    >
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

const VIRTUAL_KEYBOARD_ROWS = [
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["Maj", "W", "X", "C", "V", "B", "N", "Retour", "Entree"],
  ["'", "-", ".", "Emoji", "Espace", ",", "?", "!"],
];
const VIRTUAL_KEYBOARD_LONG_PRESS_DELAY_MS = 460;
const VIRTUAL_KEYBOARD_DELETE_REPEAT_DELAY_MS = 420;
const VIRTUAL_KEYBOARD_DELETE_REPEAT_INTERVAL_MS = 85;
const VIRTUAL_KEYBOARD_EMOJI_OPTIONS = [
  "😀",
  "😊",
  "😂",
  "😍",
  "🥰",
  "😢",
  "😡",
  "😴",
  "👍",
  "👎",
  "🙏",
  "👏",
  "💪",
  "❤️",
  "💙",
  "⭐",
  "🎉",
  "🔥",
  "✅",
  "❌",
];
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

type MessageNotificationPermission = NotificationPermission | "unsupported";

function playIncomingMessageSound() {
  if (typeof window === "undefined") return;

  const vibrate = () => {
    try {
      window.navigator.vibrate?.([90]);
    } catch {}
  };

  try {
    const audio = new Audio(INCOMING_MESSAGE_SOUND_URL);
    audio.volume = 1;
    void audio.play().catch(vibrate);
    vibrate();
  } catch {
    vibrate();
  }
}

function getMessageNotificationPermission(): MessageNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

async function requestMessageNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (window.Notification.permission === "default") {
    return window.Notification.requestPermission();
  }

  return window.Notification.permission;
}

function truncateNotificationText(value: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

async function showIncomingMessageNotification(
  message: CaregiverMessage,
  caregiverName: string
) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    window.Notification.permission !== "granted"
  ) {
    return;
  }

  const title = `Message de ${caregiverName || message.senderName || "l'aidant"}`;
  const options: NotificationOptions = {
    body: truncateNotificationText(message.message),
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    tag: `ma-voix-message-${message.channel || "aidant"}`,
    renotify: true,
    data: {
      url: window.location.href,
    },
  };

  try {
    if (!window.maVoixDesktopApp?.isDesktopApp && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }
  } catch {}

  try {
    new window.Notification(title, options);
  } catch {}
}

function buildMessageStreamUrl(channel: string, accessKey?: string) {
  const url = new URL("/api/caregiver-messages/stream", API_BASE);
  url.searchParams.set("channel", channel);
  if (accessKey) {
    url.searchParams.set("key", accessKey);
  }
  url.searchParams.set("role", "user");
  return url.href;
}

function formatMessageTime(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function isAudioMessage(message: CaregiverMessage) {
  return message.messageType === "audio";
}

function VirtualKeyboardIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "0 0 auto" }}
    >
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

type CaregiverMessagesPageProps = {
  styles: StyleMap;
  caregiverAlertLinks?: ProfileCaregiverAlertTarget[];
  currentProfile: Profile;
  currentProfileId: string;
  text: string;
  setText: StateSetter<string>;
  isListening: boolean;
  startDictation: () => void;
  speakText: SpeakText;
  showToast?: (message: string) => void;
  onCaregiverMessagesChanged?: () => void;
  markCaregiverMessagesRead?: (channels?: string[]) => void;
};

export default function CaregiverMessagesPage(props: CaregiverMessagesPageProps) {
  const {
    styles,
    caregiverAlertLinks = [],
    currentProfile,
    currentProfileId,
    text,
    setText,
    isListening,
    startDictation,
    speakText,
    showToast,
    onCaregiverMessagesChanged,
    markCaregiverMessagesRead,
  } = props;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const isKeyboardCompactLayout = viewportWidth <= 640;
  const virtualKeyboardActionSize = isKeyboardCompactLayout ? 44 : 48;
  const virtualKeyboardActionPadding = isKeyboardCompactLayout
    ? "8px 6px"
    : "10px 10px";
  const virtualKeyboardActionIconSize = isKeyboardCompactLayout ? 23 : 27;
  const virtualKeyboardKeyMinHeight = isKeyboardCompactLayout ? 48 : 52;
  const virtualKeyboardKeyPadding = isKeyboardCompactLayout
    ? "8px 4px"
    : "10px 6px";
  const virtualKeyboardVariantSize = isKeyboardCompactLayout ? 44 : 48;
  const virtualKeyboardEmojiSize = isKeyboardCompactLayout ? 40 : 44;

  const caregiverTargets = React.useMemo<CaregiverTarget[]>(
    () =>
      (caregiverAlertLinks || [])
        .filter((link) => link?.channel)
        .map((link, index) => ({
          id: link.id || link.channel,
          name: link.name || `Aidant ${index + 1}`,
          channel: link.channel,
          accessKey: link.accessKey,
        })),
    [caregiverAlertLinks]
  );
  const caregiverChannelKey = React.useMemo(
    () =>
      caregiverTargets
        .map((target) => `${target.channel}:${target.accessKey || ""}`)
        .join("|"),
    [caregiverTargets]
  );
  const storageKey = React.useMemo(
    () =>
      `maVoixCaregiverMessages:${
        currentProfileId || currentProfile?.id || "default"
      }`,
    [currentProfileId, currentProfile?.id]
  );

  const [selectedCaregiverId, setSelectedCaregiverId] = React.useState("");
  const [messageStore, setMessageStore] = React.useState<MessageStore>(() => ({
    key: storageKey,
    data: readCaregiverMessages(storageKey),
  }));
  const [connectedCaregivers, setConnectedCaregivers] = React.useState<
    Record<string, number>
  >({});
  const [statusText, setStatusText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [notificationPermission, setNotificationPermission] =
    React.useState<MessageNotificationPermission>(() =>
      getMessageNotificationPermission()
    );
  const messageListRef = React.useRef<HTMLDivElement | null>(null);
  const messageTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const currentTextRef = React.useRef(text);
  const virtualKeyboardLongPressTimerRef = React.useRef<number | null>(null);
  const virtualKeyboardDeleteRepeatTimerRef = React.useRef<number | null>(null);
  const virtualKeyboardDeleteRepeatIntervalRef = React.useRef<number | null>(
    null
  );
  const virtualKeyboardDeleteRepeatStartedRef = React.useRef(false);
  const virtualKeyboardSuppressClickRef = React.useRef("");
  const virtualKeyboardHoveredVariantRef = React.useRef("");
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] =
    React.useState(false);
  const [isVirtualKeyboardShiftActive, setIsVirtualKeyboardShiftActive] =
    React.useState(false);
  const [virtualKeyboardVariantMenu, setVirtualKeyboardVariantMenu] =
    React.useState<{ key: string } | null>(null);
  const [isVirtualKeyboardEmojiMenuOpen, setIsVirtualKeyboardEmojiMenuOpen] =
    React.useState(false);
  const [virtualKeyboardHoveredVariant, setVirtualKeyboardHoveredVariant] =
    React.useState("");

  React.useEffect(() => {
    setNotificationPermission(getMessageNotificationPermission());
  }, []);

  React.useEffect(() => {
    currentTextRef.current = String(text || "");
  }, [text]);

  React.useEffect(() => {
    setMessageStore({
      key: storageKey,
      data: readCaregiverMessages(storageKey),
    });
  }, [storageKey]);

  React.useEffect(() => {
    if (messageStore.key !== storageKey || typeof window === "undefined") {
      return;
    }

    writeCaregiverMessages(storageKey, messageStore.data);
    onCaregiverMessagesChanged?.();
  }, [messageStore, storageKey, onCaregiverMessagesChanged]);

  React.useEffect(() => {
    if (caregiverTargets.length === 0) {
      setSelectedCaregiverId("");
      return;
    }

    const selectedExists = caregiverTargets.some(
      (target) => target.id === selectedCaregiverId
    );
    if (!selectedExists) {
      setSelectedCaregiverId(caregiverTargets[0].id);
    }
  }, [caregiverTargets, selectedCaregiverId]);

  const updateChannelMessages = React.useCallback(
    (channel: string, incomingMessages: CaregiverMessage[]) => {
      setMessageStore((prev) => ({
        key: prev.key,
        data: {
          ...prev.data,
          [channel]: mergeCaregiverMessages(prev.data[channel], incomingMessages),
        },
      }));
    },
    []
  );

  React.useEffect(() => {
    if (caregiverTargets.length === 0) return;

    const sources = caregiverTargets.map((target) => {
      const source = new EventSource(
        buildMessageStreamUrl(target.channel, target.accessKey)
      );

      source.addEventListener("connected", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          setConnectedCaregivers((prev) => ({
            ...prev,
            [target.channel]: Number(payload.connectedCaregivers || 0),
          }));
          setStatusText("Conversation connectée.");
        } catch {
          setStatusText("Conversation connectée.");
        }
      });

      source.addEventListener("caregiver-presence", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          setConnectedCaregivers((prev) => ({
            ...prev,
            [target.channel]: Number(payload.connectedCaregivers || 0),
          }));
        } catch {}
      });

      source.addEventListener("caregiver-message-history", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          updateChannelMessages(
            target.channel,
            Array.isArray(payload.messages) ? payload.messages : []
          );
        } catch {}
      });

      source.addEventListener("caregiver-message", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          updateChannelMessages(target.channel, [payload]);
          if (payload?.senderRole === "caregiver") {
            playIncomingMessageSound();
            void showIncomingMessageNotification(payload, target.name);
          }
          setStatusText("Nouveau message reçu.");
        } catch {}
      });

      source.onerror = () => {
        setStatusText("Connexion messages interrompue. Reconnexion en cours...");
      };

      return source;
    });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [caregiverChannelKey, caregiverTargets, updateChannelMessages]);

  const selectedCaregiver =
    caregiverTargets.find((target) => target.id === selectedCaregiverId) ||
    caregiverTargets[0] ||
    null;
  const selectedMessages = selectedCaregiver
    ? messageStore.data[selectedCaregiver.channel] || []
    : [];
  const lastSelectedMessageId =
    selectedMessages[selectedMessages.length - 1]?.id || "";
  const selectedConnectedCount = selectedCaregiver
    ? connectedCaregivers[selectedCaregiver.channel] || 0
    : 0;

  React.useEffect(() => {
    markCaregiverMessagesRead?.(
      caregiverTargets.map((target) => target.channel)
    );
    onCaregiverMessagesChanged?.();
  }, [caregiverChannelKey, markCaregiverMessagesRead, onCaregiverMessagesChanged]);

  React.useEffect(() => {
    if (!selectedCaregiver?.channel) return;

    markCaregiverMessagesRead?.([selectedCaregiver.channel]);
    onCaregiverMessagesChanged?.();
  }, [
    lastSelectedMessageId,
    selectedCaregiver?.channel,
    markCaregiverMessagesRead,
    onCaregiverMessagesChanged,
  ]);

  React.useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    const frameId = window.requestAnimationFrame(() => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [lastSelectedMessageId, selectedCaregiver?.channel]);

  function focusMessageTextarea(
    nextCursorStart: number | null = null,
    nextCursorEnd: number | null = null
  ) {
    window.requestAnimationFrame(() => {
      const textarea = messageTextareaRef.current;
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
        console.error("Impossible de positionner le curseur message :", error);
      }
    });
  }

  function applyMessageTextInput(
    nextValue: string,
    nextCursorStart: number | null = null,
    nextCursorEnd: number | null = null
  ) {
    const fallbackCursorStart =
      typeof nextCursorStart === "number" ? nextCursorStart : nextValue.length;
    const fallbackCursorEnd =
      typeof nextCursorEnd === "number" ? nextCursorEnd : fallbackCursorStart;
    const formattedInput = formatTextSmartWithSelection(
      nextValue,
      fallbackCursorStart,
      fallbackCursorEnd
    );

    setText(formattedInput.text);
    currentTextRef.current = formattedInput.text;
    focusMessageTextarea(
      formattedInput.selectionStart,
      formattedInput.selectionEnd
    );
  }

  function handleMessageTextAreaChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const { value, selectionStart, selectionEnd } = event.target;
    const formattedInput = formatTextSmartWithSelection(
      value,
      selectionStart,
      selectionEnd
    );

    setText(formattedInput.text);
    currentTextRef.current = formattedInput.text;

    if (
      formattedInput.text !== value ||
      formattedInput.selectionStart !== selectionStart ||
      formattedInput.selectionEnd !== selectionEnd
    ) {
      focusMessageTextarea(
        formattedInput.selectionStart,
        formattedInput.selectionEnd
      );
    }
  }

  function insertVirtualKeyboardText(value: string) {
    const textarea = messageTextareaRef.current;
    const currentText = currentTextRef.current;
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const nextText = `${currentText.slice(0, selectionStart)}${value}${currentText.slice(selectionEnd)}`;
    const nextCursor = selectionStart + value.length;

    applyMessageTextInput(nextText, nextCursor, nextCursor);
  }

  function deleteVirtualKeyboardText() {
    const textarea = messageTextareaRef.current;
    const currentText = currentTextRef.current;
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;

    if (selectionStart !== selectionEnd) {
      const nextText = `${currentText.slice(0, selectionStart)}${currentText.slice(selectionEnd)}`;
      applyMessageTextInput(nextText, selectionStart, selectionStart);
      return;
    }

    if (selectionStart <= 0) {
      focusMessageTextarea(0, 0);
      return;
    }

    const deletion = deletePreviousGrapheme(currentText, selectionStart);
    applyMessageTextInput(
      deletion.text,
      deletion.selectionStart,
      deletion.selectionEnd
    );
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
    if (key === "Emoji") return "😊";
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
        .closest("[data-caregiver-virtual-keyboard-variant]")
        ?.getAttribute("data-caregiver-virtual-keyboard-variant") || ""
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

  function clearVirtualKeyboardDeleteRepeatTimer() {
    if (virtualKeyboardDeleteRepeatTimerRef.current !== null) {
      window.clearTimeout(virtualKeyboardDeleteRepeatTimerRef.current);
      virtualKeyboardDeleteRepeatTimerRef.current = null;
    }

    if (virtualKeyboardDeleteRepeatIntervalRef.current !== null) {
      window.clearInterval(virtualKeyboardDeleteRepeatIntervalRef.current);
      virtualKeyboardDeleteRepeatIntervalRef.current = null;
    }
  }

  function startVirtualKeyboardLongPress(key: string) {
    const variants = getVirtualKeyboardKeyVariants(key);

    if (!variants.length) {
      return;
    }

    clearVirtualKeyboardLongPressTimer();
    closeVirtualKeyboardEmojiMenu();
    virtualKeyboardSuppressClickRef.current = "";
    setVirtualKeyboardHoveredVariantValue("");
    virtualKeyboardLongPressTimerRef.current = window.setTimeout(() => {
      virtualKeyboardLongPressTimerRef.current = null;
      virtualKeyboardSuppressClickRef.current = key;
      setVirtualKeyboardVariantMenu({ key });
      focusMessageTextarea();
    }, VIRTUAL_KEYBOARD_LONG_PRESS_DELAY_MS);
  }

  function startVirtualKeyboardDeleteRepeat(key: string) {
    if (key !== "Retour") {
      return;
    }

    clearVirtualKeyboardDeleteRepeatTimer();
    virtualKeyboardDeleteRepeatStartedRef.current = false;
    virtualKeyboardSuppressClickRef.current = "";
    virtualKeyboardDeleteRepeatTimerRef.current = window.setTimeout(() => {
      virtualKeyboardDeleteRepeatTimerRef.current = null;
      virtualKeyboardDeleteRepeatStartedRef.current = true;
      virtualKeyboardSuppressClickRef.current = key;
      deleteVirtualKeyboardText();
      virtualKeyboardDeleteRepeatIntervalRef.current = window.setInterval(() => {
        deleteVirtualKeyboardText();
      }, VIRTUAL_KEYBOARD_DELETE_REPEAT_INTERVAL_MS);
    }, VIRTUAL_KEYBOARD_DELETE_REPEAT_DELAY_MS);
  }

  function startVirtualKeyboardPress(key: string) {
    startVirtualKeyboardLongPress(key);
    startVirtualKeyboardDeleteRepeat(key);
  }

  function cancelVirtualKeyboardLongPress() {
    clearVirtualKeyboardLongPressTimer();
  }

  function cancelVirtualKeyboardDeleteRepeat(key: string) {
    clearVirtualKeyboardDeleteRepeatTimer();

    if (virtualKeyboardDeleteRepeatStartedRef.current) {
      virtualKeyboardSuppressClickRef.current = key;
    }

    virtualKeyboardDeleteRepeatStartedRef.current = false;
  }

  function cancelVirtualKeyboardPress(key: string) {
    cancelVirtualKeyboardLongPress();
    cancelVirtualKeyboardDeleteRepeat(key);
  }

  function closeVirtualKeyboardVariantMenu() {
    setVirtualKeyboardHoveredVariantValue("");
    setVirtualKeyboardVariantMenu(null);
  }

  function closeVirtualKeyboardEmojiMenu() {
    setIsVirtualKeyboardEmojiMenuOpen(false);
  }

  function insertVirtualKeyboardVariant(variant: string) {
    virtualKeyboardSuppressClickRef.current = "";
    closeVirtualKeyboardVariantMenu();
    insertVirtualKeyboardText(variant);
  }

  function insertVirtualKeyboardEmoji(emoji: string) {
    closeVirtualKeyboardEmojiMenu();
    insertVirtualKeyboardText(emoji);
  }

  function handleVirtualKeyboardKey(key: string) {
    const isEmojiKey = key === "Emoji";
    closeVirtualKeyboardVariantMenu();

    if (!isEmojiKey) {
      closeVirtualKeyboardEmojiMenu();
    }

    if (key === "Maj") {
      setIsVirtualKeyboardShiftActive((prev) => !prev);
      focusMessageTextarea();
      return;
    }

    if (key === "Espace") {
      insertVirtualKeyboardText(" ");
      return;
    }

    if (isEmojiKey) {
      setIsVirtualKeyboardEmojiMenuOpen((prev) => !prev);
      focusMessageTextarea();
      return;
    }

    if (key === "Retour") {
      deleteVirtualKeyboardText();
      return;
    }

    if (key === "Entree") {
      insertVirtualKeyboardText("\n");
      return;
    }

    insertVirtualKeyboardText(getVirtualKeyboardKeyValue(key));
  }

  function handleVirtualKeyboardButtonClick(key: string) {
    cancelVirtualKeyboardPress(key);

    if (virtualKeyboardSuppressClickRef.current === key) {
      virtualKeyboardSuppressClickRef.current = "";
      return;
    }

    virtualKeyboardSuppressClickRef.current = "";
    handleVirtualKeyboardKey(key);
  }

  React.useEffect(
    () => () => {
      clearVirtualKeyboardLongPressTimer();
      clearVirtualKeyboardDeleteRepeatTimer();
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
        focusMessageTextarea();
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

  async function sendCaregiverMessage(messageType: "text" | "audio" = "text") {
    if (!selectedCaregiver || isSending) return;

    const message = String(text || "").trim();
    if (!message) {
      setStatusText(
        messageType === "audio"
          ? "Écris un message avant d'envoyer l'audio."
          : "Écris un message avant l'envoi."
      );
      return;
    }

    try {
      setIsSending(true);

      const response = await fetch(`${API_BASE}/api/caregiver-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedCaregiver.channel,
          accessKey: selectedCaregiver.accessKey || "",
          senderRole: "user",
          senderName: currentProfile?.firstName || currentProfile?.name || "Utilisateur",
          message,
          messageType,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.details || data?.error || "Impossible d'envoyer le message."
        );
      }

      if (data?.message) {
        updateChannelMessages(selectedCaregiver.channel, [data.message]);
      }
      setText("");
      currentTextRef.current = "";

      const nextStatus =
        Number(data?.deliveredTo || 0) > 0
          ? messageType === "audio"
            ? `Audio envoyé à ${selectedCaregiver.name}.`
            : `Message envoyé à ${selectedCaregiver.name}.`
          : messageType === "audio"
            ? `Audio enregistré pour ${selectedCaregiver.name}.`
            : `Message enregistré pour ${selectedCaregiver.name}.`;
      setStatusText(nextStatus);
      showToast?.(nextStatus);
    } catch (error) {
      const nextStatus = getCaregiverNetworkErrorMessage(
        error,
        "Impossible d'envoyer le message."
      );
      setStatusText(nextStatus);
      showToast?.(nextStatus);
    } finally {
      setIsSending(false);
    }
  }

  async function enableMessageNotifications() {
    const nextPermission = await requestMessageNotificationPermission();
    setNotificationPermission(nextPermission);

    if (nextPermission === "granted") {
      const nextStatus = "Notifications messages activées.";
      setStatusText(nextStatus);
      showToast?.(nextStatus);
      return;
    }

    if (nextPermission === "denied") {
      const nextStatus =
        "Notifications bloquées. Autorise-les dans les réglages du navigateur.";
      setStatusText(nextStatus);
      showToast?.(nextStatus);
      return;
    }

    if (nextPermission === "unsupported") {
      const nextStatus =
        "Les notifications ne sont pas disponibles sur cet appareil.";
      setStatusText(nextStatus);
      showToast?.(nextStatus);
    }
  }

  const virtualKeyboardActionStyle = (
    baseStyle: React.CSSProperties
  ): React.CSSProperties => ({
    ...baseStyle,
    height: virtualKeyboardActionSize,
    minHeight: virtualKeyboardActionSize,
    padding: virtualKeyboardActionPadding,
    borderRadius: isKeyboardCompactLayout ? 14 : 18,
    lineHeight: 1.1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const notificationButtonLabel =
    notificationPermission === "granted"
      ? "Notifications activées"
      : notificationPermission === "denied"
      ? "Notifications bloquées"
      : "Activer notifications";

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Messages aidants</h2>

        {caregiverTargets.length === 0 ? (
          <p style={styles.emptyText}>
            Ajoute un aidant dans Profil pour ouvrir une conversation.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 900 ? "minmax(0, 0.9fr) minmax(0, 1.4fr)" : "1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Choisir l'aidant</label>
                  <select
                    value={selectedCaregiver?.id || ""}
                    onChange={(event) => setSelectedCaregiverId(event.target.value)}
                    style={styles.input}
                  >
                    {caregiverTargets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    background:
                      selectedConnectedCount > 0
                        ? "rgba(34,197,94,0.14)"
                        : "rgba(245,158,11,0.14)",
                    border:
                      selectedConnectedCount > 0
                        ? "1px solid rgba(74,222,128,0.32)"
                        : "1px solid rgba(251,191,36,0.32)",
                    color: "rgba(255,255,255,0.88)",
                    fontWeight: 700,
                  }}
                >
                  {selectedConnectedCount > 0
                    ? `${selectedCaregiver?.name} est connecté.`
                    : `${selectedCaregiver?.name} n'est pas connecté pour le moment.`}
                </div>

                {notificationPermission !== "unsupported" ? (
                  <button
                    type="button"
                    style={{
                      ...styles.secondaryButton,
                      fontSize: 16,
                      opacity: notificationPermission === "granted" ? 0.78 : 1,
                    }}
                    onClick={enableMessageNotifications}
                    disabled={notificationPermission === "granted"}
                  >
                    {notificationButtonLabel}
                  </button>
                ) : null}
              </div>

              <div
                ref={messageListRef}
                style={{
                  minHeight: 260,
                  maxHeight: 420,
                  overflowY: "auto",
                  display: "grid",
                  alignContent: "start",
                  gap: 10,
                  padding: 12,
                  borderRadius: 18,
                  background: "rgba(0,0,0,0.16)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {selectedMessages.length === 0 ? (
                  <div style={{ ...styles.emptyText, margin: 0 }}>
                    Aucun message avec cet aidant.
                  </div>
                ) : (
                  selectedMessages.map((message) => {
                    const isUser = message.senderRole === "user";
                    return (
                      <div
                        key={message.id}
                        style={{
                          justifySelf: isUser ? "end" : "start",
                          maxWidth: "88%",
                          display: "grid",
                          gap: 5,
                          padding: "11px 13px",
                          borderRadius: 16,
                          background: isUser
                            ? "rgba(37,99,235,0.32)"
                            : "rgba(34,197,94,0.18)",
                          border: isUser
                            ? "1px solid rgba(96,165,250,0.36)"
                            : "1px solid rgba(74,222,128,0.28)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.78,
                            fontWeight: 800,
                          }}
                        >
                          {isUser
                            ? currentProfile?.firstName ||
                              currentProfile?.name ||
                              "Moi"
                            : message.senderName || selectedCaregiver?.name}
                          {formatMessageTime(message.createdAt)
                            ? ` - ${formatMessageTime(message.createdAt)}`
                            : ""}
                        </div>
                        {isAudioMessage(message) ? (
                          <button
                            type="button"
                            style={{
                              ...styles.secondaryButton,
                              minHeight: 44,
                              padding: "8px 12px",
                              fontSize: 15,
                            }}
                            onClick={() => speakText?.(message.message)}
                            disabled={!message.message}
                          >
                            ▶️ {isUser ? "Audio envoyé" : "Audio reçu"}
                          </button>
                        ) : (
                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              lineHeight: 1.35,
                            }}
                          >
                            {message.message}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ ...styles.formGroup, marginTop: 16 }}>
              <label style={styles.label}>Message</label>
              <textarea
                ref={messageTextareaRef}
                value={text}
                onChange={handleMessageTextAreaChange}
                style={styles.textarea}
                placeholder="Écrire ici..."
              />
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns:
                  viewportWidth > 900
                    ? "repeat(4, minmax(0, 1fr))"
                    : isKeyboardCompactLayout
                      ? "repeat(4, minmax(0, 1fr))"
                      : "1fr",
                gap: isKeyboardCompactLayout ? 6 : 12,
                alignItems: "stretch",
              }}
            >
              <button
                type="button"
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
                  width: "100%",
                  minWidth: 0,
                }}
                onClick={() => {
                  setIsVirtualKeyboardOpen((prev) => !prev);
                  focusMessageTextarea();
                }}
              >
                <VirtualKeyboardIcon size={virtualKeyboardActionIconSize} />
              </button>

              <button
                type="button"
                aria-label="Dicter"
                title="Dicter"
                style={{
                  ...virtualKeyboardActionStyle(styles.primaryButton),
                  width: "100%",
                  minWidth: 0,
                  whiteSpace: "normal",
                  opacity: isListening ? 0.6 : 1,
                }}
                onClick={startDictation}
                disabled={isListening}
              >
                <MicrophoneIcon size={26} />
              </button>

              <button
                type="button"
                style={{
                  ...virtualKeyboardActionStyle(styles.secondaryButton),
                  width: "100%",
                  minWidth: 0,
                  whiteSpace: "normal",
                  fontSize: isKeyboardCompactLayout ? 12 : undefined,
                }}
                onClick={() => sendCaregiverMessage("audio")}
                disabled={isSending || !selectedCaregiver}
              >
                Envoyer l'audio
              </button>

              <button
                type="button"
                style={{
                  ...virtualKeyboardActionStyle(styles.primaryButton),
                  width: "100%",
                  minWidth: 0,
                  whiteSpace: "normal",
                  fontSize: isKeyboardCompactLayout ? 12 : undefined,
                  opacity: isSending ? 0.7 : 1,
                }}
                onClick={() => sendCaregiverMessage("text")}
                disabled={isSending || !selectedCaregiver}
              >
                {isSending ? "Envoi..." : "Envoyer"}
              </button>
            </div>

            {isVirtualKeyboardOpen ? (
              <div
                style={{
                  marginTop: 12,
                  marginBottom: isKeyboardCompactLayout ? 88 : undefined,
                  padding: isKeyboardCompactLayout ? 10 : 14,
                  borderRadius: 18,
                  background: styles.input.background || "rgba(15,23,42,0.62)",
                  border:
                    styles.input.border || "1px solid rgba(148,163,184,0.28)",
                  display: "grid",
                  gap: isKeyboardCompactLayout ? 6 : 8,
                }}
              >
                {VIRTUAL_KEYBOARD_ROWS.map((row, rowIndex) => (
                  <div
                    key={`caregiver-keyboard-row-${rowIndex}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        row.includes("Retour") && row.includes("Entree")
                          ? "repeat(7, minmax(0, 1fr)) repeat(2, minmax(0, 1.5fr))"
                          : "repeat(10, minmax(0, 1fr))",
                      gap: isKeyboardCompactLayout ? 5 : 7,
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
                              key === "Espace"
                                ? row.includes("Emoji")
                                  ? "5 / span 3"
                                  : "4 / span 4"
                                : undefined,
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
                                  : key === "Entree"
                                    ? "Insérer un retour à la ligne"
                                    : key === "Emoji"
                                      ? "Choisir un emoji"
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
                                : key === "Entree"
                                  ? "Retour à la ligne"
                                  : key === "Emoji"
                                    ? "Emojis"
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
                                key === "Entree" ||
                                key === "Emoji" ||
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
                            onPointerDown={() => startVirtualKeyboardPress(key)}
                            onPointerUp={() => cancelVirtualKeyboardPress(key)}
                            onPointerLeave={() => cancelVirtualKeyboardPress(key)}
                            onPointerCancel={() => cancelVirtualKeyboardPress(key)}
                            onClick={() => handleVirtualKeyboardButtonClick(key)}
                          >
                            {numberLabel ? (
                              <span
                                aria-hidden="true"
                                style={{
                                  position: "absolute",
                                  top: isKeyboardCompactLayout ? 4 : 5,
                                  right: isKeyboardCompactLayout ? 6 : 8,
                                  fontSize: isKeyboardCompactLayout ? 9 : 11,
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

                          {key === "Emoji" && isVirtualKeyboardEmojiMenuOpen ? (
                            <div
                              role="menu"
                              aria-label="Choisir un emoji"
                              style={{
                                position: "absolute",
                                left: "50%",
                                bottom: "calc(100% + 8px)",
                                transform: "translateX(-50%)",
                                zIndex: 32,
                                display: "grid",
                                gridTemplateColumns: `repeat(5, ${virtualKeyboardEmojiSize}px)`,
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
                              {VIRTUAL_KEYBOARD_EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={`emoji-${emoji}`}
                                  type="button"
                                  role="menuitem"
                                  aria-label={`Insérer ${emoji}`}
                                  title={emoji}
                                  style={{
                                    ...styles.secondaryButton,
                                    width: virtualKeyboardEmojiSize,
                                    minWidth: virtualKeyboardEmojiSize,
                                    height: virtualKeyboardEmojiSize,
                                    minHeight: virtualKeyboardEmojiSize,
                                    padding: 0,
                                    borderRadius: 12,
                                    fontSize: isKeyboardCompactLayout ? 20 : 22,
                                    fontWeight: 900,
                                    lineHeight: 1,
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    insertVirtualKeyboardEmoji(emoji);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : null}

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
                                right: isVariantMenuNearRightEdge ? 0 : undefined,
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
                                  data-caregiver-virtual-keyboard-variant={variant}
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
                                    setVirtualKeyboardHoveredVariantValue(variant)
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

            {statusText ? (
              <div
                style={{
                  ...styles.infoBox,
                  marginTop: 14,
                  lineHeight: 1.45,
                }}
              >
                {statusText}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
