import { createProfile, generateId } from "../data";
import { ensureCaregiverAlertLinks } from "./caregiverAlerts";
import type {
  DoctorInfo,
  EmergencyContact,
  MedicalInfo,
  Profile,
  Treatment,
} from "../types";

type LegacyProfileInput = Partial<Profile> & {
  emergencyContact?: string;
};

export function ensureTreatment(treatment?: Partial<Treatment>): Treatment {
  return {
    id: treatment?.id ?? generateId(),
    name: treatment?.name ?? "",
    dosage: treatment?.dosage ?? "",
    frequency: treatment?.frequency ?? "",
  };
}

export function ensureMedicalInfo(medicalInfo?: Partial<MedicalInfo>): MedicalInfo {
  return {
    bloodType: medicalInfo?.bloodType ?? "",
    allergies: medicalInfo?.allergies ?? "",
    medicalHistory: medicalInfo?.medicalHistory ?? "",
    condition: medicalInfo?.condition ?? "",
    treatments: (medicalInfo?.treatments ?? []).map(ensureTreatment),
  };
}

export function ensureDoctorInfo(doctorInfo?: Partial<DoctorInfo>): DoctorInfo {
  return {
    name: doctorInfo?.name ?? "",
    phone: doctorInfo?.phone ?? "",
  };
}

export function ensureEmergencyContact(
  contact?: Partial<EmergencyContact>
): EmergencyContact {
  return {
    id: contact?.id ?? generateId(),
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    relation: contact?.relation ?? "",
    usage: contact?.usage ?? "contact",
  };
}

export function ensurePinProtection(
  pinProtection?: Partial<Profile["pinProtection"]>
) {
  return {
    enabled: Boolean(pinProtection?.enabled),
    pin: String(pinProtection?.pin || "").replace(/\D/g, "").slice(0, 4),
  };
}

export function createEmptyEmergencyContact(): EmergencyContact {
  return {
    id: generateId(),
    name: "",
    phone: "",
    relation: "",
    usage: "contact",
  };
}

export function ensureProfile(profile?: LegacyProfileInput): Profile {
  const base = createProfile(profile?.name || "Profil importé") as Profile;
  const profileId = profile?.id ?? base.id;

  return {
    ...base,
    ...profile,
    id: profileId,
    name: profile?.name ?? base.name,
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    birthDate: profile?.birthDate ?? "",
    address: profile?.address ?? "",
    language: profile?.language ?? base.language ?? "fr-FR",
    profilePhoto: profile?.profilePhoto ?? "",
    photo: profile?.photo ?? "",
    socialSecurityNumber: profile?.socialSecurityNumber ?? "",
    themeMode: profile?.themeMode ?? base.themeMode,
    customTheme: profile?.customTheme ?? base.customTheme,
    categories: (profile?.categories ?? base.categories ?? []).map((category) => ({
      name: category?.name ?? "Général",
      icon: category?.icon ?? "💬",
    })),
    phrases: (profile?.phrases ?? []).map((phrase) => ({
      ...phrase,
      id: phrase?.id ?? generateId(),
      label: phrase?.label ?? "",
      text: phrase?.text ?? "",
      category: phrase?.category ?? "Général",
      favorite: phrase?.favorite ?? false,
      assignedVoice: phrase?.assignedVoice ?? "default",
      voiceSettings: phrase?.voiceSettings ?? null,
    })),
    audioMap: profile?.audioMap ?? {},
    defaultVoice: profile?.defaultVoice ?? "default",
    voiceSettings: profile?.voiceSettings ?? {
      rate: 1,
      pitch: 1,
      volume: 1,
    },
    medicalInfo: ensureMedicalInfo(profile?.medicalInfo),
    doctorInfo: ensureDoctorInfo(profile?.doctorInfo),
    emergencyContacts:
      profile?.emergencyContacts?.length && profile.emergencyContacts.length > 0
        ? profile.emergencyContacts.map(ensureEmergencyContact)
        : profile && typeof profile.emergencyContact === "string"
          ? [ensureEmergencyContact({ name: profile.emergencyContact })]
          : [createEmptyEmergencyContact()],
    pinProtection: ensurePinProtection(profile?.pinProtection),
    caregiverAlertLinks: ensureCaregiverAlertLinks(
      profile?.caregiverAlertLinks,
      profileId
    ),
  };
}
