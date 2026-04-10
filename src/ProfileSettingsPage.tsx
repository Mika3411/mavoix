import type { CSSProperties } from "react";

import React from "react";
import { formatTextSmart, normalizeTextFormatting } from "./utils/textFormatting";
import { createCompactCardStyle } from "./utils/profileCardStyles";


function VirtualKeyboard({
  text,
  setText,
  saveWordToHistory,
  speakText,
  stopSpeaking,
  styles,
}) {
  const keyboardContainerRef = React.useRef(null);
  const textAreaRef = React.useRef(null);
  const longPressTimerRef = React.useRef(null);
  const longPressTriggeredRef = React.useRef(false);
  const backspaceHoldTimeoutRef = React.useRef(null);
  const deleteRepeatTimerRef = React.useRef(null);

  const [isShiftActive, setIsShiftActive] = React.useState(false);
  const [keyboardMode, setKeyboardMode] = React.useState("letters");
  const [accentMenu, setAccentMenu] = React.useState(null);
  const [punctuationMenu, setPunctuationMenu] = React.useState(null);
  const [emojiMenu, setEmojiMenu] = React.useState(null);
  const [hoveredKey, setHoveredKey] = React.useState(null);
  const [pressedKey, setPressedKey] = React.useState(null);

  const letterRows = [
    ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
    ["Maj", "w", "x", "c", "v", "b", "n", "⌫", "123#+"],
  ];

  const symbolRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    [".", ",", "?", "!", "'", ":", ";", "-"],
    ["ABC", "@", "#", "+", "/", "€", "(", ")", "&"],
  ];

