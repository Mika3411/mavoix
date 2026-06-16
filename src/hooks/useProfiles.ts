import type React from "react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import DocumentSaver from "../plugins/DocumentSaver";
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
        console.error("Impossible de dechiffrer les donnees privees :", error);
        if (cancelled) return;

        setPrivacyStatus({
          privateDataLoaded: false,
          protectedAtRest: true,
          passwordProtected: false,
          locked: false,
          error:
            "Les donnees medicales locales sont protegees, mais elles n'ont pas pu etre chargees sur cet appareil.",
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
        console.error("Impossible de proteger les profils locaux :", error);
        if (cancelled) return;
        setPrivacyStatus({
          privateDataLoaded: true,
          protectedAtRest: false,
          passwordProtected: Boolean(privacyPassword),
          locked: false,
          error: "Impossible de chiffrer les donnees medicales locales.",
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

  const currentProfile = useMemo(() => {
    const profile = profiles.find((profile) => profile.id === currentProfileId) || profiles[0];
    if (!profile) return profile;

    return {
      ...profile,
      pinProtection: {
        enabled: Boolean((profile as any)?.pinProtection?.enabled),
        pin: String((profile as any)?.pinProtection?.pin || "").replace(/\D/g, "").slice(0, 4),
      },
    } as Profile;
  }, [profiles, currentProfileId]);

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
      pinProtection: { enabled: false, pin: "" },
    } as Profile);
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
      pinProtection: {
        enabled: Boolean((currentProfile as any)?.pinProtection?.enabled),
        pin: String((currentProfile as any)?.pinProtection?.pin || "").replace(/\D/g, "").slice(0, 4),
      },
      caregiverAlertLinks: duplicatedCaregiverAlertLinks,
    } as Profile);

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
        throw new Error("Choisis un mot de passe d'au moins 8 caracteres.");
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

  const exportAllProfiles = useCallback(async () => {
    if (!privateDataLoaded) {
      alert("Les donnees medicales protegees sont encore en cours de chargement.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "L'export contient les informations medicales et personnelles en clair. Continuer ?"
      )
    ) {
      return;
    }

    try {
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

      const fileName = `ma-voix-profils-${new Date().toISOString().slice(0, 10)}.json`;
      const json = JSON.stringify(data, null, 2);

      if (Capacitor.isNativePlatform()) {
        await DocumentSaver.saveJson({
          fileName,
          content: json,
          mimeType: "application/json",
        });
        alert("Export enregistré avec succès.");
        return;
      }

      const blob = new Blob([json], {
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
    } catch (error) {
      console.error("Erreur export :", error);
      alert(`Impossible d'exporter les profils. ${String(error)}`);
    }
  }, [
    currentProfileId,
    privacyStatus.protectedAtRest,
    privacyStatus.passwordProtected,
    privateDataLoaded,
    profiles,
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
          ensureProfile({
            ...profile,
            pinProtection: {
              enabled: Boolean((profile as any)?.pinProtection?.enabled),
              pin: String((profile as any)?.pinProtection?.pin || "").replace(/\D/g, "").slice(0, 4),
            },
          } as Profile)
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
    exportAllProfiles,
    importAllProfiles,
  };
}
