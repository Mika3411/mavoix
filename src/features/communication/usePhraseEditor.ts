import { useEffect, useMemo, useState } from "react";
import { generateId } from "../../data";
import type {
  Category,
  Phrase,
  Profile,
  StateSetter,
  VoiceEditor,
  VoiceSettings,
} from "../../shared/types";

type UpdateCurrentProfile = (updater: (profile: Profile) => Profile) => void;

type UsePhraseEditorOptions = {
  currentProfile: Profile;
  customCategories: Category[];
  defaultVoice: string;
  defaultVoiceSettings: VoiceSettings;
  savedPhrases: Phrase[];
  setText: StateSetter<string>;
  showToast: (message: string) => void;
  text: string;
  updateCurrentProfile: UpdateCurrentProfile;
};

function areVoiceEditorsEqual(a: VoiceEditor, b: VoiceEditor) {
  return (
    a.label === b.label &&
    a.text === b.text &&
    a.category === b.category &&
    a.assignedVoice === b.assignedVoice &&
    a.useProfileVoiceSettings === b.useProfileVoiceSettings &&
    a.voiceSettings.rate === b.voiceSettings.rate &&
    a.voiceSettings.pitch === b.voiceSettings.pitch &&
    a.voiceSettings.volume === b.voiceSettings.volume
  );
}

export default function usePhraseEditor({
  currentProfile,
  customCategories,
  defaultVoice,
  defaultVoiceSettings,
  savedPhrases,
  setText,
  showToast,
  text,
  updateCurrentProfile,
}: UsePhraseEditorOptions) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Général");
  const [filter, setFilter] = useState("Toutes");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💬");
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
  const [voiceEditor, setVoiceEditor] = useState<VoiceEditor>({
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

  const categories = useMemo(
    () => customCategories.map((item) => item.name),
    [customCategories]
  );

  const categoryOptions = useMemo(
    () => [
      { name: "Toutes", icon: "🗂️" },
      { name: "Favoris", icon: "⭐" },
      ...customCategories,
    ],
    [customCategories]
  );

  const filteredPhrases = useMemo(() => {
    if (filter === "Toutes") return savedPhrases;
    if (filter === "Favoris") {
      return savedPhrases.filter((item) => item.favorite);
    }
    return savedPhrases.filter((item) => item.category === filter);
  }, [savedPhrases, filter]);

  const selectedPhrase = useMemo(
    () => savedPhrases.find((item) => item.id === selectedPhraseId) || null,
    [savedPhrases, selectedPhraseId]
  );

  useEffect(() => {
    if (!categories.includes(category) && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

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
    const fallbackCategory = categories[0] || "Général";
    let nextVoiceEditor: VoiceEditor;

    if (!selectedPhrase) {
      nextVoiceEditor = {
        label: "",
        text: "",
        category: fallbackCategory,
        assignedVoice: "default",
        useProfileVoiceSettings: true,
        voiceSettings: {
          ...defaultVoiceSettings,
        },
      };
    } else {
      nextVoiceEditor = {
        label: selectedPhrase.label || "",
        text: selectedPhrase.text || "",
        category: selectedPhrase.category || fallbackCategory,
        assignedVoice: selectedPhrase.assignedVoice || "default",
        useProfileVoiceSettings: !selectedPhrase.voiceSettings,
        voiceSettings: {
          rate: selectedPhrase.voiceSettings?.rate ?? defaultVoiceSettings.rate,
          pitch: selectedPhrase.voiceSettings?.pitch ?? defaultVoiceSettings.pitch,
          volume:
            selectedPhrase.voiceSettings?.volume ?? defaultVoiceSettings.volume,
        },
      };
    }

    setVoiceEditor((current) =>
      areVoiceEditorsEqual(current, nextVoiceEditor) ? current : nextVoiceEditor
    );
  }, [
    selectedPhrase,
    categories,
    defaultVoiceSettings.rate,
    defaultVoiceSettings.pitch,
    defaultVoiceSettings.volume,
  ]);

  function savePhrase() {
    if (!text.trim()) return;

    const newPhrase: Phrase = {
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

    showToast("Phrase enregistrée");
  }

  function updatePhrase(id: string, field: keyof Phrase, value: unknown) {
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

  function deletePhrase(id: string) {
    const phraseToDelete = savedPhrases.find((item) => item.id === id);
    const phraseLabel = phraseToDelete?.label || phraseToDelete?.text || "cette phrase";

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Supprimer "${phraseLabel}" ?`)
    ) {
      return;
    }

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

  function movePhrase(id: string, direction: "up" | "down") {
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

  function deleteCategory(categoryName: string) {
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

  return {
    addCategory,
    categories,
    category,
    categoryOptions,
    deleteCategory,
    deletePhrase,
    filter,
    filteredPhrases,
    label,
    movePhrase,
    newCategoryIcon,
    newCategoryName,
    savePhrase,
    saveSelectedPhraseVoiceSettings,
    selectedPhrase,
    selectedPhraseId,
    setCategory,
    setFilter,
    setLabel,
    setNewCategoryIcon,
    setNewCategoryName,
    setSelectedPhraseId,
    setVoiceEditor,
    updatePhrase,
    voiceEditor,
  };
}
