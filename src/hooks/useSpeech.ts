import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

type Phrase = {
  id?: string | number;
  text?: string;
  label?: string;
  assignedVoice?: string;
  voiceSettings?: VoiceSettings;
  useProfileVoiceSettings?: boolean;
};

type VoiceSettings = {
  rate?: number;
  pitch?: number;
  volume?: number;
};

type VoiceItem = {
  name: string;
  lang: string;
  voiceURI: string;
};

type UseSpeechParams = {
  language?: string;
  setText: (text: string) => void;
  defaultVoice?: string;
  defaultVoiceSettings?: VoiceSettings;
  savedPhrases?: Phrase[];
  audioMap?: Record<string, string>;
};

export default function useSpeech({
  language = "fr-FR",
  setText,
  defaultVoice,
  defaultVoiceSettings,
  savedPhrases,
  audioMap,
}: UseSpeechParams) {
  const recognitionRef = useRef<any>(null);
  const nativePartialListenerRef = useRef<any>(null);
  const nativeFinalListenerRef = useRef<any>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<VoiceItem[]>([]);

  const isNative = Capacitor.isNativePlatform();

  const mergedVoiceStatus = useMemo(() => {
    return {
      global: "Prêt",
      ...voiceStatus,
    };
  }, [voiceStatus]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices() || [];
        const formatted = availableVoices
          .filter((voice) => !!voice)
          .map((voice) => ({
            name: voice.name || voice.voiceURI || "Voix",
            lang: voice.lang || "",
            voiceURI: voice.voiceURI || voice.name || "default",
          }));

        const unique = formatted.filter(
          (voice, index, arr) =>
            arr.findIndex((v) => v.voiceURI === voice.voiceURI) === index
        );

        setVoices(unique);
      } catch (error) {
        console.error("Erreur chargement voix", error);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const retry1 = window.setTimeout(loadVoices, 300);
    const retry2 = window.setTimeout(loadVoices, 1200);

    return () => {
      window.clearTimeout(retry1);
      window.clearTimeout(retry2);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        nativePartialListenerRef.current?.remove?.();
      } catch {}
      try {
        nativeFinalListenerRef.current?.remove?.();
      } catch {}
      try {
        recognitionRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const setVoiceState = (voiceId: string | undefined, state: string) => {
    const key = voiceId || "default";
    setVoiceStatus((prev) => ({
      ...prev,
      [key]: state,
      global: state,
    }));
  };

  const startNativeDictation = async () => {
    try {
      const available = await SpeechRecognition.available();
      if (!available.available) {
        setVoiceState("default", "Dictée non disponible");
        return;
      }

      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== "granted") {
        setVoiceState("default", "Permission refusée");
        return;
      }

      try {
        nativePartialListenerRef.current?.remove?.();
      } catch {}
      try {
        nativeFinalListenerRef.current?.remove?.();
      } catch {}

      nativePartialListenerRef.current = await SpeechRecognition.addListener(
        "partialResults",
        (data: any) => {
          const text = (data.matches || []).join(" ").trim();
          if (text) {
            setText(text);
            setVoiceState("default", "Écoute...");
          }
        }
      );

      nativeFinalListenerRef.current = await SpeechRecognition.addListener(
        "listeningState",
        (data: any) => {
          if (data.status === "started") {
            setIsListening(true);
            setVoiceState("default", "Écoute...");
          }

          if (data.status === "stopped") {
            setIsListening(false);
            setVoiceState("default", "Arrêté");
          }
        }
      );

      setIsListening(true);
      setVoiceState("default", "Écoute...");

      const result = await SpeechRecognition.start({
        language,
        maxResults: 5,
        partialResults: true,
        popup: true,
      } as any);

      const text = (result?.matches || []).join(" ").trim();
      if (text) {
        setText(text);
      }
    } catch (e) {
      console.error(e);
      setVoiceState("default", "Erreur dictée");
      setIsListening(false);
    }
  };

  const startWebDictation = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      setVoiceState("default", "Non supporté");
      return;
    }

    const rec = new SR();
    rec.lang = language;
    rec.interimResults = true;
    rec.continuous = true;

    rec.onstart = () => {
      setIsListening(true);
      setVoiceState("default", "Écoute...");
    };

    rec.onend = () => {
      setIsListening(false);
      setVoiceState("default", "Arrêté");
    };

    rec.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();

      if (text) setText(text);
    };

    rec.onerror = () => {
      setVoiceState("default", "Erreur dictée");
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const startDictation = async () => {
    if (isListening) return;

    if (isNative) {
      await startNativeDictation();
    } else {
      startWebDictation();
    }
  };

  const stopDictation = async () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}

    try {
      await SpeechRecognition.stop();
    } catch {}

    try {
      nativePartialListenerRef.current?.remove?.();
    } catch {}
    try {
      nativeFinalListenerRef.current?.remove?.();
    } catch {}

    nativePartialListenerRef.current = null;
    nativeFinalListenerRef.current = null;

    setIsListening(false);
    setVoiceState("default", "Arrêté");
  };

  const speakAudioFile = async (audioUrl?: string, voiceId?: string) => {
    if (!audioUrl) return false;

    try {
      const audio = new Audio(audioUrl);
      setVoiceState(voiceId, "Lecture...");
      audio.onended = () => setVoiceState(voiceId, "Prêt");
      audio.onerror = () => setVoiceState(voiceId, "Erreur lecture");
      await audio.play();
      return true;
    } catch (error) {
      console.error("Erreur lecture audio", error);
      setVoiceState(voiceId, "Erreur lecture");
      return false;
    }
  };

  const speakNative = async (
    text: string,
    voiceId?: string,
    settings?: VoiceSettings | null
  ) => {
    try {
      setVoiceState(voiceId, "Lecture...");
      await TextToSpeech.speak({
        text,
        lang: language || "fr-FR",
        rate: settings?.rate ?? defaultVoiceSettings?.rate ?? 1,
        pitch: settings?.pitch ?? defaultVoiceSettings?.pitch ?? 1,
        volume: settings?.volume ?? defaultVoiceSettings?.volume ?? 1,
        category: "ambient",
      } as any);
      setVoiceState(voiceId, "Prêt");
    } catch (error) {
      console.error("Erreur TTS native", error);
      setVoiceState(voiceId, "failed");
    }
  };

  const speakWeb = (
    text: string,
    voiceId?: string,
    settings?: VoiceSettings | null
  ) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceState(voiceId, "failed");
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language || "fr-FR";
      utterance.rate = settings?.rate ?? defaultVoiceSettings?.rate ?? 1;
      utterance.pitch = settings?.pitch ?? defaultVoiceSettings?.pitch ?? 1;
      utterance.volume = settings?.volume ?? defaultVoiceSettings?.volume ?? 1;

      const availableVoices = window.speechSynthesis.getVoices() || [];
      const selectedVoiceId =
        voiceId && voiceId !== "default" ? voiceId : defaultVoice;

      if (selectedVoiceId && selectedVoiceId !== "default") {
        const matched = availableVoices.find(
          (v) => v.voiceURI === selectedVoiceId || v.name === selectedVoiceId
        );
        if (matched) utterance.voice = matched;
      }

      utterance.onstart = () => setVoiceState(voiceId, "Lecture...");
      utterance.onend = () => setVoiceState(voiceId, "Prêt");
      utterance.onerror = () => setVoiceState(voiceId, "failed");

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Erreur TTS web", error);
      setVoiceState(voiceId, "failed");
    }
  };

  const speakText = async (
    text: string,
    voiceId?: string,
    phraseId?: string | number | null,
    customSettings?: VoiceSettings | null
  ) => {
    if (!text?.trim()) return;

    const audioKey = phraseId != null ? String(phraseId) : "";
    const audioUrl = audioKey ? audioMap?.[audioKey] : undefined;

    if (audioUrl) {
      const played = await speakAudioFile(audioUrl, voiceId);
      if (played) return;
    }

    const settings = customSettings ?? null;

    if (isNative) {
      await speakNative(text, voiceId, settings);
      return;
    }

    speakWeb(text, voiceId, settings);
  };

  const stopSpeaking = async () => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      try {
        await TextToSpeech.stop();
      } catch {}
    } finally {
      setVoiceState("default", "Lecture arrêtée");
    }
  };

  const testVoice = async (voiceId?: string) => {
    await speakText("Bonjour, ceci est un test de voix.", voiceId);
  };

  return {
    voices,
    voiceStatus: mergedVoiceStatus,
    isListening,
    startDictation,
    stopDictation,
    testVoice,
    speakText,
    stopSpeaking,
  };
}
