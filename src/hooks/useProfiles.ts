import type React from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { DEFAULT_CATEGORIES, createProfile, generateId, readJSON } from "../data";
import type { Profile, UseProfilesOptions } from "../types";
import {
  createEmptyEmergencyContact,
  ensureDoctorInfo,
  ensureEmergencyContact,
  ensureMedicalInfo,
  ensureProfile,
} from "../utils/normalize";

export default function useProfiles() {
  const initialProfiles =
    typeof window !== "undefined"
      ? readJSON("maVoixProfiles", null) || [createProfile()]
      : [createProfile()];

  const initialCurrentProfileId =
    typeof window !== "undefined"
      ? localStorage.getItem("maVoixCurrentProfileId") || initialProfiles[0].id
      : initialProfiles[0].id;

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles as Profile[]);
  const [currentProfileId, setCurrentProfileId] = useState<string>(initialCurrentProfileId);

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
    const profileExists = profiles.some((profile) => profile.id === currentProfileId);
    if (!profileExists && profiles[0]) {
      setCurrentProfileId(profiles[0].id);
    }
  }, [profiles, currentProfileId]);

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === currentProfileId) || profiles[0],
    [profiles, currentProfileId]
  );

  const customCategories = currentProfile?.categories || DEFAULT_CATEGORIES;
  const savedPhrases = currentProfile?.phrases || [];
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
      : [createEmptyEmergencyContact()];

  const updateCurrentProfile = useCallback((updater: (profile: Profile) => Profile) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === currentProfileId ? updater(profile) : profile
      )
    );
  }, [currentProfileId]);

  const updateCurrentProfileField = useCallback((field: keyof Profile | string, value: unknown) => {
    updateCurrentProfile((profile) => ({
      ...profile,
      [field]: value,
    }));
  }, [updateCurrentProfile]);

  const updateNestedProfileField = useCallback((parentField: keyof Profile | string, childField: string, value: unknown) => {
    updateCurrentProfile((profile) => ({
      ...profile,
      [parentField]: {
        ...(profile[parentField] || {}),
        [childField]: value,
      },
    }));
  }, [updateCurrentProfile]);

  const addTreatment = useCallback(() => {
    updateCurrentProfile((profile) => ({
      ...profile,
      medicalInfo: {
        ...ensureMedicalInfo(profile.medicalInfo),
        treatments: [
          ...ensureMedicalInfo(profile.medicalInfo).treatments,
          {
            id: generateId(),
            name: "",
            dosage: "",
            frequency: "",
          },
        ],
      },
    }));
  }, [updateCurrentProfile]);

  const updateTreatment = useCallback((treatmentId: string, field: string, value: string) => {
    updateCurrentProfile((profile) => ({
      ...profile,
      medicalInfo: {
        ...ensureMedicalInfo(profile.medicalInfo),
        treatments: ensureMedicalInfo(profile.medicalInfo).treatments.map((treatment) =>
          treatment.id === treatmentId ? { ...treatment, [field]: value } : treatment
        ),
      },
    }));
  }, [updateCurrentProfile]);

  const deleteTreatment = useCallback((treatmentId: string) => {
    updateCurrentProfile((profile) => ({
      ...profile,
      medicalInfo: {
        ...ensureMedicalInfo(profile.medicalInfo),
        treatments: ensureMedicalInfo(profile.medicalInfo).treatments.filter(
          (treatment) => treatment.id !== treatmentId
        ),
      },
    }));
  }, [updateCurrentProfile]);

  const updateProfilePhoto = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
      image.src = String(loadEvent.target?.result || "");
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
  }, [updateCurrentProfileField]);

  const removeProfilePhoto = useCallback(() => {
    updateCurrentProfileField("profilePhoto", "");
  }, [updateCurrentProfileField]);

  const addEmergencyContact = useCallback(() => {
    updateCurrentProfile((profile) => ({
      ...profile,
      emergencyContacts: [
        ...(profile.emergencyContacts || []),
        createEmptyEmergencyContact(),
      ],
    }));
  }, [updateCurrentProfile]);

  const updateEmergencyContact = useCallback((contactId: string, field: string, value: string) => {
    updateCurrentProfile((profile) => ({
      ...profile,
      emergencyContacts: (profile.emergencyContacts || []).map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact
      ),
    }));
  }, [updateCurrentProfile]);

  const deleteEmergencyContact = useCallback((contactId: string) => {
    updateCurrentProfile((profile) => {
      const contacts = profile.emergencyContacts || [];
      if (contacts.length <= 1) {
        return {
          ...profile,
          emergencyContacts: [createEmptyEmergencyContact()],
        };
      }

      return {
        ...profile,
        emergencyContacts: contacts.filter((contact) => contact.id !== contactId),
      };
    });
  }, [updateCurrentProfile]);

  const createNewProfile = useCallback(({ onAfterCreate }: UseProfilesOptions = {}) => {
    const newProfile = ensureProfile({
      ...(createProfile(`Profil ${profiles.length + 1}`) as Profile),
      phrases: [],
    });
    setProfiles((prev) => [...prev, newProfile]);
    setCurrentProfileId(newProfile.id);
    onAfterCreate?.(newProfile);
  }, [profiles.length]);

  const duplicateCurrentProfile = useCallback(() => {
    const phraseIdMap = new Map();

    const duplicatedPhrases = (currentProfile?.phrases || []).map((phrase) => {
      const newId = generateId();
      phraseIdMap.set(phrase.id, newId);
      return { ...phrase, id: newId };
    });

    const duplicatedAudioMap = Object.fromEntries(
      Object.entries(currentProfile?.audioMap || {})
        .map(([oldPhraseId, audioValue]) => {
          const newPhraseId = phraseIdMap.get(oldPhraseId);
          return newPhraseId ? [newPhraseId, audioValue] : null;
        })
        .filter(Boolean)
    );

    const duplicatedEmergencyContacts = (currentProfile?.emergencyContacts || []).map((contact) =>
      ensureEmergencyContact({
        ...contact,
        id: generateId(),
      })
    );

    const duplicatedTreatments = (currentProfile?.medicalInfo?.treatments || []).map((treatment) => ({
      ...treatment,
      id: generateId(),
    }));

    const copy = ensureProfile({
      ...currentProfile,
      id: generateId(),
      name: `${currentProfile.name} (copie)`,
      categories: (currentProfile.categories || []).map((cat) => ({ ...cat })),
      phrases: duplicatedPhrases,
      audioMap: duplicatedAudioMap,
      medicalInfo: {
        ...ensureMedicalInfo(currentProfile.medicalInfo),
        treatments: duplicatedTreatments,
      },
      doctorInfo: ensureDoctorInfo(currentProfile?.doctorInfo),
      emergencyContacts:
        duplicatedEmergencyContacts.length > 0
          ? duplicatedEmergencyContacts
          : [createEmptyEmergencyContact()],
    });

    setProfiles((prev) => [...prev, copy]);
    setCurrentProfileId(copy.id);
  }, [currentProfile]);

  const deleteCurrentProfile = useCallback(({ onAfterDelete }: UseProfilesOptions = {}) => {
    if (profiles.length <= 1) {
      alert("Il faut garder au moins un profil.");
      return;
    }

    const nextProfiles = profiles.filter((profile) => profile.id !== currentProfileId);
    setProfiles(nextProfiles);
    setCurrentProfileId(nextProfiles[0].id);
    onAfterDelete?.(nextProfiles[0]);
  }, [profiles, currentProfileId]);

  const exportAllProfiles = useCallback(() => {
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
  }, [currentProfileId, profiles]);

  const importAllProfiles = useCallback((event: React.ChangeEvent<HTMLInputElement>, { onAfterImport }: UseProfilesOptions = {}) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));

        if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
          throw new Error("Fichier invalide");
        }

        const normalizedProfiles = parsed.profiles.map((profile) => ensureProfile(profile));

        setProfiles(normalizedProfiles);

        const importedCurrentId =
          parsed.currentProfileId &&
          normalizedProfiles.some((profile) => profile.id === parsed.currentProfileId)
            ? parsed.currentProfileId
            : normalizedProfiles[0].id;

        setCurrentProfileId(importedCurrentId);
        onAfterImport?.(normalizedProfiles[0], importedCurrentId);
        alert("Profils importés avec succès.");
      } catch (error) {
        console.error(error);
        alert("Le fichier importé n'est pas valide.");
      }

      event.target.value = "";
    };

    reader.readAsText(file);
  }, []);

  return {
    profiles,
    setProfiles,
    currentProfileId,
    setCurrentProfileId,
    currentProfile,
    customCategories,
    savedPhrases,
    audioMap,
    defaultVoice,
    defaultVoiceSettings,
    emergencyContacts,
    updateCurrentProfile,
    updateCurrentProfileField,
    updateNestedProfileField,
    addTreatment,
    updateTreatment,
    deleteTreatment,
    updateProfilePhoto,
    removeProfilePhoto,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    createNewProfile,
    duplicateCurrentProfile,
    deleteCurrentProfile,
    exportAllProfiles,
    importAllProfiles,
  };
}
