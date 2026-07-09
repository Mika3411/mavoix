type SegmentData = {
  index: number;
  segment: string;
};

type GraphemeSegmenter = {
  segment(value: string): Iterable<SegmentData>;
};

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (
    locales?: string | string[],
    options?: { granularity?: "grapheme" | "word" | "sentence" }
  ) => GraphemeSegmenter;
};

type TextRange = {
  start: number;
  end: number;
};

export type TextDeletionResult = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

const GRAPHEME_SEGMENTER = createGraphemeSegmenter();
const ZERO_WIDTH_JOINER = 0x200d;

export function deletePreviousGrapheme(
  value: string,
  cursorIndex: number
): TextDeletionResult {
  const text = String(value || "");
  const deleteEnd = clampIndex(cursorIndex, text.length);

  if (deleteEnd <= 0) {
    return {
      text,
      selectionStart: 0,
      selectionEnd: 0,
    };
  }

  const deleteRange = getPreviousGraphemeRange(text, deleteEnd);
  const nextText = `${text.slice(0, deleteRange.start)}${text.slice(deleteRange.end)}`;

  return {
    text: nextText,
    selectionStart: deleteRange.start,
    selectionEnd: deleteRange.start,
  };
}

function createGraphemeSegmenter() {
  const Segmenter = (Intl as IntlWithSegmenter).Segmenter;
  if (!Segmenter) return null;

  try {
    return new Segmenter(undefined, { granularity: "grapheme" });
  } catch {
    return null;
  }
}

function getPreviousGraphemeRange(value: string, cursorIndex: number): TextRange {
  const segmentedRange = getPreviousGraphemeRangeWithSegmenter(
    value,
    cursorIndex
  );

  return segmentedRange || getPreviousGraphemeRangeFallback(value, cursorIndex);
}

function getPreviousGraphemeRangeWithSegmenter(
  value: string,
  cursorIndex: number
) {
  if (!GRAPHEME_SEGMENTER) return null;

  let previousRange: TextRange | null = null;

  for (const part of GRAPHEME_SEGMENTER.segment(value)) {
    const start = part.index;
    const end = start + part.segment.length;

    if (cursorIndex > start && cursorIndex < end) {
      return { start, end };
    }

    if (end <= cursorIndex) {
      previousRange = { start, end };
      continue;
    }

    if (start >= cursorIndex) {
      break;
    }
  }

  return previousRange;
}

function getPreviousGraphemeRangeFallback(
  value: string,
  cursorIndex: number
): TextRange {
  const end = cursorIndex;
  let start = getPreviousCodePointStart(value, end);

  start = includeBaseBeforeTrailingModifiers(value, start);

  while (start > 0) {
    const joinerStart = getPreviousCodePointStart(value, start);
    if (getCodePointAt(value, joinerStart) !== ZERO_WIDTH_JOINER) break;

    start = includeBaseBeforeTrailingModifiers(
      value,
      getPreviousCodePointStart(value, joinerStart)
    );
  }

  return { start, end };
}

function includeBaseBeforeTrailingModifiers(value: string, start: number) {
  let nextStart = start;

  while (nextStart > 0 && isTrailingGraphemeModifier(value, nextStart)) {
    nextStart = getPreviousCodePointStart(value, nextStart);
  }

  return nextStart;
}

function getPreviousCodePointStart(value: string, index: number) {
  let start = Math.max(0, index - 1);

  if (
    start > 0 &&
    isLowSurrogate(value.charCodeAt(start)) &&
    isHighSurrogate(value.charCodeAt(start - 1))
  ) {
    start -= 1;
  }

  return start;
}

function getCodePointAt(value: string, index: number) {
  return value.codePointAt(index) ?? value.charCodeAt(index);
}

function isTrailingGraphemeModifier(value: string, index: number) {
  const codePoint = getCodePointAt(value, index);

  return (
    isVariationSelector(codePoint) ||
    isEmojiModifier(codePoint) ||
    isCombiningMark(codePoint)
  );
}

function isVariationSelector(codePoint: number) {
  return (
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef)
  );
}

function isEmojiModifier(codePoint: number) {
  return codePoint >= 0x1f3fb && codePoint <= 0x1f3ff;
}

function isCombiningMark(codePoint: number) {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function isHighSurrogate(codeUnit: number) {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff;
}

function isLowSurrogate(codeUnit: number) {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff;
}

function clampIndex(index: number, length: number) {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, index));
}
