import { Capacitor } from "@capacitor/core";
import { useRef, useState } from "react";
import { VoiceRecorder } from "capacitor-voice-recorder";

type Profile = {
  audioMap?: Record<string, string>;
  [key: string]: any;
};

type SetAudioMap =
  | ((next: Record<string, string>) => void)
  | ((updater: (prev: Record<string, string>) => Record<string, string>) => void);

type UseAudioRecordingParams = {
  audioMap?: Record<string, string>;
  setAudioMap?: SetAudioMap;
  updateCurrentProfile?: (updater: (profile: Profile) => Profile) => void;
};

export default function useAudioRecording(params: UseAudioRecordingParams = {}) {
  const { audioMap = {}, setAudioMap, updateCurrentProfile } = params;

  const [recordingPhraseId, setRecordingPhraseId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const pendingPhraseIdRef = useRef<string | null>(null);

  const applyAudioMapUpdate = (
    updater: (currentAudioMap: Record<string, string>) => Record<string, string>
  ) => {
    if (updateCurrentProfile) {
      updateCurrentProfile((profile) => ({
        ...profile,
        audioMap: updater(profile.audioMap || {}),
      }));
      return;
    }

    const nextAudioMap = updater(audioMap);

    if (setAudioMap) {
      try {
        (setAudioMap as any)(nextAudioMap);
        return;
      } catch {}
      try {
        (setAudioMap as any)((prev: Record<string, string>) => updater(prev || {}));
        return;
      } catch {}
    }
  };

  const stopTracks = () => {
    mediaStreamRef.current?.getTracks()?.forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
    mediaStreamRef.current = null;
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const saveRecordedData = async (phraseId: string, dataUrl: string) => {
    applyAudioMapUpdate((currentAudioMap) => ({
      ...currentAudioMap,
      [phraseId]: dataUrl,
    }));
  };

  const startNativeRecording = async (id: string) => {
    try {
      const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
      if (!hasPermission.value) {
        const request = await VoiceRecorder.requestAudioRecordingPermission();
        if (!request.value) {
          alert("Permission micro refusée.");
          return;
        }
      }

      const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
      if (!canRecord.value) {
        alert("Enregistrement non supporté sur cet appareil.");
        return;
      }

      pendingPhraseIdRef.current = id;
      await VoiceRecorder.startRecording();
      setRecordingPhraseId(id);
      console.log("🎙️ startNativeRecording", id);
    } catch (error) {
      console.error("Erreur démarrage enregistrement natif", error);
      alert("Impossible de démarrer l'enregistrement.");
      setRecordingPhraseId(null);
    }
  };

  const stopNativeRecording = async () => {
    try {
      const result = await VoiceRecorder.stopRecording();
      const recordDataBase64 = (result as any)?.value?.recordDataBase64;
      const mimeType = (result as any)?.value?.mimeType || "audio/aac";

      if (!recordDataBase64) {
        setRecordingPhraseId(null);
        return;
      }

      const dataUrl = `data:${mimeType};base64,${recordDataBase64}`;
      const currentId = pendingPhraseIdRef.current || "temp";

      await saveRecordedData(currentId, dataUrl);
    } catch (error) {
      console.error("Erreur arrêt enregistrement natif", error);
      alert("Impossible d'arrêter l'enregistrement.");
    } finally {
      setRecordingPhraseId(null);
      pendingPhraseIdRef.current = null;
    }
  };

  const startWebRecording = async (id: string) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      alert("Enregistrement non supporté sur cet appareil.");
      return;
    }

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }

      chunksRef.current = [];
      pendingPhraseIdRef.current = id;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = "";
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      for (const candidate of candidates) {
        try {
          if ((window as any).MediaRecorder?.isTypeSupported?.(candidate)) {
            mimeType = candidate;
            break;
          }
        } catch {}
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event: any) => {
        console.error("Erreur enregistrement", event);
        alert("Erreur pendant l'enregistrement audio.");
        setRecordingPhraseId(null);
        stopTracks();
      };

      recorder.onstop = async () => {
        try {
          const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: finalMimeType });

          if (blob.size === 0) {
            setRecordingPhraseId(null);
            stopTracks();
            return;
          }

          const dataUrl = await blobToDataUrl(blob);
          const currentId = pendingPhraseIdRef.current || "temp";
          await saveRecordedData(currentId, dataUrl);
        } catch (error) {
          console.error("Erreur sauvegarde audio", error);
          alert("Impossible de sauvegarder l'audio.");
        } finally {
          setRecordingPhraseId(null);
          chunksRef.current = [];
          pendingPhraseIdRef.current = null;
          stopTracks();
        }
      };

      recorder.start();
      setRecordingPhraseId(id);
      console.log("🎙️ startWebRecording", id);
    } catch (error) {
      console.error("Erreur démarrage enregistrement web", error);
      alert("Micro refusé ou indisponible.");
      setRecordingPhraseId(null);
      stopTracks();
    }
  };

  const startRecording = async (phraseId?: string | number) => {
    const id = phraseId != null ? String(phraseId) : "temp";

    if (Capacitor.isNativePlatform()) {
      await startNativeRecording(id);
      return;
    }

    await startWebRecording(id);
  };

  const stopRecording = async () => {
    if (Capacitor.isNativePlatform()) {
      await stopNativeRecording();
      return;
    }

    try {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      } else {
        setRecordingPhraseId(null);
        stopTracks();
      }
    } catch (error) {
      console.error("Erreur arrêt enregistrement", error);
      setRecordingPhraseId(null);
      stopTracks();
    }
  };

  const deleteRecording = async (phraseId: string | number) => {
    const id = String(phraseId);

    applyAudioMapUpdate((currentAudioMap) => {
      const nextAudioMap = { ...currentAudioMap };
      delete nextAudioMap[id];
      return nextAudioMap;
    });
  };

  const getRecordingUrl = (phraseId: string | number) => {
    return audioMap[String(phraseId)] || "";
  };

  return {
    recordingPhraseId,
    startRecording,
    stopRecording,
    deleteRecording,
    getRecordingUrl,
  };
}
