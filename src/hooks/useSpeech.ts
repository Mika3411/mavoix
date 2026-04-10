import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Phrase, VoiceSettings } from "../types";

export default function useSpeech({
  language = "fr-FR",
  defaultVoice = "default",
  defaultVoiceSettings = { rate: 1, pitch: 1, volume: 1 },
  savedPhrases = [],
  audioMap = {},
  setText,
}) {
  const recognitionRef = useRef(null);
  const [voices, setVoices] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState({});
  const [isListening, setIsListening] = useState(false);

  const normalizedLanguage = useMemo(() => language || "fr-FR", [language]);

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

  const markVoiceStatus = useCallback((voiceURI, status) => {
    if (!voiceURI) return;

    setVoiceStatus((prev) => {
      if (prev[voiceURI] === status) return prev;
      return {
        ...prev,
        [voiceURI]: status,
      };
    });
  }, []);

  const getReliableFallbackVoice = useCallback(
    (preferredLang = normalizedLanguage) => {
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
    (voiceURI) => {
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
    (voiceURI, sampleText = "Bonjour, ceci est un test de voix.") => {
      return new Promise((resolve) => {
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

        const finalize = (success) => {
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
    [markVoiceStatus, normalizedLanguage, resolveVoiceByURI]
  );

  const speakText = useCallback(
    async (phrase, voiceURI = defaultVoice, phraseId = null, overrideSettings = null) => {
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
    ]
  );

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

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
