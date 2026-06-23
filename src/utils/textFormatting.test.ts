import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deleteAbbreviation,
  formatTextSmart,
  normalizeAbbreviationKey,
  normalizeTextFormatting,
  readAbbreviationEntries,
  readExportableAbbreviationDictionary,
  upsertCustomAbbreviation,
} from "./textFormatting";

function createMemoryLocalStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  } as Storage;
}

describe("text formatting", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("uses a custom plural after plural context words and numbers", () => {
    const localStorage = createMemoryLocalStorage();
    vi.stubGlobal("window", { localStorage } as Window);

    const saved = upsertCustomAbbreviation("chev", "cheval", "chevaux");

    expect(saved.pluralExpansion).toBe("chevaux");
    expect(normalizeTextFormatting("chev")).toBe("Cheval");
    expect(normalizeTextFormatting("mes chev")).toBe("Mes chevaux");
    expect(normalizeTextFormatting("les chev")).toBe("Les chevaux");
    expect(normalizeTextFormatting("tes chev")).toBe("Tes chevaux");
    expect(normalizeTextFormatting("ses chev")).toBe("Ses chevaux");
    expect(normalizeTextFormatting("des chev")).toBe("Des chevaux");
    expect(normalizeTextFormatting("ces chev")).toBe("Ces chevaux");
    expect(normalizeTextFormatting("nos chev")).toBe("Nos chevaux");
    expect(normalizeTextFormatting("vos chev")).toBe("Vos chevaux");
    expect(normalizeTextFormatting("leurs chev")).toBe("Leurs chevaux");
    expect(normalizeTextFormatting("aux chev")).toBe("Aux chevaux");
    expect(normalizeTextFormatting("quelques chev")).toBe("Quelques chevaux");
    expect(normalizeTextFormatting("plusieurs chev")).toBe("Plusieurs chevaux");
    expect(normalizeTextFormatting("tous chev")).toBe("Tous chevaux");
    expect(normalizeTextFormatting("toutes chev")).toBe("Toutes chevaux");
    expect(normalizeTextFormatting("deux chev")).toBe("Deux chevaux");
    expect(normalizeTextFormatting("dix chev")).toBe("Dix chevaux");
    expect(normalizeTextFormatting("1 chev")).toBe("1 chevaux");
    expect(normalizeTextFormatting("10 chev")).toBe("10 chevaux");
    expect(normalizeTextFormatting("21 chev")).toBe("21 chevaux");
    expect(normalizeTextFormatting("75 chev")).toBe("75 chevaux");
    expect(normalizeTextFormatting("vingt-deux chev")).toBe("Vingt-deux chevaux");
    expect(normalizeTextFormatting("vingt et un chev")).toBe("Vingt et un chevaux");
    expect(normalizeTextFormatting("vingt-et-un chev")).toBe("Vingt-et-un chevaux");
    expect(normalizeTextFormatting("soixante-douze chev")).toBe(
      "Soixante-douze chevaux"
    );
    expect(normalizeTextFormatting("un chev")).toBe("Un cheval");
    expect(normalizeTextFormatting("mon chev")).toBe("Mon cheval");
    expect(readAbbreviationEntries().find((entry) => entry.abbreviation === "chev"))
      .toMatchObject({
        abbreviation: "chev",
        expansion: "cheval",
        pluralExpansion: "chevaux",
      });
    expect(readExportableAbbreviationDictionary()).toMatchObject({
      custom: { chev: "cheval" },
      plurals: { chev: "chevaux" },
    });

    deleteAbbreviation("chev");

    expect(normalizeTextFormatting("mes chev")).toBe("Mes chev");
  });

  it("does not use a plural context rule when the plural field is empty", () => {
    const localStorage = createMemoryLocalStorage();
    vi.stubGlobal("window", { localStorage } as Window);

    const saved = upsertCustomAbbreviation("chev", "cheval", "");

    expect(saved.pluralExpansion).toBeUndefined();
    expect(normalizeTextFormatting("mes chev")).toBe("Mes cheval");
    expect(readExportableAbbreviationDictionary()).toMatchObject({
      custom: { chev: "cheval" },
      plurals: {},
    });
  });
});
