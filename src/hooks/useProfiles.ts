import type React from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { DEFAULT_CATEGORIES, createProfile, generateId } from "../data";
import type { Profile, UseProfilesOptions } from "../types";
import {
  mergePrivateProfileData,
  persistLocalProfiles,
  readLocalProfilesSnapshot,
  readPrivateProfiles,
  stripPrivateProfileData,
} from "../utils/localPrivacy";
import {
  createEmptyEmergencyContact,
  ensureDoctorInfo,
  ensureEmergencyContact,
  ensureMedicalInfo,
  ensureProfile,
} from "../utils/normalize";
import { createCaregiverAlertLink } from "../utils/caregiverAlerts";
import {
  importAbbreviationDictionary,
  readExportableAbbreviationDictionary,
} from "../utils/textFormatting";

function normalizeImportedProfile(profile: Partial<Profile>): Profile {
  return ensureProfile({
    ...profile,
    pinProtection: {
      enabled: Boolean((profile as any)?.pinProtection?.enabled),
      pin: String((profile as any)?.pinProtection?.pin || "").replace(/\D/g, "").slice(0, 4),
    },
  } as Profile);
}

function safeFilePart(value: string) {
  return String(value || "profil")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "profil";
}

function saveJsonFile(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function useProfiles() {
  const [initialSnapshot] = useState(() => {
    const fallbackProfiles = [ensureProfile(createProfile() as Profile)];
    return typeof window !== "undefined"
      ? readLocalProfilesSnapshot(fallbackProfiles)
      : {
          profiles: fallbackProfiles,
          hasPrivateVault: false,
          passwordProtected: false,
        };
  });

  const initialProfiles = initialSnapshot.profiles;

  const initialCurrentProfileId =
    typeof window !== "undefined"
      ? localStorage.getItem("maVoixCurrentProfileId") || initialProfiles[0].id
      : initialProfiles[0].id;

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles as Profile[]);
  const [currentProfileId, setCurrentProfileId] = useState<string>(initialCurrentProfileId);
  const [privateDataLoaded, setPrivateDataLoaded] = useState(
    !initialSnapshot.hasPrivateVault
  );
  const [privacyPassword, setPrivacyPassword] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState({
    privateDataLoaded: !initialSnapshot.hasPrivateVault,
    protectedAtRest: initialSnapshot.hasPrivateVault,
    passwordProtected: initialSnapshot.passwordProtected,
    locked: initialSnapshot.passwordProtected,
    error: "",
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !initialSnapshot.hasPrivateVault ||
      initialSnapshot.passwordProtected
    ) {
      return;
    }

    let cancelled = false;

    async function loadPrivateProfiles() {
      try {
        const privateProfiles = await readPrivateProfiles();
        if (cancelled) return;

        setProfiles((prev) => mergePrivateProfileData(prev, privateProfiles));
        setPrivateDataLoaded(true);
        setPrivacyStatus({
          privateDataLoaded: true,
          protectedAtRest: true,
          passwordProtected: false,
          locked: false,
          error: "",
        });
      } catch (error) {
        console.error("Impossible de déchiffrer les données privées :", error);
        if (cancelled) return;

        setPrivacyStatus({
          privateDataLoaded: false,
          protectedAtRest: true,
          passwordProtected: false,
          locked: false,
          error:
            "Les données médicales locales sont protégées, mais elles n'ont pas pu être chargées sur cet appareil.",
        });
      }
    }

    loadPrivateProfiles();

    return () => {
      cancelled = true;
    };
  }, [initialSnapshot.hasPrivateVault, initialSnapshot.passwordProtected]);

  useEffect(() => {
    if (typeof window === "undefined" || !privateDataLoaded) {
      return;
    }

    let cancelled = false;

    persistLocalProfiles(profiles, privacyPassword)
      .then((protectedAtRest) => {
        if (cancelled) return;
        setPrivacyStatus({
          privateDataLoaded: true,
          protectedAtRest,
          passwordProtected: Boolean(privacyPassword),
          locked: false,
          error: protectedAtRest
            ? ""
            : "Le navigateur ne permet pas de chiffrer le stockage local.",
        });
      })
      .catch((error) => {
        console.error("Impossible de protéger les profils locaux :", error);
        if (cancelled) return;
        setPrivacyStatus({
          privateDataLoaded: true,
          protectedAtRest: false,
          passwordProtected: Boolean(privacyPassword),
          locked: false,
          error: "Impossible de chiffrer les données médicales locales.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [profiles, privateDataLoaded, privacyPassword]);

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

    const duplicatedCaregiverAlertLinks = (currentProfile?.caregiverAlertLinks || []).map(
      (link, index) => ({
        ...link,
        id: generateId(),
        channel: createCaregiverAlertLink(index).channel,
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
      caregiverAlertLinks: duplicatedCaregiverAlertLinks,
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

  const enablePrivacyPassword = useCallback(
    async (password: string) => {
      const nextPassword = String(password || "");

      if (nextPassword.length < 8) {
        throw new Error("Choisis un mot de passe d'au moins 8 caractères.");
      }

      await persistLocalProfiles(profiles, nextPassword);
      setPrivacyPassword(nextPassword);
      setPrivateDataLoaded(true);
      setPrivacyStatus({
        privateDataLoaded: true,
        protectedAtRest: true,
        passwordProtected: true,
        locked: false,
        error: "",
      });
    },
    [profiles]
  );

  const unlockPrivateData = useCallback(
    async (password: string) => {
      const privateProfiles = await readPrivateProfiles(String(password || ""));

      setProfiles((prev) => mergePrivateProfileData(prev, privateProfiles));
      setPrivacyPassword(String(password || ""));
      setPrivateDataLoaded(true);
      setPrivacyStatus({
        privateDataLoaded: true,
        protectedAtRest: true,
        passwordProtected: true,
        locked: false,
        error: "",
      });
    },
    []
  );

  const lockPrivateData = useCallback(() => {
    setPrivacyPassword("");
    setProfiles((prev) =>
      prev.map((profile) => ensureProfile(stripPrivateProfileData(profile)))
    );
    setPrivateDataLoaded(false);
    setPrivacyStatus({
      privateDataLoaded: false,
      protectedAtRest: true,
      passwordProtected: true,
      locked: true,
      error: "",
    });
  }, []);

  const exportAllProfiles = useCallback(() => {
    if (!privateDataLoaded) {
      alert("Les données médicales protégées sont encore en cours de chargement.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "L'export contient les informations médicales et personnelles en clair. Continuer ?"
      )
    ) {
      return;
    }

    const data = {
      appName: "Ma Voix",
      version: 1,
      exportDate: new Date().toISOString(),
      privacy: {
        containsSensitiveMedicalData: true,
        localStorageProtectedAtRest: privacyStatus.protectedAtRest,
        passwordProtected: privacyStatus.passwordProtected,
      },
      currentProfileId,
      profiles,
      abbreviationDictionary: readExportableAbbreviationDictionary(),
    };

    saveJsonFile(
      `ma-voix-profils-${new Date().toISOString().slice(0, 10)}.json`,
      data
    );
    alert("Export enregistré avec succès.");
  }, [
    currentProfileId,
    privacyStatus.protectedAtRest,
    privacyStatus.passwordProtected,
    privateDataLoaded,
    profiles,
  ]);

  const exportCurrentProfile = useCallback(() => {
    if (!privateDataLoaded) {
      alert("Les données médicales protégées sont encore en cours de chargement.");
      return;
    }

    if (!currentProfile) {
      alert("Aucun profil à exporter.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "L'export contient les informations médicales et personnelles de ce profil en clair. Continuer ?"
      )
    ) {
      return;
    }

    const data = {
      appName: "Ma Voix",
      version: 1,
      exportType: "profile",
      exportDate: new Date().toISOString(),
      privacy: {
        containsSensitiveMedicalData: true,
        localStorageProtectedAtRest: privacyStatus.protectedAtRest,
        passwordProtected: privacyStatus.passwordProtected,
      },
      currentProfileId: currentProfile.id,
      profile: currentProfile,
      profiles: [currentProfile],
      abbreviationDictionary: readExportableAbbreviationDictionary(),
    };

    const date = new Date().toISOString().slice(0, 10);
    saveJsonFile(
      `ma-voix-profil-${safeFilePart(currentProfile.name)}-${date}.json`,
      data
    );
    alert("Profil exporté avec succès.");
  }, [
    currentProfile,
    privacyStatus.protectedAtRest,
    privacyStatus.passwordProtected,
    privateDataLoaded,
  ]);

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

        const normalizedProfiles = parsed.profiles.map((profile) =>
          normalizeImportedProfile(profile)
        );
        const abbreviationDictionary =
          parsed.abbreviationDictionary || parsed.dictionary?.abbreviations;
        if (abbreviationDictionary) {
          importAbbreviationDictionary(abbreviationDictionary);
        }

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

  const importCurrentProfile = useCallback((event: React.ChangeEvent<HTMLInputElement>, { onAfterImport }: UseProfilesOptions = {}) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const rawProfile =
          parsed.profile ||
          (Array.isArray(parsed.profiles) && parsed.profiles.length > 0
            ? parsed.profiles[0]
            : null);

        if (!rawProfile) {
          throw new Error("Fichier invalide");
        }

        const abbreviationDictionary =
          parsed.abbreviationDictionary || parsed.dictionary?.abbreviations;
        if (abbreviationDictionary) {
          importAbbreviationDictionary(abbreviationDictionary);
        }

        let importedProfile = normalizeImportedProfile(rawProfile);
        const existingProfile = profiles.find(
          (profile) => profile.id === importedProfile.id
        );
        const replaceExisting =
          Boolean(existingProfile) &&
          typeof window !== "undefined" &&
          window.confirm(
            "Ce profil existe déjà sur cet appareil. OK pour le remplacer, Annuler pour importer une copie."
          );

        if (existingProfile && !replaceExisting) {
          importedProfile = {
            ...importedProfile,
            id: generateId(),
            name: `${importedProfile.name || "Profil importé"} (importé)`,
          };
        }

        setProfiles((previousProfiles) => {
          const existingIndex = previousProfiles.findIndex(
            (profile) => profile.id === importedProfile.id
          );

          if (existingIndex !== -1 && replaceExisting) {
            return previousProfiles.map((profile, index) =>
              index === existingIndex ? importedProfile : profile
            );
          }

          return [...previousProfiles, importedProfile];
        });

        setCurrentProfileId(importedProfile.id);
        onAfterImport?.(importedProfile, importedProfile.id);
        alert("Profil importé avec succès.");
      } catch (error) {
        console.error(error);
        alert("Le fichier de profil importé n'est pas valide.");
      }

      event.target.value = "";
    };

    reader.readAsText(file);
  }, [profiles]);

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
    privacyStatus,
    enablePrivacyPassword,
    unlockPrivateData,
    lockPrivateData,
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
    exportCurrentProfile,
    importCurrentProfile,
    exportAllProfiles,
    importAllProfiles,
  };
}
