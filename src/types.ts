import type React from "react";

export type StyleMap = Record<string, React.CSSProperties>;

export type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export type Category = {
  name: string;
  icon: string;
};

export type VoiceSettings = {
  rate: number;
  pitch: number;
  volume: number;
};

export type Phrase = {
  id: string;
  label: string;
  text: string;
  category: string;
  favorite?: boolean;
  assignedVoice?: string;
  voiceSettings?: VoiceSettings | null;
};

export type Treatment = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  usage?: "urgence" | "both" | "contact" | string;
};

export type CaregiverAlertLink = {
  id: string;
  name: string;
  channel: string;
  accessKey?: string;
  enabled: boolean;
};

export type CaregiverAlertTarget = CaregiverAlertLink & {
  alertLink?: string;
  appLink?: string;
};

export type DoctorInfo = {
  name: string;
  phone: string;
};

export type MedicalInfo = {
  bloodType: string;
  allergies: string;
  medicalHistory: string;
  condition: string;
  treatments: Treatment[];
};

export type PinProtection = {
  enabled: boolean;
  pin: string;
};

export type Profile = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  address?: string;
  language?: string;
  profilePhoto?: string;
  photo?: string;
  socialSecurityNumber?: string;
  mainNeeds?: string;
  themeMode?: string;
  customTheme?: Record<string, string>;
  categories: Category[];
  phrases: Phrase[];
  audioMap: Record<string, string>;
  defaultVoice?: string;
  voiceSettings?: VoiceSettings;
  medicalInfo?: MedicalInfo;
  doctorInfo?: DoctorInfo;
  emergencyContacts?: EmergencyContact[];
  pinProtection?: PinProtection;
  caregiverAlertLinks?: CaregiverAlertLink[];
  selectedCaregiverAlertLinkId?: string;
};

export type VoiceEditor = {
  label: string;
  text: string;
  category: string;
  assignedVoice: string;
  useProfileVoiceSettings: boolean;
  voiceSettings: VoiceSettings;
};

export type SpeakText = (
  phrase: string,
  voiceURI?: string | null,
  phraseId?: string | null,
  overrideSettings?: Partial<VoiceSettings> | null
) => void | Promise<void>;

export type ProfileFieldUpdater = (
  field: keyof Profile | string,
  value: unknown
) => void;

export type NestedProfileFieldUpdater = (
  parentField: keyof Profile | string,
  childField: string,
  value: unknown
) => void;

export type PrivacyStatus = {
  privateDataLoaded: boolean;
  protectedAtRest: boolean;
  passwordProtected: boolean;
  locked: boolean;
  error: string;
};

export type UseProfilesOptions = {
  onAfterCreate?: (profile: Profile) => void;
  onAfterDelete?: (profile: Profile) => void;
  onAfterImport?: (profile: Profile, importedCurrentId: string) => void;
};
