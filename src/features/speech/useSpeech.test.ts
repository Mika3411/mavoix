import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  communitySpeak: vi.fn(),
  communityStop: vi.fn(),
  getPlatform: vi.fn(),
  isNativePlatform: vi.fn(),
  nativeSpeak: vi.fn(),
  nativeStop: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: mocks.getPlatform,
    isNativePlatform: mocks.isNativePlatform,
  },
  registerPlugin: vi.fn(() => ({
    speak: mocks.nativeSpeak,
    stop: mocks.nativeStop,
  })),
}));

vi.mock("@capacitor-community/text-to-speech", () => ({
  QueueStrategy: {
    Flush: "flush",
  },
  TextToSpeech: {
    speak: mocks.communitySpeak,
    stop: mocks.communityStop,
  },
}));

import useSpeech from "./useSpeech";

type UseSpeechResult = ReturnType<typeof useSpeech>;
type UseSpeechOptions = Parameters<typeof useSpeech>[0];

function renderUseSpeech(options: UseSpeechOptions = {}): UseSpeechResult {
  let result: UseSpeechResult | null = null;

  function Probe() {
    result = useSpeech(options);
    return null;
  }

  renderToString(React.createElement(Probe));

  if (!result) {
    throw new Error("useSpeech did not render");
  }

  return result;
}

describe("useSpeech", () => {
  beforeEach(() => {
    mocks.communitySpeak.mockResolvedValue(undefined);
    mocks.communityStop.mockResolvedValue(undefined);
    mocks.getPlatform.mockReturnValue("ios");
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.nativeSpeak.mockResolvedValue(undefined);
    mocks.nativeStop.mockResolvedValue(undefined);
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses native iOS TTS before checking browser speechSynthesis", async () => {
    const speech = renderUseSpeech({
      defaultVoiceSettings: { rate: 1.1, pitch: 0.9, volume: 0.7 },
      savedPhrases: [
        {
          id: "phrase-1",
          label: "Bonjour",
          text: "Bonjour",
          category: "Favoris",
          voiceSettings: { rate: 1.4, pitch: 1.2, volume: 0.6 },
        },
      ],
    });

    await speech.speakText("  Bonjour   Alice  ", null, "phrase-1");

    expect(mocks.nativeStop).toHaveBeenCalledTimes(1);
    expect(mocks.nativeSpeak).toHaveBeenCalledWith({
      text: "Bonjour Alice",
      lang: "fr-FR",
      rate: 1.4,
      pitch: 1.2,
      volume: 0.6,
    });
    expect(mocks.communitySpeak).not.toHaveBeenCalled();
    expect(globalThis.alert).not.toHaveBeenCalled();
  });

  it("keeps the browser availability warning for non-native platforms", async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.getPlatform.mockReturnValue("web");

    const speech = renderUseSpeech();

    await speech.speakText("Bonjour");

    expect(mocks.nativeSpeak).not.toHaveBeenCalled();
    expect(globalThis.alert).toHaveBeenCalledWith(
      "La synthèse vocale n'est pas disponible sur ce navigateur."
    );
  });
});
