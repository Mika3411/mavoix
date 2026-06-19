import type { CSSProperties } from "react";

export function createCompactCardStyle(
  baseStyle: CSSProperties,
  overrides: CSSProperties = {}
): CSSProperties {
  return {
    ...baseStyle,
    display: "inline-block",
    width: "100%",
    boxSizing: "border-box",
    breakInside: "avoid",
    pageBreakInside: "avoid",
    verticalAlign: "top",
    ...overrides,
  };
}

export function createCompactSectionTitleStyle(
  baseStyle: CSSProperties,
  overrides: CSSProperties = {}
): CSSProperties {
  return {
    ...baseStyle,
    fontSize: 20,
    marginBottom: 12,
    lineHeight: 1.25,
    ...overrides,
  };
}