const ACCENT_OPTIONS = {
  a: ["à", "â", "ä", "á", "ã", "1", "@", "#", "+", "-"],
  z: ["2"],
  e: ["é", "è", "ê", "ë", "€", "3"],
  r: ["4"],
  t: ["5"],
  y: ["ÿ", "6"],
  u: ["ù", "û", "ü", "ú", "7"],
  i: ["î", "ï", "í", "ì", "8"],
  o: ["ô", "ö", "ó", "ò", "õ", "9"],
  p: ["0"],
  c: ["ç"],
};

  const isCompactScreen =
    typeof window !== "undefined" && window.innerHeight < 900;

  function focusTextArea(nextCursorStart = null, nextCursorEnd = null) {
    window.requestAnimationFrame(() => {
      if (!textAreaRef.current) return;
      textAreaRef.current.focus();

      const startPos =
        typeof nextCursorStart === "number"
          ? nextCursorStart
          : textAreaRef.current.value.length;
      const endPos =
        typeof nextCursorEnd === "number" ? nextCursorEnd : startPos;

      try {
        textAreaRef.current.setSelectionRange(startPos, endPos);
      } catch (error) {
        console.error("Impossible de positionner le curseur :", error);
      }
    });
  }

  function insertAtCursor(insertedText) {
    const currentValue = String(text || "");
    const textarea = textAreaRef.current;
    const selectionStart =
      textarea && typeof textarea.selectionStart === "number"
        ? textarea.selectionStart
        : currentValue.length;
    const selectionEnd =
      textarea && typeof textarea.selectionEnd === "number"
        ? textarea.selectionEnd
        : currentValue.length;

    const nextValue =
      currentValue.slice(0, selectionStart) +
      insertedText +
      currentValue.slice(selectionEnd);

    const nextCursor = selectionStart + insertedText.length;

    setText(formatTextSmart(nextValue));
    focusTextArea(nextCursor, nextCursor);

    if (keyboardMode === "letters" && isShiftActive && /[a-zà-ÿA-ZÀ-Ÿ]/.test(insertedText)) {
      setIsShiftActive(false);
    }
  }

  function handleTextAreaChange(event) {
    const nextValue = formatTextSmart(event.target.value);
    setText(nextValue);
  }

  function handleTextAreaKeyUp() {
    if (!textAreaRef.current) return;
    const currentValue = String(textAreaRef.current.value || "");

    if (/\s$/.test(currentValue)) {
      const typedWords = currentValue
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      const lastTypedWord = typedWords[typedWords.length - 1];
      if (lastTypedWord) {
        saveWordToHistory(lastTypedWord);
      }
    }
  }

  function addCharacter(character) {
    const value =
      keyboardMode === "letters" && isShiftActive
        ? character.toUpperCase()
        : character;
    insertAtCursor(value);
  }

  function addSpace() {
    const currentValue = String(text || "");
    const textarea = textAreaRef.current;
    const selectionStart =
      textarea && typeof textarea.selectionStart === "number"
        ? textarea.selectionStart
        : currentValue.length;
    const selectionEnd =
      textarea && typeof textarea.selectionEnd === "number"
        ? textarea.selectionEnd
        : currentValue.length;

    const nextValue =
      currentValue.slice(0, selectionStart) +
      " " +
      currentValue.slice(selectionEnd);

    const typedWords = nextValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const lastTypedWord = typedWords[typedWords.length - 1];
    if (lastTypedWord) {
      saveWordToHistory(lastTypedWord);
    }

    const nextCursor = selectionStart + 1;
    setText(formatTextSmart(nextValue));
    focusTextArea(nextCursor, nextCursor);
  }

  function clearAll() {
    setText("");
    focusTextArea(0, 0);
  }

  function getGraphemeSegments(currentValue) {
    if (!currentValue) return [];

    const intlObject =
      typeof Intl !== "undefined" ? Intl : undefined;
    const segmenterCtor =
      intlObject && typeof intlObject === "object"
        ? intlObject["Segmenter"]
        : undefined;

    if (typeof segmenterCtor === "function") {
      const segmenter = new segmenterCtor("fr", { granularity: "grapheme" });
      return Array.from(segmenter.segment(currentValue), ({ segment, index }) => ({
        segment,
        index,
      }));
    }

    return Array.from(currentValue).map((segment, index) => ({
      segment,
      index,
    }));
  }

  function removePreviousGrapheme(currentValue, cursorPosition) {
    const segments = getGraphemeSegments(currentValue);

    if (!segments.length) return null;

    let segmentIndex = -1;

    for (let i = 0; i < segments.length; i += 1) {
      const start = segments[i].index;
      const end = start + segments[i].segment.length;

      if (cursorPosition > start && cursorPosition <= end) {
        segmentIndex = i;
        break;
      }

      if (cursorPosition <= start) {
        segmentIndex = i - 1;
        break;
      }
    }

    if (segmentIndex === -1) {
      segmentIndex = segments.length - 1;
    }

    if (segmentIndex < 0) return null;

    const segmentToRemove = segments[segmentIndex];
    const nextValue =
      currentValue.slice(0, segmentToRemove.index) +
      currentValue.slice(segmentToRemove.index + segmentToRemove.segment.length);

    return {
      nextValue,
      nextCursor: segmentToRemove.index,
    };
  }

  function removeLastCharacter() {
    const textarea = textAreaRef.current;
    const currentValue = textarea ? String(textarea.value || "") : String(text || "");

    if (!textarea) {
      const result = removePreviousGrapheme(currentValue, currentValue.length);
      if (!result) return;
      setText(formatTextSmart(result.nextValue));
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    if (selectionStart != null && selectionEnd != null && selectionStart !== selectionEnd) {
      const nextValue =
        currentValue.slice(0, selectionStart) + currentValue.slice(selectionEnd);
      setText(formatTextSmart(nextValue));
      focusTextArea(selectionStart, selectionStart);
      return;
    }

    if (selectionStart == null || selectionStart === 0) return;

    const result = removePreviousGrapheme(currentValue, selectionStart);
    if (!result) return;

    setText(formatTextSmart(result.nextValue));
    focusTextArea(result.nextCursor, result.nextCursor);
  }

  function toggleKeyboardMode() {
    setKeyboardMode((prev) => (prev === "letters" ? "symbols" : "letters"));
    setIsShiftActive(false);
    setAccentMenu(null);
    setPunctuationMenu(null);
    setEmojiMenu(null);
    focusTextArea();
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startLongPress(letter, event) {
    if (keyboardMode !== "letters") return;
    if (!ACCENT_OPTIONS[letter]) return;
    if (!keyboardContainerRef.current) return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    const button = event.currentTarget;
    longPressTimerRef.current = window.setTimeout(() => {
      const buttonRect = button.getBoundingClientRect();
      const containerRect = keyboardContainerRef.current.getBoundingClientRect();
      const variants = ACCENT_OPTIONS[letter].map((char) =>
        isShiftActive ? char.toUpperCase() : char
      );

      const columns = Math.min(4, variants.length);
      const rows = Math.ceil(variants.length / columns);
      const estimatedWidth = columns * 54 + (columns - 1) * 6 + 16;
      const estimatedHeight = rows * 48 + (rows - 1) * 6 + 16;
      const leftCenter = buttonRect.left - containerRect.left + buttonRect.width / 2;
      const clampedLeft = Math.min(
        Math.max(leftCenter, estimatedWidth / 2 + 8),
        containerRect.width - estimatedWidth / 2 - 8
      );

      let top = buttonRect.top - containerRect.top - estimatedHeight - 10;
      if (top < 8) {
        top = buttonRect.bottom - containerRect.top + 8;
      }

      setAccentMenu({
        key: letter,
        variants,
        top,
        left: clampedLeft,
      });
      longPressTriggeredRef.current = true;
      longPressTimerRef.current = null;
    }, 380);
  }

  function stopLongPress() {
    const wasLongPress = longPressTriggeredRef.current;
    clearLongPressTimer();
    return wasLongPress;
  }


  function startPunctuationLongPress(event) {
    if (!keyboardContainerRef.current) return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    const button = event.currentTarget;
    longPressTimerRef.current = window.setTimeout(() => {
      const buttonRect = button.getBoundingClientRect();
      const containerRect = keyboardContainerRef.current.getBoundingClientRect();
      const variants = [".", ",", "?", "!", ";", ":"];

      const columns = Math.min(4, variants.length);
      const rows = Math.ceil(variants.length / columns);
      const estimatedWidth = columns * 54 + (columns - 1) * 6 + 16;
      const estimatedHeight = rows * 48 + (rows - 1) * 6 + 16;
      const leftCenter = buttonRect.left - containerRect.left + buttonRect.width / 2;
      const clampedLeft = Math.min(
        Math.max(leftCenter, estimatedWidth / 2 + 8),
        containerRect.width - estimatedWidth / 2 - 8
      );

      let top = buttonRect.top - containerRect.top - estimatedHeight - 10;
      if (top < 8) {
        top = buttonRect.bottom - containerRect.top + 8;
      }

      setPunctuationMenu({
        variants,
        top,
        left: clampedLeft,
      });
      longPressTriggeredRef.current = true;
      longPressTimerRef.current = null;
    }, 380);
  }

function startApostropheLongPress(event) {
  if (!keyboardContainerRef.current) return;

  longPressTriggeredRef.current = false;
  clearLongPressTimer();

  const button = event.currentTarget;
  longPressTimerRef.current = window.setTimeout(() => {
    const buttonRect = button.getBoundingClientRect();
    const containerRect = keyboardContainerRef.current.getBoundingClientRect();
    const variants = ["'", '"', "(", ")"];

      const columns = Math.min(4, variants.length);
      const rows = Math.ceil(variants.length / columns);
      const estimatedWidth = columns * 54 + (columns - 1) * 6 + 16;
      const estimatedHeight = rows * 48 + (rows - 1) * 6 + 16;
      const leftCenter = buttonRect.left - containerRect.left + buttonRect.width / 2;
      const clampedLeft = Math.min(
        Math.max(leftCenter, estimatedWidth / 2 + 8),
        containerRect.width - estimatedWidth / 2 - 8
      );

      let top = buttonRect.top - containerRect.top - estimatedHeight - 10;
    if (top < 8) {
      top = buttonRect.bottom - containerRect.top + 8;
    }

    setPunctuationMenu({
      variants,
      top,
      left: clampedLeft,
    });
    longPressTriggeredRef.current = true;
    longPressTimerRef.current = null;
  }, 380);
}

function toggleEmojiMenu(event) {
  if (!keyboardContainerRef.current) return;

  const button = event.currentTarget;
  const buttonRect = button.getBoundingClientRect();
  const containerRect = keyboardContainerRef.current.getBoundingClientRect();
  const variants = [
    "😀", "😁", "😂", "🤣", "😊",
    "😍", "😘", "😎", "🤔", "😴",
    "😢", "😭", "😡", "😱", "👍",
    "👎", "👏", "🙏", "❤️", "🔥",
  ];

  const columns = 5;
  const rows = 4;
  const keySize = 48;
  const gap = 6;
  const padding = 8;

  const estimatedWidth = columns * keySize + (columns - 1) * gap + padding * 2;
  const estimatedHeight = rows * keySize + (rows - 1) * gap + padding * 2;

  const leftCenter = buttonRect.left - containerRect.left + buttonRect.width / 2;
  const clampedLeft = Math.min(
    Math.max(leftCenter, estimatedWidth / 2 + 8),
    containerRect.width - estimatedWidth / 2 - 8
  );

  let top = buttonRect.top - containerRect.top - estimatedHeight - 10;
  if (top < 8) {
    top = buttonRect.bottom - containerRect.top + 8;
  }

  setAccentMenu(null);
  setPunctuationMenu(null);
  setEmojiMenu((prev) =>
    prev
      ? null
      : {
          variants,
          top,
          left: clampedLeft,
        }
  );
}


  function startDeleteHold() {
    stopDeleteHold();
    deleteRepeatTimerRef.current = window.setInterval(() => {
      removeLastCharacter();
    }, 90);
  }

  function stopDeleteHold() {
    if (backspaceHoldTimeoutRef.current) {
      window.clearTimeout(backspaceHoldTimeoutRef.current);
      backspaceHoldTimeoutRef.current = null;
    }
    if (deleteRepeatTimerRef.current) {
      window.clearInterval(deleteRepeatTimerRef.current);
      deleteRepeatTimerRef.current = null;
    }
  }

  React.useEffect(() => {
    function handleGlobalPointerDown(event) {
      if (!accentMenu && !punctuationMenu && !emojiMenu) return;
      const target = event.target;
      if (target && target.closest && target.closest("[data-accent-menu='true']")) {
        return;
      }
      setAccentMenu(null);
      setPunctuationMenu(null);
      setEmojiMenu(null);
    }

    function handleResize() {
      setAccentMenu(null);
      setPunctuationMenu(null);
      setEmojiMenu(null);
    }

    window.addEventListener("pointerdown", handleGlobalPointerDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
      window.removeEventListener("resize", handleResize);
      clearLongPressTimer();
      stopDeleteHold();
    };
  }, [accentMenu, punctuationMenu, emojiMenu]);

  const textFontSize = isCompactScreen ? 22 : 28;
  const textMinHeight = isCompactScreen ? 92 : 116;
  const suggestionPadding = isCompactScreen ? "6px 10px" : "8px 12px";
  const suggestionFontSize = isCompactScreen ? 13 : 14;
  const keyMinHeight = isCompactScreen ? 40 : 48;
  const keyFontSize = isCompactScreen ? 18 : 22;
  const keyPadding = isCompactScreen ? "7px 6px" : "9px 6px";
  const gapSize = isCompactScreen ? 6 : 8;
  const actionMinHeight = isCompactScreen ? 44 : 52;
  const displayedRows = keyboardMode === "letters" ? letterRows : symbolRows;

  function renderKeyLabel(item) {
    if (keyboardMode === "letters" && item === "Maj") {
      return isShiftActive ? "Maj ON" : "Maj";
    }
    if (
      keyboardMode === "letters" &&
      isShiftActive &&
      item.length === 1 &&
      /[a-z]/i.test(item)
    ) {
      return item.toUpperCase();
    }
    return item;
  }

  function handleKeyPress(item) {
    if (keyboardMode === "letters" && item === "Maj") {
      setIsShiftActive((prev) => !prev);
      focusTextArea();
      return;
    }

    if (item === "⌫") {
      removeLastCharacter();
      return;
    }

    if (
      (keyboardMode === "letters" && item === "123#+") ||
      (keyboardMode === "symbols" && item === "ABC")
    ) {
      toggleKeyboardMode();
      return;
    }

    addCharacter(item);
  }

  function getInteractiveKeyStyle(baseStyle, keyId) {
    const isPressed = pressedKey === keyId;
    const isHovered = hoveredKey === keyId;

    return {
      ...baseStyle,
      transition:
        "background 0.12s ease, border-color 0.12s ease, transform 0.06s ease, box-shadow 0.12s ease",
      background: isPressed
        ? "linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%)"
        : isHovered
        ? "rgba(59,130,246,0.24)"
        : baseStyle.background,
      borderColor: isPressed
        ? "rgba(147,197,253,0.95)"
        : isHovered
        ? "rgba(96,165,250,0.85)"
        : baseStyle.borderColor,
      boxShadow: isPressed
        ? "inset 0 2px 6px rgba(0,0,0,0.28), 0 0 0 1px rgba(147,197,253,0.22)"
        : isHovered
        ? "0 0 0 1px rgba(96,165,250,0.16)"
        : baseStyle.boxShadow,
      transform: isPressed ? "scale(0.985)" : "scale(1)",
    };
  }

  return (
    <div
      ref={keyboardContainerRef}
      style={{ display: "grid", gap: gapSize, position: "relative", overflow: "visible" }}
    >
      <textarea
        ref={textAreaRef}
        value={text}
        onChange={handleTextAreaChange}
        onKeyUp={handleTextAreaKeyUp}
        placeholder="Écrire ici..."
        style={{
          width: "100%",
          minHeight: textMinHeight,
          maxHeight: isCompactScreen ? 128 : 160,
          resize: "vertical",
          overflowY: "auto",
          padding: isCompactScreen ? 12 : 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: textFontSize,
          lineHeight: 1.3,
          color: "#ffffff",
          outline: "none",
          boxSizing: "border-box",
        }}
      />


      {accentMenu ? (
        <div
          data-accent-menu="true"
          style={{
            position: "absolute",
            top: accentMenu.top,
            left: accentMenu.left,
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(4, accentMenu.variants.length)}, 48px)`,
            gap: 6,
            padding: 8,
            borderRadius: 16,
            background: "rgba(8,15,35,0.98)",
            border: "1px solid rgba(59,130,246,0.5)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            maxWidth: "calc(100% - 16px)",
          }}
        >
          {accentMenu.variants.map((variant) => {
            const keyId = `accent-${variant}`;
            return (
              <button
                key={variant}
                type="button"
                onMouseEnter={() => setHoveredKey(keyId)}
                onMouseLeave={() => {
                  setHoveredKey((prev) => (prev === keyId ? null : prev));
                  setPressedKey((prev) => (prev === keyId ? null : prev));
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setPressedKey(keyId);
                }}
                onMouseUp={() => {
                  setPressedKey((prev) => (prev === keyId ? null : prev));
                }}
                onClick={() => {
                  insertAtCursor(variant);
                  setAccentMenu(null);
                }}
                style={getInteractiveKeyStyle(
                  {
                    ...styles.secondaryButton,
                    minWidth: 48,
                    minHeight: 48,
                    padding: "8px 10px",
                    fontSize: 22,
                    fontWeight: 800,
                  },
                  keyId
                )}
              >
                {variant}
              </button>
            );
          })}
        </div>
      ) : null}

{emojiMenu ? (
  <div
    data-accent-menu="true"
    style={{
      position: "absolute",
      top: emojiMenu.top,
      left: emojiMenu.left,
      transform: "translateX(-50%)",
      zIndex: 50,
      display: "grid",
      gridTemplateColumns: "repeat(5, 48px)",
      gridTemplateRows: "repeat(4, 48px)",
      gap: 6,
      padding: 8,
      borderRadius: 16,
      background: "rgba(8,15,35,0.98)",
      border: "1px solid rgba(59,130,246,0.5)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      width: 292,
      maxWidth: "calc(100% - 16px)",
      overflow: "hidden",
      boxSizing: "border-box",
    }}
  >
    {emojiMenu.variants.map((variant) => {
      const keyId = `emoji-${variant}`;
      return (
        <button
          key={variant}
          type="button"
          onMouseEnter={() => setHoveredKey(keyId)}
          onMouseLeave={() => {
            setHoveredKey((prev) => (prev === keyId ? null : prev));
            setPressedKey((prev) => (prev === keyId ? null : prev));
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            setPressedKey(keyId);
          }}
          onMouseUp={() => {
            setPressedKey((prev) => (prev === keyId ? null : prev));
          }}
          onClick={() => {
            insertAtCursor(variant);
            setEmojiMenu(null);
          }}
          style={getInteractiveKeyStyle(
            {
              ...styles.secondaryButton,
              width: 48,
              minWidth: 48,
              height: 48,
              minHeight: 48,
              padding: 0,
              fontSize: 22,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            keyId
          )}
        >
          {variant}
        </button>
      );
    })}
  </div>
) : null}

      {punctuationMenu ? (
        <div
          data-accent-menu="true"
          style={{
            position: "absolute",
            top: punctuationMenu.top,
            left: punctuationMenu.left,
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(4, punctuationMenu.variants.length)}, 48px)`,
            gap: 6,
            padding: 8,
            borderRadius: 16,
            background: "rgba(8,15,35,0.98)",
            border: "1px solid rgba(59,130,246,0.5)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            maxWidth: "calc(100% - 16px)",
          }}
        >
          {punctuationMenu.variants.map((variant) => {
            const keyId = `punct-${variant}`;
            return (
              <button
                key={variant}
                type="button"
                onMouseEnter={() => setHoveredKey(keyId)}
                onMouseLeave={() => {
                  setHoveredKey((prev) => (prev === keyId ? null : prev));
                  setPressedKey((prev) => (prev === keyId ? null : prev));
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setPressedKey(keyId);
                }}
                onMouseUp={() => {
                  setPressedKey((prev) => (prev === keyId ? null : prev));
                }}
                onClick={() => {
                  insertAtCursor(variant);
                  setPunctuationMenu(null);
                }}
                style={getInteractiveKeyStyle(
                  {
                    ...styles.secondaryButton,
                    minWidth: 48,
                    minHeight: 48,
                    padding: "8px 10px",
                    fontSize: 22,
                    fontWeight: 800,
                  },
                  keyId
                )}
              >
                {variant}
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: gapSize }}>
        {displayedRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
              gap: gapSize,
            }}
          >
            {row.map((item, itemIndex) => {
              const isAccentable =
                keyboardMode === "letters" && Boolean(ACCENT_OPTIONS[item]);
              const keyId = `key-${keyboardMode}-${rowIndex}-${itemIndex}-${item}`;

              return (
                <button
                  key={`${item}-${itemIndex}`}
                  type="button"
                  onMouseEnter={() => setHoveredKey(keyId)}
                  onMouseLeave={() => {
                    setHoveredKey((prev) => (prev === keyId ? null : prev));
                    setPressedKey((prev) => (prev === keyId ? null : prev));
                    clearLongPressTimer();
                    stopDeleteHold();
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setPressedKey(keyId);
                    if (item === "⌫") {
                      backspaceHoldTimeoutRef.current = window.setTimeout(() => {
                        startDeleteHold();
                      }, 350);
                    }
                    if (isAccentable) {
                      startLongPress(item, event);
                    }
                  }}
                  onMouseUp={(event) => {
                    event.preventDefault();
                    const wasDeleting = item === "⌫" && Boolean(deleteRepeatTimerRef.current);
                    stopDeleteHold();
                    setPressedKey((prev) => (prev === keyId ? null : prev));
                    const wasLongPress = isAccentable ? stopLongPress() : false;
                    if (wasLongPress || wasDeleting) return;
                    handleKeyPress(item);
                  }}
                  onTouchStart={(event) => {
                    setPressedKey(keyId);
                    if (item === "⌫") {
                      backspaceHoldTimeoutRef.current = window.setTimeout(() => {
                        startDeleteHold();
                      }, 350);
                    }
                    if (isAccentable) {
                      startLongPress(item, event);
                    }
                  }}
                  onTouchEnd={(event) => {
                    event.preventDefault();
                    const wasDeleting = item === "⌫" && Boolean(deleteRepeatTimerRef.current);
                    stopDeleteHold();
                    setPressedKey((prev) => (prev === keyId ? null : prev));
                    const wasLongPress = isAccentable ? stopLongPress() : false;
                    if (wasLongPress || wasDeleting) return;
                    handleKeyPress(item);
                  }}
                  style={getInteractiveKeyStyle(
                    {
                      ...styles.secondaryButton,
                      minHeight: keyMinHeight,
                      fontSize: keyFontSize,
                      fontWeight: 800,
                      padding: keyPadding,
                    },
                    keyId
                  )}
                >
                  {renderKeyLabel(item)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "auto 1fr auto auto auto",
    gap: gapSize,
  }}
>
  <button
    type="button"
    onMouseEnter={() => setHoveredKey("emoji")}
    onMouseLeave={() => {
      setHoveredKey((prev) => (prev === "emoji" ? null : prev));
      setPressedKey((prev) => (prev === "emoji" ? null : prev));
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      setPressedKey("emoji");
    }}
    onMouseUp={() => {
      setPressedKey((prev) => (prev === "emoji" ? null : prev));
    }}
    onClick={toggleEmojiMenu}
    style={getInteractiveKeyStyle(
      {
        ...styles.secondaryButton,
        minHeight: actionMinHeight,
        padding: "8px 16px",
        fontSize: 18,
        fontWeight: 800,
      },
      "emoji"
    )}
  >
    😀
  </button>

  <button
    type="button"
    onMouseEnter={() => setHoveredKey("space")}
    onMouseLeave={() => {
      setHoveredKey((prev) => (prev === "space" ? null : prev));
      setPressedKey((prev) => (prev === "space" ? null : prev));
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      setPressedKey("space");
    }}
    onMouseUp={() => {
      setPressedKey((prev) => (prev === "space" ? null : prev));
    }}
    onClick={addSpace}
    style={getInteractiveKeyStyle(
      {
        ...styles.primaryButton,
        minHeight: actionMinHeight,
        padding: isCompactScreen ? "8px 10px" : undefined,
      },
      "space"
    )}
  >
    Espace
  </button>

  <button
    type="button"
    onMouseEnter={() => setHoveredKey("enter")}
    onMouseLeave={() => {
      setHoveredKey((prev) => (prev === "enter" ? null : prev));
      setPressedKey((prev) => (prev === "enter" ? null : prev));
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      setPressedKey("enter");
    }}
    onMouseUp={() => {
      setPressedKey((prev) => (prev === "enter" ? null : prev));
    }}
    onClick={() => insertAtCursor("\n")}
    style={getInteractiveKeyStyle(
      {
        ...styles.primaryButton,
        minHeight: actionMinHeight,
        padding: "8px 16px",
        fontSize: 18,
        fontWeight: 800,
      },
      "enter"
    )}
  >
    ↵ Entrée
  </button>

  <button
    type="button"
    onMouseEnter={() => setHoveredKey("apostrophe")}
    onMouseLeave={() => {
      setHoveredKey((prev) => (prev === "apostrophe" ? null : prev));
      setPressedKey((prev) => (prev === "apostrophe" ? null : prev));
      clearLongPressTimer();
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      setPressedKey("apostrophe");
      startApostropheLongPress(event);
    }}
    onMouseUp={(event) => {
      event.preventDefault();
      setPressedKey((prev) => (prev === "apostrophe" ? null : prev));
      const wasLongPress = stopLongPress();
      if (wasLongPress) return;
      insertAtCursor("'");
    }}
    style={getInteractiveKeyStyle(
      {
        ...styles.secondaryButton,
        minHeight: actionMinHeight,
        padding: "8px 16px",
        fontSize: 18,
        fontWeight: 800,
      },
      "apostrophe"
    )}
  >
    '
  </button>

  <button
    type="button"
    onMouseEnter={() => setHoveredKey("dot")}
    onMouseLeave={() => {
      setHoveredKey((prev) => (prev === "dot" ? null : prev));
      setPressedKey((prev) => (prev === "dot" ? null : prev));
      clearLongPressTimer();
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      setPressedKey("dot");
      startPunctuationLongPress(event);
    }}
    onMouseUp={(event) => {
      event.preventDefault();
      setPressedKey((prev) => (prev === "dot" ? null : prev));
      const wasLongPress = stopLongPress();
      if (wasLongPress) return;
      insertAtCursor(".");
    }}
    style={getInteractiveKeyStyle(
      {
        ...styles.secondaryButton,
        minHeight: actionMinHeight,
        padding: "8px 16px",
        fontSize: 18,
        fontWeight: 800,
      },
      "dot"
    )}
  >
    .
  </button>
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
          gap: gapSize,
        }}
      >
        <button
          type="button"
          onMouseEnter={() => setHoveredKey("clear")}
          onMouseLeave={() => {
            setHoveredKey((prev) => (prev === "clear" ? null : prev));
            setPressedKey((prev) => (prev === "clear" ? null : prev));
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            setPressedKey("clear");
          }}
          onMouseUp={() => {
            setPressedKey((prev) => (prev === "clear" ? null : prev));
          }}
          onClick={clearAll}
          style={getInteractiveKeyStyle(
            {
              ...styles.deleteButton,
              minHeight: actionMinHeight,
              padding: isCompactScreen ? "8px 10px" : undefined,
            },
            "clear"
          )}
        >
          Effacer
        </button>
        <button
          type="button"
          onMouseEnter={() => setHoveredKey("listen")}
          onMouseLeave={() => {
            setHoveredKey((prev) => (prev === "listen" ? null : prev));
            setPressedKey((prev) => (prev === "listen" ? null : prev));
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            setPressedKey("listen");
          }}
          onMouseUp={() => {
            setPressedKey((prev) => (prev === "listen" ? null : prev));
          }}
          onClick={() => speakText(text)}
          disabled={!String(text || "").trim()}
          style={getInteractiveKeyStyle(
            {
              ...styles.primaryButton,
              minHeight: actionMinHeight,
              padding: isCompactScreen ? "8px 10px" : undefined,
            },
            "listen"
          )}
        >
          ▶️ Écouter
        </button>
        <button
          type="button"
          onMouseEnter={() => setHoveredKey("stop")}
          onMouseLeave={() => {
            setHoveredKey((prev) => (prev === "stop" ? null : prev));
            setPressedKey((prev) => (prev === "stop" ? null : prev));
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            setPressedKey("stop");
          }}
          onMouseUp={() => {
            setPressedKey((prev) => (prev === "stop" ? null : prev));
          }}
          onClick={stopSpeaking}
          style={getInteractiveKeyStyle(
            {
              ...styles.secondaryButton,
              minHeight: actionMinHeight,
              padding: isCompactScreen ? "8px 10px" : undefined,
            },
            "stop"
          )}
        >
          ⏹️ Stop voix
        </button>
      </div>
    </div>
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
    exportAllProfiles,
    importAllProfiles,
    fileInputRef,
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
    aiGeneratedText,
    aiLoading,
    aiError,
    aiUsage,
    aiStatusLoading,
    generateTextWithAI,
    setAiGeneratedText,
    goToCreditsPage,
    selectedSmsContactId,
    setSelectedSmsContactId,
  } = props;
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [inputMode, setInputMode] = React.useState("standard");
  const [autoAiEnabled, setAutoAiEnabled] = React.useState(true);
  const [tone, setTone] = React.useState("naturel");
  const [audience, setAudience] = React.useState("général");
  const [isPhraseBrowserOpen, setIsPhraseBrowserOpen] = React.useState(false);
  const [phraseBrowserCategory, setPhraseBrowserCategory] = React.useState("");
  const phraseBrowserRef = React.useRef(null);
  const standardTextAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const lastAutoAiPromptRef = React.useRef("");

  const [sendMode, setSendMode] = React.useState("sms");
  const [selectedSendContactId, setSelectedSendContactId] = React.useState(
    emergencyContacts?.[0]?.id || ""
  );

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

  React.useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (!autoAiEnabled) return;
      if (aiUsage?.blocked) return;
      if (!text.trim()) return;
      if (aiLoading) return;

      const result = await generateTextWithAI();
      if (result && result !== text) {
        setText(formatTextSmart(result));
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [text, autoAiEnabled, aiUsage?.blocked, aiLoading, generateTextWithAI, setText]);

  const aiAssist = React.useMemo(() => {
    const currentValue = normalizeTextFormatting(String(text || "")).trim();
    const generatedValue = normalizeTextFormatting(String(aiGeneratedText || "")).trim();

    if (!generatedValue) {
      return {
        correction: "",
        completion: "",
        hasDifferentCorrection: false,
      };
    }

    const lowerCurrent = currentValue.toLowerCase();
    const lowerGenerated = generatedValue.toLowerCase();
    const completion =
      lowerCurrent && lowerGenerated.startsWith(lowerCurrent)
        ? generatedValue.slice(currentValue.length).trimStart()
        : "";

    return {
      correction: generatedValue,
      completion,
      hasDifferentCorrection: generatedValue !== currentValue,
    };
  }, [text, aiGeneratedText]);

  const activeProfile = React.useMemo(() => {
    return (
      (profiles || []).find((profile) => profile.id === currentProfileId) ||
      currentProfile ||
      {}
    );
  }, [profiles, currentProfileId, currentProfile]);

  const savedPhrases = React.useMemo(() => {
    const candidates =
      activeProfile?.phrases ||
      activeProfile?.buttons ||
      activeProfile?.phraseButtons ||
      activeProfile?.quickPhrases ||
      activeProfile?.messages ||
      [];

    if (!Array.isArray(candidates)) return [];

    return candidates
      .map((item, index) => {
        if (typeof item === "string") {
          return {
            id: `phrase-${index}`,
            label: item,
            text: item,
            category: "Général",
          };
        }

        const phraseText =
          item?.text ||
          item?.phrase ||
          item?.message ||
          item?.content ||
          item?.value ||
          item?.label ||
          "";

        const phraseLabel = item?.label || phraseText || `Phrase ${index + 1}`;
        const phraseCategory = item?.category || item?.group || "Général";

        if (!phraseText && !phraseLabel) return null;

        return {
          id: item?.id || `phrase-${index}`,
          label: phraseLabel,
          text: phraseText || phraseLabel,
          category: phraseCategory,
        };
      })
      .filter(Boolean);
  }, [activeProfile]);

  const phraseBrowserCategories = React.useMemo(() => {
    return Array.from(
      new Set(savedPhrases.map((phrase) => phrase.category).filter(Boolean))
    );
  }, [savedPhrases]);

  const filteredSavedPhrases = React.useMemo(() => {
    if (!phraseBrowserCategory) return [];
    return savedPhrases.filter(
      (phrase) => String(phrase.category || "") === phraseBrowserCategory
    );
  }, [savedPhrases, phraseBrowserCategory]);

  React.useEffect(() => {
    if (
      phraseBrowserCategory &&
      !phraseBrowserCategories.includes(phraseBrowserCategory)
    ) {
      setPhraseBrowserCategory("");
    }
  }, [phraseBrowserCategories, phraseBrowserCategory]);

  React.useEffect(() => {
    function handlePointerDown(event) {
      if (!isPhraseBrowserOpen) return;
      const target = event.target;
      if (
        phraseBrowserRef.current &&
        target instanceof Node &&
        phraseBrowserRef.current.contains(target)
      ) {
        return;
      }
      setIsPhraseBrowserOpen(false);
      setPhraseBrowserCategory("");
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isPhraseBrowserOpen]);

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
      window.alert("Ajoute d'abord un numéro de contact dans Profil.");
      return;
    }

    const message = (aiGeneratedText || text || "").trim();

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

  if (page === "profil") {
    const compactCard = createCompactCardStyle(styles.card, {
      marginBottom: 20,
    });

    return (
      <>
        <div
          style={{
            columnCount: window.innerWidth > 1240 ? 3 : window.innerWidth > 820 ? 2 : 1,
            columnGap: 20,
          }}
        >
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
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "dark")}
                style={themeOptionStyle("dark")}
              >
                🌙 Sombre
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "light")}
                style={themeOptionStyle("light")}
              >
                ☀️ Clair
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCurrentProfileField("themeMode", "colorful")
                }
                style={themeOptionStyle("colorful")}
              >
                🎨 Coloré
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "custom")}
                style={themeOptionStyle("custom")}
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

          <div style={styles.inlineButtons}>
            <button style={styles.primaryButton} onClick={createNewProfile}>
              Ajouter un profil
            </button>

            <button
              style={styles.secondaryButton}
              onClick={duplicateCurrentProfile}
            >
              Dupliquer
            </button>

            <button
              style={styles.deleteButton}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Supprimer ce profil
            </button>
          </div>

          <div style={{ height: 20 }} />

          <div style={styles.categoryManagerBox}>
            <h3 style={styles.managerTitle}>Sauvegarde</h3>

            <div style={styles.inlineButtons}>
              <button
                style={styles.secondaryButton}
                onClick={exportAllProfiles}
              >
                Exporter
              </button>

              <label style={styles.importLabel}>
                Importer
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
                Cette action est irréversible. Les informations de ce profil seront supprimées, mais les crédits solidaires resteront disponibles pour les autres profils.
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
          <div style={styles.formGroup}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    window.innerWidth > 980 ? "minmax(0, 1fr)" : "1fr",
                  gap: 12,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      window.innerWidth > 980 ? "minmax(0, 1fr) auto" : "1fr",
                    gridTemplateRows:
                      window.innerWidth > 980 ? "auto auto" : "auto auto auto",
                    alignItems: "stretch",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  {aiError ? (
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.16)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "#fecaca",
                        borderRadius: 16,
                        padding: 14,
                        fontSize: 18,
                        lineHeight: 1.5,
                        minWidth: 0,
                        gridColumn: 1,
                        gridRow: window.innerWidth > 980 ? "1 / span 2" : "auto",
                      }}
                    >
                      {aiError}
                    </div>
                  ) : (
                    <div
                      style={{
                        minHeight: 72,
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 20,
                        lineHeight: 1.5,
                        display: "flex",
                        alignItems: "center",
                        minWidth: 0,
                        gridColumn: 1,
                        gridRow: window.innerWidth > 980 ? "1 / span 2" : "auto",
                      }}
                    >
                      {aiGeneratedText || "La correction et la suite proposées par l’IA apparaîtront ici."}
                    </div>
                  )}

                  <button
                    type="button"
                    style={{
                      ...styles.secondaryButton,
                      width: window.innerWidth > 980 ? "auto" : "100%",
                    }}
                    onClick={() => speakText(aiGeneratedText)}
                    disabled={!aiGeneratedText}
                  >
                    ▶️ Écouter
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.primaryButton,
                      width: window.innerWidth > 980 ? "auto" : "100%",
                    }}
                    onClick={() => {
                      if (!aiGeneratedText) return;
                      lastAutoAiPromptRef.current = "";
                      setText(formatTextSmart(aiGeneratedText));
                    }}
                    disabled={!aiGeneratedText}
                  >
                    Remplacer
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  alignItems: window.innerWidth > 980 ? "flex-end" : "stretch",
                  marginLeft: "auto",
                }}
              >
                <button
                  type="button"
                  onClick={() => setInputMode("standard")}
                  style={{
                    ...(inputMode === "standard"
                      ? styles.primaryButton
                      : styles.secondaryButton),
                    width: window.innerWidth > 980 ? "auto" : "100%",
                  }}
                >
                  Interface classique
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode("keyboard")}
                  style={{
                    ...(inputMode === "keyboard"
                      ? styles.primaryButton
                      : styles.secondaryButton),
                    width: window.innerWidth > 980 ? "auto" : "100%",
                  }}
                >
                  Clavier virtuel
                </button>

              </div>
            </div>
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

                {inputMode === "standard" ? (
                  <>
                    <textarea
                      ref={standardTextAreaRef}
                      value={text}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        lastAutoAiPromptRef.current = "";
                        setText(formatTextSmart(nextValue));

                        if (/\s$/.test(nextValue)) {
                          const typedWords = nextValue
                            .trim()
                            .toLowerCase()
                            .split(/\s+/)
                            .filter(Boolean);

                          const lastTypedWord = typedWords[typedWords.length - 1];
                          if (lastTypedWord) {
                            saveWordToHistory(lastTypedWord);
                          }
                        }
                      }}
                      style={styles.textarea}
                      placeholder="Écrire ici..."
                    />

                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns:
                          window.innerWidth > 900 ? "repeat(3, minmax(0, 1fr))" : "1fr",
                        gap: 12,
                      }}
                    >
                      <button
                        style={isListening ? styles.recordingButton : styles.primaryButton}
                        onClick={isListening ? stopDictation : startDictation}
                      >
                        {isListening ? "Arrêter la dictée" : "🎤 Dicter"}
                      </button>

                      <button
                        style={styles.secondaryButton}
                        onClick={() => speakText(text)}
                      >
                        ▶️ Écouter
                      </button>

                      <button
                        style={styles.secondaryButton}
                        onClick={stopSpeaking}
                      >
                        ⏹️ Stop voix
                      </button>
                    </div>
                  </>
                ) : (
                  <VirtualKeyboard
                    text={text}
                    setText={setText}
                    saveWordToHistory={saveWordToHistory}
                    speakText={speakText}
                    stopSpeaking={stopSpeaking}
                    styles={styles}
                  />
                )}
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
                  ref={phraseBrowserRef}
                  style={{ display: "grid", gap: 10, position: "relative", justifySelf: "end" }}
                >
                <button
                  type="button"
                  onClick={() => {
                    setIsPhraseBrowserOpen((prev) => !prev);
                    if (isPhraseBrowserOpen) {
                      setPhraseBrowserCategory("");
                    }
                  }}
                  style={
                    isPhraseBrowserOpen
                      ? styles.primaryButton
                      : styles.secondaryButton
                  }
                >
                  Phrases enregistrées
                </button>

                {isPhraseBrowserOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 8,
                      display: "flex",
                      alignItems: "flex-start",
                      zIndex: 40,
                    }}
                  >
                    <div
                      style={{
                        ...styles.card,
                        padding: 10,
                        minWidth: 220,
                        maxHeight: 320,
                        overflowY: "auto",
                        display: "grid",
                        gap: 8,
                        borderTopRightRadius: phraseBrowserCategory ? 8 : 22,
                        borderBottomRightRadius: phraseBrowserCategory ? 8 : 22,
                      }}
                    >
                      {phraseBrowserCategories.length > 0 ? (
                        phraseBrowserCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onMouseEnter={() => setPhraseBrowserCategory(cat)}
                            onClick={() => setPhraseBrowserCategory(cat)}
                            style={
                              phraseBrowserCategory === cat
                                ? {
                                    ...styles.primaryButton,
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    justifyContent: "space-between",
                                  }
                                : {
                                    ...styles.secondaryButton,
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    justifyContent: "space-between",
                                  }
                            }
                          >
                            <span>{cat}</span>
                            <span style={{ opacity: 0.72 }}>›</span>
                          </button>
                        ))
                      ) : (
                        <div style={{ ...styles.text, opacity: 0.72, fontSize: 14 }}>
                          Aucune catégorie enregistrée.
                        </div>
                      )}
                    </div>

                    {phraseBrowserCategory ? (
                      <div
                        style={{
                          ...styles.card,
                          marginLeft: 6,
                          padding: 10,
                          minWidth: 260,
                          maxWidth: 320,
                          maxHeight: 320,
                          overflowY: "auto",
                          display: "grid",
                          gap: 8,
                          borderTopLeftRadius: 8,
                          borderBottomLeftRadius: 8,
                        }}
                      >
                        {filteredSavedPhrases.length > 0 ? (
                          filteredSavedPhrases.map((phrase) => (
                            <button
                              key={phrase.id}
                              type="button"
                              onClick={() => {
                                const phraseValue = String(phrase.text || phrase.label || "");
                                setText((prev) => {
                                  const current = String(prev || "");
                                  if (!current.trim()) {
                                    return formatTextSmart(phraseValue);
                                  }
                                  const result = /\s$/.test(current)
                                    ? `${current}${phraseValue}`
                                    : `${current} ${phraseValue}`;
                                  return formatTextSmart(result);
                                });
                                setLabel(String(phrase.label || phrase.text || ""));
                                setCategory(String(phrase.category || "Général"));
                                setIsPhraseBrowserOpen(false);
                              }}
                              style={{
                                ...styles.secondaryButton,
                                textAlign: "left",
                                padding: "10px 12px",
                                display: "grid",
                                gap: 4,
                              }}
                            >
                              <span style={{ fontWeight: 800 }}>
                                {phrase.label || phrase.text}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  opacity: 0.78,
                                  fontWeight: 500,
                                }}
                              >
                                {phrase.category || "Général"}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div style={{ ...styles.text, opacity: 0.72, fontSize: 14 }}>
                            Aucune phrase dans cette catégorie.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                </div>

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

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                window.innerWidth > 1400
                  ? "minmax(0, 1fr) minmax(0, 1fr)"
                  : "1fr",
              gap: 14,
              marginTop: 12,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                ...styles.card,
                padding: 14,
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 1400
                    ? "minmax(240px, 1.25fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr)"
                    : "1fr",
                gap: 14,
                alignItems: "end",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
                onClick={generateTextWithAI}
                disabled={aiLoading || !text.trim()}
              >
                {aiLoading
                  ? "Génération..."
                  : aiUsage?.blocked
                  ? "✨ Acheter des crédits pour continuer"
                  : "✨ Générer par IA"}
              </button>

              <div style={{ ...styles.formGroup, minWidth: 0 }}>
                <label style={styles.label}>Ton</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    ...styles.input,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="naturel">Naturel</option>
                  <option value="professionnel">Professionnel</option>
                  <option value="humour">Humour</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              <div style={{ ...styles.formGroup, minWidth: 0 }}>
                <label style={styles.label}>À qui je parle</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  style={{
                    ...styles.input,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="général">Général</option>
                  <option value="ami">Ami</option>
                  <option value="famille">Famille</option>
                  <option value="soignant">Soignant</option>
                  <option value="aidant">Aidant</option>
                </select>
              </div>
            </div>

            <div
              style={{
                ...styles.card,
                padding: 14,
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 1400
                    ? "minmax(220px, 1.1fr) minmax(170px, 0.8fr) minmax(220px, 0.9fr)"
                    : "1fr",
                gap: 14,
                alignItems: "end",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div style={{ ...styles.formGroup, minWidth: 0 }}>
                <label style={styles.label}>Libellé du bouton</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{
                    ...styles.input,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                  placeholder="Ex : Besoin d'eau"
                />
              </div>

              <div style={{ ...styles.formGroup, minWidth: 0 }}>
                <label style={styles.label}>Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    ...styles.input,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {(categories || []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <button
                style={{
                  ...styles.primaryButton,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
                onClick={savePhrase}
              >
                Enregistrer la phrase
              </button>
            </div>
          </div>

        </div>

        <div style={styles.card}>
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
      </div>
    );
  }

  return null;
}