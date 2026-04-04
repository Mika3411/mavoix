export const DEFAULT_CATEGORIES = [
  { name: "Général", icon: "💬" },
  { name: "Besoins", icon: "🥤" },
  { name: "Santé", icon: "🩺" },
  { name: "Émotions", icon: "😊" },
  { name: "Urgence", icon: "🚨" },
  { name: "Famille", icon: "👨‍👩‍👧" },
];

export const AVAILABLE_ICONS = [
  "💬",
  "🥤",
  "🍽️",
  "🩺",
  "😊",
  "😢",
  "🚨",
  "👨‍👩‍👧",
  "❤️",
  "💊",
  "🛏️",
  "🚽",
  "📞",
  "🏠",
  "🚗",
  "📚",
  "🎵",
  "🙏",
  "🧠",
  "⚙️",
  "🌤️",
  "🛒",
  "🐶",
  "💧",
];

export const CATEGORY_COLORS = {
  Général: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  Besoins: "linear-gradient(135deg, #0ea5e9, #0284c7)",
  Santé: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  Émotions: "linear-gradient(135deg, #f59e0b, #d97706)",
  Urgence: "linear-gradient(135deg, #ef4444, #dc2626)",
  Famille: "linear-gradient(135deg, #22c55e, #16a34a)",
};

export function generateId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export function readJSON(key, fallback) {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Erreur lecture ${key}`, error);
    return fallback;
  }
}

export function createProfile(name = "Profil principal") {
  return {
    id: generateId(),
    name,
    firstName: "",
    lastName: "",
    birthDate: "",
    address: "",
    language: "fr-FR",
    mainNeeds: "",
    profilePhoto: "",
    medicalInfo: {
      bloodType: "",
      allergies: "",
      medicalHistory: "",
      condition: "",
      treatments: [],
    },
    doctorInfo: {
      name: "",
      phone: "",
    },
    emergencyContacts: [
      {
        id: generateId(),
        name: "",
        phone: "",
        relation: "",
      },
    ],
    donationUrl: "https://buymeacoffee.com/",
    defaultVoice: "default",
    voiceSettings: {
      rate: 1,
      pitch: 1,
      volume: 1,
    },
    aiSettings: {
      enabled: false,
      mode: "simple",
      tone: "direct",
    },
    themeMode: "dark",
    customTheme: {
      pageBackground: "#111827",
      cardBackground: "#0f172a",
      textColor: "#e5eefc",
      titleColor: "#f8fafc",
      subtitleColor: "#94a3b8",
      inputBackground: "#0a1020",
      inputBorder: "#334155",
      primaryButtonBackground: "#2563eb",
      secondaryButtonBackground: "#1e293b",
      secondaryButtonText: "#e2e8f0",
      accentColor: "#3b82f6",
    },
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    audioMap: {},
    phrases: [
      {
        id: generateId(),
        label: "Bonjour",
        text: "Bonjour",
        category: "Général",
        assignedVoice: "default",
        voiceSettings: null,
        favorite: true,
      },
      {
        id: generateId(),
        label: "Aide",
        text: "J'ai besoin d'aide",
        category: "Urgence",
        assignedVoice: "default",
        voiceSettings: null,
        favorite: true,
      },
      {
        id: generateId(),
        label: "Eau",
        text: "J'ai soif",
        category: "Besoins",
        assignedVoice: "default",
        voiceSettings: null,
        favorite: false,
      },
    ],
  };
}

export function getCategoryBackground(categoryName) {
  return (
    CATEGORY_COLORS[categoryName] || "linear-gradient(135deg, #475569, #334155)"
  );
}
