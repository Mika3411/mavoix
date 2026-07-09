import { describe, expect, it } from "vitest";

import { deletePreviousGrapheme } from "./textEditing";

describe("text editing", () => {
  it("deletes a surrogate-pair emoji in one backspace", () => {
    const value = "😊💖🤍";
    const cursor = "😊💖".length;

    expect(deletePreviousGrapheme(value, cursor)).toEqual({
      text: "😊🤍",
      selectionStart: "😊".length,
      selectionEnd: "😊".length,
    });
  });

  it("deletes an emoji variation sequence in one backspace", () => {
    expect(deletePreviousGrapheme("Salut ❤️", "Salut ❤️".length)).toEqual({
      text: "Salut ",
      selectionStart: "Salut ".length,
      selectionEnd: "Salut ".length,
    });
  });

  it("keeps regular character deletion unchanged", () => {
    expect(deletePreviousGrapheme("abc", 3)).toEqual({
      text: "ab",
      selectionStart: 2,
      selectionEnd: 2,
    });
  });
});
