import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { QueueStrategy, TextToSpeech } from "@capacitor-community/text-to-speech";
import type { Phrase, VoiceSettings } from "../types";

type NativeSpeechOptions = {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
};

type NativeSpeechPlugin = {
  speak(options: NativeSpeechOptions): Promise<void>;
  stop?(): Promise<void>;
};

const NativeSpeech = registerPlugin<NativeSpeechPlugin>("NativeSpeech");

type VoiceStatus = Record<string, "ok" | "failed" | undefined>;

type UseSpeechOptions = {
  language?: string;
  defaultVoice?: string;
  defaultVoiceSettings?: VoiceSettings;
  savedPhrases?: Phrase[];
  audioMap?: Record<string, string>;
  setText?: (value: string) => void;
};

export default function useSpeech({
  language = "fr-FR",
  defaultVoice = "default",
  defaultVoiceSettings = { rate: 1, pitch: 1, volume: 1 },
  savedPhrases = [],
  audioMap = {},
  setText,
}: UseSpeechOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({});
  const [isListening, setIsListening] = useState(false);

  const normalizedLanguage = useMemo(() => language || "fr-FR", [language]);
  const shouldUseNativeTextToSpeech = useMemo(
    () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios",
    []
  );

  const speakWithNativeTextToSpeech = useCallback(
    async (
      phrase: string,
      settings: Partial<VoiceSettings> = defaultVoiceSettings
    ) => {
      const textToSpeak = String(phrase || "").replace(/\s+/g, " ").trim();
      if (!textToSpeak) return;

      const options = {
        text: textToSpeak,
        lang: normalizedLanguage,
        rate: Math.min(2, Math.max(0.5, Number(settings.rate) || 1)),
        pitch: Math.min(2, Math.max(0, Number(settings.pitch) || 1)),
        volume: Math.min(1, Math.max(0, Number(settings.volume) || 1)),
      };

      await NativeSpeech.stop?.().catch(() => undefined);
      try {
        await NativeSpeech.speak(options);
        return;
      } catch (error) {
        console.warn("NativeSpeech failed, falling back to TextToSpeech.", error);
      }

      await TextToSpeech.stop().catch(() => undefined);
      await TextToSpeech.speak({
        ...options,
        category: "playback",
        queueStrategy: QueueStrategy.Flush,
      });
    },
    [defaultVoiceSettings, normalizedLanguage]
  );

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis?.getVoices?.() || [];
      const sortedVoices = [...availableVoices].sort((a, b) => {
        const aIsFr = a.lang?.toLowerCase().startsWith("fr") ? 0 : 1;
        const bIsFr = b.lang?.toLowerCase().startsWith("fr") ? 0 : 1;

        if (aIsFr !== bIsFr) return aIsFr - bIsFr;
        return a.name.localeCompare(b.name);
      });

      setVoices(sortedVoices);
    };

    loadVoices();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.stop?.();
    };
  }, []);

  const markVoiceStatus = useCallback(
    (voiceURI: string | null | undefined, status: "ok" | "failed") => {
    if (!voiceURI) return;

    setVoiceStatus((prev) => {
      if (prev[voiceURI] === status) return prev;
      return {
        ...prev,
        [voiceURI]: status,
      };
    });
    },
    []
  );

  const getReliableFallbackVoice = useCallback(
    (preferredLang = normalizedLanguage): SpeechSynthesisVoice | null => {
      const normalizedLang = String(preferredLang || "fr-FR").toLowerCase();

      const healthyVoices = voices.filter(
        (voice) => voiceStatus[voice.voiceURI] !== "failed"
      );

      const pool = healthyVoices.length > 0 ? healthyVoices : voices;

      return (
        pool.find(
          (voice) =>
            voice.default &&
            voice.lang?.toLowerCase().startsWith(normalizedLang.slice(0, 2))
        ) ||
        pool.find((voice) => voice.lang?.toLowerCase() === normalizedLang) ||
        pool.find((voice) =>
          voice.lang?.toLowerCase().startsWith(normalizedLang.slice(0, 2))
        ) ||
        pool.find((voice) => voice.default) ||
        pool[0] ||
        null
      );
    },
    [normalizedLanguage, voices, voiceStatus]
  );

  const resolveVoiceByURI = useCallback(
    (voiceURI?: string | null): SpeechSynthesisVoice | null => {
      if (!voiceURI || voiceURI === "default") {
        return getReliableFallbackVoice();
      }

      const directMatch = voices.find((voice) => voice.voiceURI === voiceURI);

      if (!directMatch) {
        return getReliableFallbackVoice();
      }

      if (voiceStatus[voiceURI] === "failed") {
        return getReliableFallbackVoice();
      }

      return directMatch;
    },
    [getReliableFallbackVoice, voices, voiceStatus]
  );

  const testVoice = useCallback(
    (voiceURI?: string | null, sampleText = "Bonjour, ceci est un test de voix.") => {
      return new Promise<boolean>((resolve) => {
        if (shouldUseNativeTextToSpeech) {
          speakWithNativeTextToSpeech(sampleText)
            .then(() => resolve(true))
            .catch((error) => {
              console.error(error);
              resolve(false);
            });
          return;
        }

        if (!("speechSynthesis" in window)) {
          resolve(false);
          return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.lang = normalizedLanguage;

        const selectedVoice = resolveVoiceByURI(voiceURI);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        let finished = false;

        const finalize = (success: boolean) => {
          if (finished) return;
          finished = true;

          const uriToStore =
            voiceURI && voiceURI !== "default" ? voiceURI : selectedVoice?.voiceURI;

          if (uriToStore) {
            markVoiceStatus(uriToStore, success ? "ok" : "failed");
          }

          resolve(success);
        };

        const timeoutId = window.setTimeout(() => finalize(false), 4000);

        utterance.onstart = () => {
          const uriToStore =
            voiceURI && voiceURI !== "default" ? voiceURI : selectedVoice?.voiceURI;

          if (uriToStore) {
            markVoiceStatus(uriToStore, "ok");
          }
        };

        utterance.onend = () => {
          window.clearTimeout(timeoutId);
          finalize(true);
        };

        utterance.onerror = () => {
          window.clearTimeout(timeoutId);
          finalize(false);
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (error) {
          console.error(error);
          window.clearTimeout(timeoutId);
          finalize(false);
        }
      });
    },
    [
      markVoiceStatus,
      normalizedLanguage,
      resolveVoiceByURI,
      shouldUseNativeTextToSpeech,
      speakWithNativeTextToSpeech,
    ]
  );

  const speakText = useCallback(
    async (
      phrase: string,
      voiceURI: string | null = defaultVoice,
      phraseId: string | null = null,
      overrideSettings: Partial<VoiceSettings> | null = null
    ) => {
      if (phraseId && audioMap[phraseId]) {
        const audio = new Audio(audioMap[phraseId]);
        await audio.play();
        return;
      }

      if (!phrase?.trim()) return;

      if (!("speechSynthesis" in window)) {
        alert("La synthèse vocale n'est pas disponible sur ce navigateur.");
        return;
      }

      window.speechSynthesis.cancel();

      const phraseSettings = phraseId
        ? savedPhrases.find((item) => item.id === phraseId)?.voiceSettings || null
        : null;

      const resolvedSettings = {
        ...defaultVoiceSettings,
        ...(phraseSettings || {}),
        ...(overrideSettings || {}),
      };

      if (shouldUseNativeTextToSpeech) {
        try {
          await speakWithNativeTextToSpeech(phrase, resolvedSettings);
        } catch (error) {
          console.error(error);
          alert("La voix iOS n'a pas pu lire ce texte.");
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = normalizedLanguage;
      utterance.rate = Math.min(2, Math.max(0.5, Number(resolvedSettings.rate) || 1));
      utterance.pitch = Math.min(2, Math.max(0, Number(resolvedSettings.pitch) || 1));
      utterance.volume = Math.min(1, Math.max(0, Number(resolvedSettings.volume) || 1));

      const requestedVoiceURI =
        voiceURI && voiceURI !== "default"
          ? voiceURI
          : phraseId
            ? savedPhrases.find((item) => item.id === phraseId)?.assignedVoice || defaultVoice
            : defaultVoice;

      const primaryVoice = resolveVoiceByURI(requestedVoiceURI);
      if (primaryVoice) {
        utterance.voice = primaryVoice;
        utterance.lang = primaryVoice.lang || utterance.lang;
      }

      utterance.onstart = () => {
        if (primaryVoice?.voiceURI) {
          markVoiceStatus(primaryVoice.voiceURI, "ok");
        }
      };

      utterance.onerror = async () => {
        if (requestedVoiceURI && requestedVoiceURI !== "default") {
          markVoiceStatus(requestedVoiceURI, "failed");
        }

        const fallbackVoice = getReliableFallbackVoice();

        if (
          !fallbackVoice ||
          (primaryVoice?.voiceURI && fallbackVoice.voiceURI === primaryVoice.voiceURI)
        ) {
          return;
        }

        try {
          window.speechSynthesis.cancel();

          const retry = new SpeechSynthesisUtterance(phrase);
          retry.lang = fallbackVoice.lang || normalizedLanguage;
          retry.voice = fallbackVoice;
          retry.rate = utterance.rate;
          retry.pitch = utterance.pitch;
          retry.volume = utterance.volume;
          retry.onstart = () => markVoiceStatus(fallbackVoice.voiceURI, "ok");
          retry.onerror = () => markVoiceStatus(fallbackVoice.voiceURI, "failed");

          window.speechSynthesis.speak(retry);
        } catch (error) {
          console.error(error);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      audioMap,
      defaultVoice,
      defaultVoiceSettings,
      getReliableFallbackVoice,
      markVoiceStatus,
      normalizedLanguage,
      resolveVoiceByURI,
      savedPhrases,
      shouldUseNativeTextToSpeech,
      speakWithNativeTextToSpeech,
    ]
  );

  const stopSpeaking = useCallback(async () => {
    if (shouldUseNativeTextToSpeech) {
      await NativeSpeech.stop?.().catch(() => undefined);
      await TextToSpeech.stop().catch(() => undefined);
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [shouldUseNativeTextToSpeech]);

  const startDictation = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas disponible sur ce navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = normalizedLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      setText?.(transcript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [normalizedLanguage, setText]);

  const stopDictation = useCallback(() => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  }, []);

  return {
    voices,
    voiceStatus,
    isListening,
    testVoice,
    speakText,
    stopSpeaking,
    startDictation,
    stopDictation,
  };
}
