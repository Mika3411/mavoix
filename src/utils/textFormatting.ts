export function formatTextSmart(value) {
  if (!value) return value;

  return String(value)
    .replace(/[ \t]+([,;:.!?])/g, "$1")
    .replace(/([,;:.!?])(?!\s|$)/g, "$1 ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(^\s*\w|[\.\!\?]\s*\w|\n\s*\w)/g, (c) => c.toUpperCase());
}

export const normalizeTextFormatting = formatTextSmart;
