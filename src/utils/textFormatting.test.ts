import { describe, expect, it } from "vitest";

import {
  formatTextSmart,
  normalizeAbbreviationKey,
  normalizeTextFormatting,
} from "./textFormatting";

describe("text formatting", () => {
  it("normalizes abbreviation keys", () => {
    expect(normalizeAbbreviationKey("  é TÉ  ")).toBe("ete");
  });

  it("expands final abbreviations when normalizing text", () => {
    expect(normalizeTextFormatting("bjr")).toBe("Bonjour");
    expect(normalizeTextFormatting("jtm")).toBe("Je t'aime");
  });

  it("fixes spacing around punctuation without requiring final expansion", () => {
    expect(formatTextSmart("bonjour,ca va?oui")).toBe("Bonjour, ça va? Oui");
  });
});
