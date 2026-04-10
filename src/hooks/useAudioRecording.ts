import { useCallback, useEffect, useRef, useState } from "react";

import type { Profile } from "../types";

export default function useAudioRecording({ updateCurrentProfile }: { updateCurrentProfile: (updater: (profile: Profile) => Profile) => void }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [recordingPhraseId, setRecordingPhraseId] = useState(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop?.();
    cleanupStream();
  }, [cleanupStream]);

  const startRecording = useCallback(
    async (phraseId: string) => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          alert("L'enregistrement micro n'est pas disponible sur ce navigateur.");
          return;
        }

        if (typeof MediaRecorder === "undefined") {
          alert("L'enregistrement audio n'est pas disponible sur ce navigateur.");
          return;
        }

        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }

        cleanupStream();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

        const mediaRecorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );

        chunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;
        setRecordingPhraseId(phraseId);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(
            chunksRef.current,
            mimeType ? { type: mimeType } : undefined
          );
          const reader = new FileReader();

          reader.onloadend = () => {
            updateCurrentProfile((profile) => ({
              ...profile,
              audioMap: {
                ...profile.audioMap,
                [phraseId]: String(reader.result || ""),
              },
            }));
          };

          reader.readAsDataURL(blob);

          cleanupStream();
          mediaRecorderRef.current = null;
          setRecordingPhraseId(null);
        };

        mediaRecorder.start();
      } catch (error) {
        console.error(error);
        alert("Impossible d'accéder au micro.");
        cleanupStream();
        mediaRecorderRef.current = null;
        setRecordingPhraseId(null);
      }
    },
    [cleanupStream, updateCurrentProfile]
  );

  const deleteRecording = useCallback(
    (phraseId: string) => {
      updateCurrentProfile((profile) => {
        const nextAudioMap = { ...profile.audioMap };
        delete nextAudioMap[phraseId];

        return {
          ...profile,
          audioMap: nextAudioMap,
        };
      });
    },
    [updateCurrentProfile]
  );

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    recordingPhraseId,
    startRecording,
    stopRecording,
    deleteRecording,
  };
}
