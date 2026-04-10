import type React from "react";

export type StyleMap = Record<string, React.CSSProperties>;

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
};

export type AIUsage = {
  creditsRemaining: number;
  globalCreditsRemaining: number;
  blocked: boolean;
  donorWall: Array<{ name?: string; donorName?: string; amountEuro?: number; note?: string }>;
  euroToCreditsRate: number;
  availableSource: string;
};

export type VoiceEditor = {
  label: string;
  text: string;
  category: string;
  assignedVoice: string;
  useProfileVoiceSettings: boolean;
  voiceSettings: VoiceSettings;
};

export type UseProfilesOptions = {
  onAfterCreate?: (profile: Profile) => void;
  onAfterDelete?: (profile: Profile) => void;
  onAfterImport?: (profile: Profile, importedCurrentId: string) => void;
};
