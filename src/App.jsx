import React, { useEffect, useMemo, useRef, useState } from "react";
import CommunicationPage from "./CommunicationPage";
import VoicePage from "./VoicePage";
import ProfileSettingsPage from "./ProfileSettingsPage";
import ProfileInfoPage from "./ProfileInfoPage";
import CreditsPage from "./CreditsPage";
import InstallButton from "./InstallButton";
import {
  AVAILABLE_ICONS,
  DEFAULT_CATEGORIES,
  createProfile,
  generateId,
  getCategoryBackground,
  readJSON,
} from "./data";
import { createStyles, getActiveTheme } from "./themes";

export default function App() {
  const initialProfiles =
    typeof window !== "undefined"
      ? readJSON("maVoixProfiles", null) || [createProfile()]
      : [createProfile()];

  const initialCurrentProfileId =
    typeof window !== "undefined"
      ? localStorage.getItem("maVoixCurrentProfileId") || initialProfiles[0].id
      : initialProfiles[0].id;

  const [page, setPage] = useState("communication");
  const [profiles, setProfiles] = useState(initialProfiles);
  const [currentProfileId, setCurrentProfileId] = useState(
    initialCurrentProfileId
  );

  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Général");
  const [filter, setFilter] = useState("Toutes");

  const [tone, setTone] = useState("naturel");
  const [audience, setAudience] = useState("aidant");

  const [voices, setVoices] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [recordingPhraseId, setRecordingPhraseId] = useState(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💬");

  const [selectedPhraseId, setSelectedPhraseId] = useState(null);
  const [voiceEditor, setVoiceEditor] = useState({
    label: "",
    text: "",
    category: "Général",
    assignedVoice: "default",
    useProfileVoiceSettings: true,
    voiceSettings: {
      rate: 1,
      pitch: 1,
      volume: 1,
    },
  });

  const [toastMessage, setToastMessage] = useState("");
  const [aiGeneratedText, setAiGeneratedText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiUsage, setAiUsage] = useState({
    creditsRemaining: 0,
    globalCreditsRemaining: 0,
    blocked: false,
    donorWall: [],
    euroToCreditsRate: 1000,
    availableSource: "shared",
  });
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  const [creditsPurchaseLoading, setCreditsPurchaseLoading] = useState("");
  const [creditsMessage, setCreditsMessage] = useState("");

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const currentProfile =
    profiles.find((profile) => profile.id === currentProfileId) || profiles[0];

  const savedPhrases = currentProfile?.phrases || [];
  const customCategories = currentProfile?.categories || DEFAULT_CATEGORIES;
  const audioMap = currentProfile?.audioMap || {};
  const defaultVoice = currentProfile?.defaultVoice || "default";
  const defaultVoiceSettings = {
    rate: currentProfile?.voiceSettings?.rate ?? 1,
    pitch: currentProfile?.voiceSettings?.pitch ?? 1,
    volume: currentProfile?.voiceSettings?.volume ?? 1,
  };

  const emergencyContacts =
    currentProfile?.emergencyContacts?.length > 0
      ? currentProfile.emergencyContacts
      : [
          {
            id: generateId(),
            name: "",
            phone: "",
            relation: "",
          },
        ];

  const activeTheme = getActiveTheme(currentProfile);
  const styles = createStyles(activeTheme);
  const API_BASE = "https://mavoix.onrender.com";

  async function refreshAiUsage(profileId = currentProfileId) {
    if (!profileId) return;

    try {
      setAiStatusLoading(true);
      const response = await fetch(
        `${API_BASE}/api/ai/status?profileId=${encodeURIComponent(profileId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de récupérer le compteur IA.");
      }

      setAiUsage(data);
    } catch (error) {
      console.error(error);
      setAiError((prev) => prev || "Impossible de récupérer le compteur IA.");
    } finally {
      setAiStatusLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("maVoixProfiles", JSON.stringify(profiles));
    }
  }, [profiles]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentProfileId) {
      localStorage.setItem("maVoixCurrentProfileId", currentProfileId);
    }
  }, [currentProfileId]);

  useEffect(() => {
    const profileExists = profiles.some(
      (profile) => profile.id === currentProfileId
    );
    if (!profileExists && profiles[0]) {
      setCurrentProfileId(profiles[0].id);
    }
  }, [profiles, currentProfileId]);

  useEffect(() => {
    refreshAiUsage();
  }, [currentProfileId]);


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
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const categories = customCategories.map((item) => item.name);

  useEffect(() => {
    if (!categories.includes(category) && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const categoryOptions = [
    { name: "Toutes", icon: "🗂️" },
    { name: "Favoris", icon: "⭐" },
    ...customCategories,
  ];

  const filteredPhrases = useMemo(() => {
    if (filter === "Toutes") return savedPhrases;
    if (filter === "Favoris") {
      return savedPhrases.filter((item) => item.favorite);
    }
    return savedPhrases.filter((item) => item.category === filter);
  }, [savedPhrases, filter]);

  const selectedPhrase =
    savedPhrases.find((item) => item.id === selectedPhraseId) || null;

  useEffect(() => {
    if (savedPhrases.length === 0) {
      setSelectedPhraseId(null);
      return;
    }

    const exists = savedPhrases.some((item) => item.id === selectedPhraseId);
    if (!exists) {
      setSelectedPhraseId(savedPhrases[0].id);
    }
  }, [savedPhrases, selectedPhraseId]);

  useEffect(() => {
    if (!selectedPhrase) {
      setVoiceEditor({
        label: "",
        text: "",
        category: categories[0] || "Général",
        assignedVoice: "default",
        useProfileVoiceSettings: true,
        voiceSettings: {
          ...defaultVoiceSettings,
        },
      });
      return;
    }

    setVoiceEditor({
      label: selectedPhrase.label || "",
      text: selectedPhrase.text || "",
      category: selectedPhrase.category || categories[0] || "Général",
      assignedVoice: selectedPhrase.assignedVoice || "default",
      useProfileVoiceSettings: !selectedPhrase.voiceSettings,
      voiceSettings: {
        rate: selectedPhrase.voiceSettings?.rate ?? defaultVoiceSettings.rate,
        pitch: selectedPhrase.voiceSettings?.pitch ?? defaultVoiceSettings.pitch,
        volume: selectedPhrase.voiceSettings?.volume ?? defaultVoiceSettings.volume,
      },
    });
  }, [selectedPhrase, categories, defaultVoiceSettings.rate, defaultVoiceSettings.pitch, defaultVoiceSettings.volume]);

  function updateCurrentProfile(updater) {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === currentProfileId ? updater(profile) : profile
      )
    );
  }

  function updateCurrentProfileField(field, value) {
    updateCurrentProfile((profile) => ({
      ...profile,
      [field]: value,
    }));
  }

  function updateNestedProfileField(parentField, childField, value) {
    updateCurrentProfile((profile) => ({
      ...profile,
      [parentField]: {
        ...(profile[parentField] || {}),
        [childField]: value,
      },
    }));
  }

  function addTreatment() {
    updateCurrentProfile((profile) => ({
      ...profile,
      medicalInfo: {
        ...(profile.medicalInfo || {}),
        treatments: [
          ...(profile.medicalInfo?.treatments || []),
          {
            id: generateId(),
            name: "",
            dosage: "",
            frequency: "",
          },
        ],
      },
    }));
  }

  function updateTreatment(treatmentId, field, value) {
    updateCurrentProfile((profile) => ({
      ...profile,
      medicalInfo: {
        ...(profile.medicalInfo || {}),
        treatments: (profile.medicalInfo?.treatments || []).map((treatment) =>
          treatment.id === treatmentId
            ? { ...treatment, [field]: value }
            : treatment
        ),
      },
    }));
  }

  function deleteTreatment(treatmentId) {
    updateCurrentProfile((profile) => ({
      ...profile,
      medicalInfo: {
        ...(profile.medicalInfo || {}),
        treatments: (profile.medicalInfo?.treatments || []).filter(
          (treatment) => treatment.id !== treatmentId
        ),
      },
    }));
  }

  function updateProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop volumineuse (max 5 MB).");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    const image = new Image();

    reader.onload = (loadEvent) => {
      image.src = loadEvent.target?.result;
    };

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_SIZE = 300;
      let { width, height } = image;

      if (width > height && width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else if (height >= width && height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        updateCurrentProfileField("profilePhoto", image.src);
        event.target.value = "";
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.72);
      updateCurrentProfileField("profilePhoto", compressedDataUrl);
      event.target.value = "";
    };

    image.onerror = () => {
      alert("Impossible de lire cette image.");
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  }

  function removeProfilePhoto() {
    updateCurrentProfileField("profilePhoto", "");
  }

  function addEmergencyContact() {
    updateCurrentProfile((profile) => ({
      ...profile,
      emergencyContacts: [
        ...(profile.emergencyContacts || []),
        {
          id: generateId(),
          name: "",
          phone: "",
          relation: "",
        },
      ],
    }));
  }

  function updateEmergencyContact(contactId, field, value) {
    updateCurrentProfile((profile) => ({
      ...profile,
      emergencyContacts: (profile.emergencyContacts || []).map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact
      ),
    }));
  }

  function deleteEmergencyContact(contactId) {
    updateCurrentProfile((profile) => {
      const contacts = profile.emergencyContacts || [];

      if (contacts.length <= 1) {
        return {
          ...profile,
          emergencyContacts: [
            {
              id: generateId(),
              name: "",
              phone: "",
              relation: "",
            },
          ],
        };
      }

      return {
        ...profile,
        emergencyContacts: contacts.filter(
          (contact) => contact.id !== contactId
        ),
      };
    });
  }

  function getReliableFallbackVoice(preferredLang = currentProfile.language || "fr-FR") {
    const normalizedLang = preferredLang.toLowerCase();

    const healthyVoices = voices.filter(
      (voice) => voiceStatus[voice.voiceURI] !== "failed"
    );

    const pool = healthyVoices.length > 0 ? healthyVoices : voices;

    return (
      pool.find((voice) => voice.default && voice.lang?.toLowerCase().startsWith(normalizedLang.slice(0, 2))) ||
      pool.find((voice) => voice.lang?.toLowerCase() === normalizedLang) ||
      pool.find((voice) => voice.lang?.toLowerCase().startsWith(normalizedLang.slice(0, 2))) ||
      pool.find((voice) => voice.default) ||
      pool[0] ||
      null
    );
  }

  function resolveVoiceByURI(voiceURI) {
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
  }

  function markVoiceStatus(voiceURI, status) {
    if (!voiceURI) return;

    setVoiceStatus((prev) => {
      if (prev[voiceURI] === status) return prev;
      return {
        ...prev,
        [voiceURI]: status,
      };
    });
  }

  function testVoice(voiceURI, sampleText = "Bonjour, ceci est un test de voix.") {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve(false);
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = currentProfile.language || "fr-FR";

      const selectedVoice = resolveVoiceByURI(voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      let finished = false;

      const finalize = (success) => {
        if (finished) return;
        finished = true;

        const uriToStore = voiceURI && voiceURI !== "default"
          ? voiceURI
          : selectedVoice?.voiceURI;

        if (uriToStore) {
          markVoiceStatus(uriToStore, success ? "ok" : "failed");
        }

        resolve(success);
      };

      const timeoutId = window.setTimeout(() => finalize(false), 4000);

      utterance.onstart = () => {
        const uriToStore = voiceURI && voiceURI !== "default"
          ? voiceURI
          : selectedVoice?.voiceURI;

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
  }

  async function speakText(
    phrase,
    voiceURI = defaultVoice,
    phraseId = null,
    overrideSettings = null
  ) {
    if (phraseId && audioMap[phraseId]) {
      const audio = new Audio(audioMap[phraseId]);
      audio.play();
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
    utterance.lang = currentProfile.language || "fr-FR";
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
        retry.lang = fallbackVoice.lang || currentProfile.language || "fr-FR";
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
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function startDictation() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas disponible sur ce navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentProfile.language || "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      setText(transcript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopDictation() {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  }

  function savePhrase() {
    if (!text.trim()) return;

    const newPhrase = {
      id: generateId(),
      label: label.trim() || text.trim().slice(0, 30),
      text: text.trim(),
      category,
      assignedVoice: defaultVoice,
      voiceSettings: null,
      favorite: false,
    };

    updateCurrentProfile((profile) => ({
      ...profile,
      phrases: [newPhrase, ...profile.phrases],
    }));

    setText("");
    setLabel("");

    setToastMessage("Phrase enregistrée");

    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  function updatePhrase(id, field, value) {
    updateCurrentProfile((profile) => ({
      ...profile,
      phrases: profile.phrases.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  function saveSelectedPhraseVoiceSettings() {
    if (!selectedPhraseId) return;

    updateCurrentProfile((profile) => ({
      ...profile,
      phrases: profile.phrases.map((item) =>
        item.id === selectedPhraseId
          ? {
              ...item,
              label: voiceEditor.label,
              text: voiceEditor.text,
              category: voiceEditor.category,
              assignedVoice: voiceEditor.assignedVoice,
              voiceSettings: voiceEditor.useProfileVoiceSettings
                ? null
                : {
                    rate: Number(voiceEditor.voiceSettings?.rate ?? 1),
                    pitch: Number(voiceEditor.voiceSettings?.pitch ?? 1),
                    volume: Number(voiceEditor.voiceSettings?.volume ?? 1),
                  },
            }
          : item
      ),
    }));
  }

  function deletePhrase(id) {
    updateCurrentProfile((profile) => {
      const nextAudioMap = { ...profile.audioMap };
      delete nextAudioMap[id];

      return {
        ...profile,
        phrases: profile.phrases.filter((item) => item.id !== id),
        audioMap: nextAudioMap,
      };
    });
  }

  function movePhrase(id, direction) {
    updateCurrentProfile((profile) => {
      const index = profile.phrases.findIndex((item) => item.id === id);
      if (index === -1) return profile;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= profile.phrases.length) return profile;

      const nextPhrases = [...profile.phrases];
      [nextPhrases[index], nextPhrases[newIndex]] = [
        nextPhrases[newIndex],
        nextPhrases[index],
      ];

      return {
        ...profile,
        phrases: nextPhrases,
      };
    });
  }

  async function startRecording(phraseId) {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("L'enregistrement micro n'est pas disponible sur ce navigateur.");
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        alert("L'enregistrement audio n'est pas disponible sur ce navigateur.");
        return;
      }

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
              [phraseId]: reader.result,
            },
          }));
        };

        reader.readAsDataURL(blob);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecordingPhraseId(null);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error(error);
      alert("Impossible d'accéder au micro.");
      setRecordingPhraseId(null);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop?.();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function deleteRecording(phraseId) {
    updateCurrentProfile((profile) => {
      const nextAudioMap = { ...profile.audioMap };
      delete nextAudioMap[phraseId];

      return {
        ...profile,
        audioMap: nextAudioMap,
      };
    });
  }

  function createNewProfile() {
    const newProfile = createProfile(`Profil ${profiles.length + 1}`);
    newProfile.phrases = [];
    setProfiles((prev) => [...prev, newProfile]);
    setCurrentProfileId(newProfile.id);
    setFilter("Toutes");
    setCategory("Général");
  }

  function duplicateCurrentProfile() {
    const phraseIdMap = new Map();

    const duplicatedPhrases = currentProfile.phrases.map((phrase) => {
      const newId = generateId();
      phraseIdMap.set(phrase.id, newId);
      return {
        ...phrase,
        id: newId,
      };
    });

    const duplicatedAudioMap = Object.fromEntries(
      Object.entries(currentProfile.audioMap || {})
        .map(([oldPhraseId, audioValue]) => {
          const newPhraseId = phraseIdMap.get(oldPhraseId);
          return newPhraseId ? [newPhraseId, audioValue] : null;
        })
        .filter(Boolean)
    );

    const duplicatedEmergencyContacts = (
      currentProfile.emergencyContacts || []
    ).map((contact) => ({
      ...contact,
      id: generateId(),
    }));

    const duplicatedTreatments = (
      currentProfile.medicalInfo?.treatments || []
    ).map((treatment) => ({
      ...treatment,
      id: generateId(),
    }));

    const copy = {
      ...currentProfile,
      id: generateId(),
      name: `${currentProfile.name} (copie)`,
      categories: currentProfile.categories.map((cat) => ({ ...cat })),
      phrases: duplicatedPhrases,
      audioMap: duplicatedAudioMap,
      medicalInfo: {
        ...(currentProfile.medicalInfo || {}),
        treatments: duplicatedTreatments,
      },
      doctorInfo: {
        ...(currentProfile.doctorInfo || {}),
      },
      emergencyContacts:
        duplicatedEmergencyContacts.length > 0
          ? duplicatedEmergencyContacts
          : [
              {
                id: generateId(),
                name: "",
                phone: "",
                relation: "",
              },
            ],
    };

    setProfiles((prev) => [...prev, copy]);
    setCurrentProfileId(copy.id);
  }

  function deleteCurrentProfile() {
    if (profiles.length <= 1) {
      alert("Il faut garder au moins un profil.");
      return;
    }

    const nextProfiles = profiles.filter(
      (profile) => profile.id !== currentProfileId
    );
    setProfiles(nextProfiles);
    setCurrentProfileId(nextProfiles[0].id);
    setFilter("Toutes");
    setCategory("Général");
  }

  function exportAllProfiles() {
    const data = {
      appName: "Ma Voix",
      version: 1,
      exportDate: new Date().toISOString(),
      currentProfileId,
      profiles,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ma-voix-profils.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importAllProfiles(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
          throw new Error("Fichier invalide");
        }

        const normalizedProfiles = parsed.profiles.map((profile) => ({
          ...createProfile(profile.name || "Profil importé"),
          ...profile,
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          birthDate: profile.birthDate || "",
          address: profile.address || "",
          profilePhoto: profile.profilePhoto || "",
          medicalInfo: {
            bloodType: profile.medicalInfo?.bloodType || "",
            allergies: profile.medicalInfo?.allergies || "",
            medicalHistory: profile.medicalInfo?.medicalHistory || "",
            condition: profile.medicalInfo?.condition || "",
            treatments:
              profile.medicalInfo?.treatments?.map((treatment) => ({
                id: treatment.id || generateId(),
                name: treatment.name || "",
                dosage: treatment.dosage || "",
                frequency: treatment.frequency || "",
              })) || [],
          },
          doctorInfo: {
            name: profile.doctorInfo?.name || "",
            phone: profile.doctorInfo?.phone || "",
          },
          emergencyContacts:
            profile.emergencyContacts?.length > 0
              ? profile.emergencyContacts.map((contact) => ({
                  id: contact.id || generateId(),
                  name: contact.name || "",
                  phone: contact.phone || "",
                  relation: contact.relation || "",
                }))
              : profile.emergencyContact
              ? [
                  {
                    id: generateId(),
                    name: profile.emergencyContact,
                    phone: "",
                    relation: "",
                  },
                ]
              : [
                  {
                    id: generateId(),
                    name: "",
                    phone: "",
                    relation: "",
                  },
                ],
        }));

        setProfiles(normalizedProfiles);

        const importedCurrentId =
          parsed.currentProfileId &&
          normalizedProfiles.some(
            (profile) => profile.id === parsed.currentProfileId
          )
            ? parsed.currentProfileId
            : normalizedProfiles[0].id;

        setCurrentProfileId(importedCurrentId);
        setFilter("Toutes");
        setCategory("Général");
        alert("Profils importés avec succès.");
      } catch (error) {
        console.error(error);
        alert("Le fichier importé n'est pas valide.");
      }

      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function addCategory() {
    const cleanName = newCategoryName.trim();
    if (!cleanName) return;

    const exists = currentProfile.categories.some(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (exists) {
      alert("Cette catégorie existe déjà.");
      return;
    }

    updateCurrentProfile((profile) => ({
      ...profile,
      categories: [
        ...profile.categories,
        { name: cleanName, icon: newCategoryIcon },
      ],
    }));

    setCategory(cleanName);
    setNewCategoryName("");
    setNewCategoryIcon("💬");
  }

  function deleteCategory(categoryName) {
    const protectedCategories = ["Général", "Urgence"];
    if (protectedCategories.includes(categoryName)) {
      alert("Cette catégorie de base ne peut pas être supprimée.");
      return;
    }

    updateCurrentProfile((profile) => ({
      ...profile,
      categories: profile.categories.filter(
        (item) => item.name !== categoryName
      ),
      phrases: profile.phrases.map((item) =>
        item.category === categoryName ? { ...item, category: "Général" } : item
      ),
    }));

    if (category === categoryName) setCategory("Général");
    if (filter === categoryName) setFilter("Toutes");
  }

  async function generateTextWithAI() {
    try {
      if (!text.trim()) {
        setAiError("Écris quelques mots d'abord.");
        setAiGeneratedText("");
        return;
      }

      if (aiUsage.blocked) {
        setAiError(
          "Vos essais gratuits du jour sont épuisés. Achetez des crédits pour continuer."
        );
        setPage("credits");
        return;
      }

      setAiLoading(true);
      setAiError("");
      setAiGeneratedText("");
      setCreditsMessage("");

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: currentProfileId,
          keywords: text,
          tone,
          audience,
        }),
      });

      const data = await response.json();

      if (data.usage) {
        setAiUsage(data.usage);
      }

      if (!response.ok) {
        if (response.status === 403) {
          setPage("credits");
        }
        throw new Error(data.error || "Erreur pendant la génération.");
      }

      if (data.message) {
        setAiGeneratedText(data.message);
      } else {
        setAiError("Aucune phrase générée.");
      }
    } catch (error) {
      setAiError(error.message || "Erreur pendant la génération.");
      setAiGeneratedText("");
    } finally {
      setAiLoading(false);
    }
  }

  function handleGenerateButtonClick() {
    if (aiUsage.blocked) {
      setPage("credits");
      setAiError(
        "Vos essais gratuits du jour sont épuisés. Achetez des crédits pour continuer."
      );
      return;
    }

    generateTextWithAI();
  }

  async function purchaseCredits(packId) {
    try {
      setCreditsPurchaseLoading(packId);
      setCreditsMessage("");

      const response = await fetch(`${API_BASE}/api/ai/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: currentProfileId,
          packId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'ajouter les crédits.");
      }

      setAiUsage(data.usage);
      setCreditsMessage(
        `Pack ${data.purchasedPack.credits} crédits ajouté au profil.`
      );
    } catch (error) {
      setCreditsMessage(error.message || "Impossible d'ajouter les crédits.");
    } finally {
      setCreditsPurchaseLoading("");
    }
  }

  function openInfosAndAskForHelp() {
    setPage("infos");
    speakText("J'ai besoin d'aide immédiatement", "default");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src="/picturetitle.png"
              alt="Ma Voix"
              style={{
                height: 80,
                objectFit: "contain",
              }}
            />

            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {currentProfile.name}
              {currentProfile.firstName || currentProfile.lastName
                ? ` ${[currentProfile.firstName, currentProfile.lastName]
                    .filter(Boolean)
                    .join(" ")}`
                : ""}
            </div>
          </div>

          <div style={styles.topButtons}>
            <button
              style={{
                ...(page === "communication"
                  ? styles.primaryButton
                  : styles.secondaryButton),
                padding: "6px 18px",
                fontSize: "15px",
              }}
              onClick={() => setPage("communication")}
            >
              Communication
            </button>

            <button
              style={
                page === "voix" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("voix")}
            >
              Voix
            </button>

            <button
              style={
                page === "infos" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("infos")}
            >
              Infos
            </button>

            <button
              style={
                page === "profil"
                  ? styles.primaryButton
                  : styles.secondaryButton
              }
              onClick={() => setPage("profil")}
            >
              Profil
            </button>

            <button
              style={
                page === "reglages"
                  ? styles.primaryButton
                  : styles.secondaryButton
              }
              onClick={() => setPage("reglages")}
            >
              Générer
            </button>

            <button
              style={
                page === "credits" ? styles.primaryButton : styles.secondaryButton
              }
              onClick={() => setPage("credits")}
            >
              Crédits {aiUsage.creditsRemaining > 0 ? `(${aiUsage.creditsRemaining})` : ""}
            </button>

            <button
              onClick={() =>
                window.open(
                  "https://paypal.me/anime1120",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              style={{
                padding: "6px 18px",
                fontSize: "15px",
                borderRadius: "18px",
                background: "#22c55e",
                color: "white",
                border: "none",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Soutenez-moi ❤️
            </button>
          </div>
        </div>

        <InstallButton styles={styles} />

        {page === "communication" ? (
          <CommunicationPage
            styles={styles}
            categoryOptions={categoryOptions}
            filter={filter}
            setFilter={setFilter}
            filteredPhrases={filteredPhrases}
            getCategoryBackground={getCategoryBackground}
            speakText={speakText}
            movePhrase={movePhrase}
            updatePhrase={updatePhrase}
            deletePhrase={deletePhrase}
          />
        ) : page === "voix" ? (
          <VoicePage
            styles={styles}
            defaultVoice={defaultVoice}
            defaultVoiceSettings={defaultVoiceSettings}
            voices={voices}
            voiceStatus={voiceStatus}
            testVoice={testVoice}
            updateCurrentProfileField={updateCurrentProfileField}
            currentProfile={currentProfile}
            savedPhrases={savedPhrases}
            selectedPhraseId={selectedPhraseId}
            setSelectedPhraseId={setSelectedPhraseId}
            selectedPhrase={selectedPhrase}
            voiceEditor={voiceEditor}
            setVoiceEditor={setVoiceEditor}
            categories={categories}
            saveSelectedPhraseVoiceSettings={saveSelectedPhraseVoiceSettings}
            speakText={speakText}
            recordingPhraseId={recordingPhraseId}
            stopRecording={stopRecording}
            startRecording={startRecording}
            audioMap={audioMap}
            deleteRecording={deleteRecording}
          />
        ) : page === "infos" ? (
          <ProfileInfoPage
            styles={styles}
            currentProfile={currentProfile}
            onSpeak={(message) => speakText(message, "default")}
          />
        ) : page === "credits" ? (
          <CreditsPage
            styles={styles}
            aiUsage={aiUsage}
            aiStatusLoading={aiStatusLoading}
            creditsPurchaseLoading={creditsPurchaseLoading}
            creditsMessage={creditsMessage}
            onPurchase={purchaseCredits}
            onBackToEditor={() => setPage("reglages")}
          />
        ) : (
          <ProfileSettingsPage
            styles={styles}
            page={page}
            currentProfile={currentProfile}
            updateCurrentProfileField={updateCurrentProfileField}
            updateNestedProfileField={updateNestedProfileField}
            updateProfilePhoto={updateProfilePhoto}
            removeProfilePhoto={removeProfilePhoto}
            addTreatment={addTreatment}
            updateTreatment={updateTreatment}
            deleteTreatment={deleteTreatment}
            currentProfileId={currentProfileId}
            setCurrentProfileId={setCurrentProfileId}
            profiles={profiles}
            setFilter={setFilter}
            setCategory={setCategory}
            createNewProfile={createNewProfile}
            duplicateCurrentProfile={duplicateCurrentProfile}
            deleteCurrentProfile={deleteCurrentProfile}
            exportAllProfiles={exportAllProfiles}
            importAllProfiles={importAllProfiles}
            fileInputRef={fileInputRef}
            text={text}
            setText={setText}
            isListening={isListening}
            stopDictation={stopDictation}
            startDictation={startDictation}
            speakText={speakText}
            stopSpeaking={stopSpeaking}
            savePhrase={savePhrase}
            label={label}
            setLabel={setLabel}
            category={category}
            setCategory={setCategory}
            categories={categories}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            newCategoryIcon={newCategoryIcon}
            setNewCategoryIcon={setNewCategoryIcon}
            AVAILABLE_ICONS={AVAILABLE_ICONS}
            addCategory={addCategory}
            customCategories={customCategories}
            deleteCategory={deleteCategory}
            emergencyContacts={emergencyContacts}
            addEmergencyContact={addEmergencyContact}
            updateEmergencyContact={updateEmergencyContact}
            deleteEmergencyContact={deleteEmergencyContact}
            aiGeneratedText={aiGeneratedText}
            aiLoading={aiLoading}
            aiError={aiError}
            aiUsage={aiUsage}
            aiStatusLoading={aiStatusLoading}
            generateTextWithAI={handleGenerateButtonClick}
            setAiGeneratedText={setAiGeneratedText}
            tone={tone}
            setTone={setTone}
            audience={audience}
            setAudience={setAudience}
            goToCreditsPage={() => setPage("credits")}
          />
        )}
      </div>

      <button
        onClick={openInfosAndAskForHelp}
        style={styles.urgentFloatingButton}
      >
        🚨 URGENCE
      </button>

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "18px 28px",
            borderRadius: 16,
            fontSize: "1.2rem",
            fontWeight: "bold",
            zIndex: 9999,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
