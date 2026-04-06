import React from "react";

const PREFIX_WORD_SUGGESTIONS = [
  "bonjour",
  "bonsoir",
  "bonne",
  "merci",
  "oui",
  "non",
  "je",
  "j'ai",
  "besoin",
  "aide",
  "s'il",
  "te",
  "plaît",
  "fatigué",
  "soif",
  "faim",
  "mal",
  "douleur",
  "voudrais",
  "boire",
  "manger",
  "toilette",
  "repos",
  "médicament",
  "infirmier",
  "médecin",
  "monsieur",
  "madame",
  "comment",
  "les",
  "beaucoup",
  "vite",
  "maintenant",
  "eau",
  "aider",
  "venir",
  "parler",
  "aller",
  "encore",
  "stop",
  "famille",
  "maman",
  "papa",
];

const NEXT_WORD_SUGGESTIONS = {
  bonjour: ["les", "monsieur", "madame", "comment"],
  bonsoir: ["les", "monsieur", "madame"],
  merci: ["beaucoup", "pour"],
  je: ["suis", "voudrais", "veux", "n'ai"],
  "j'ai": ["besoin", "mal", "faim", "soif"],
  besoin: ["d'aide", "de", "de vous"],
  "besoin d'aide": ["vite", "maintenant"],
  suis: ["fatigué", "prêt", "là", "désolé"],
  voudrais: ["boire", "manger", "parler", "aller"],
  comment: ["allez-vous", "ça va"],
  les: ["amis", "enfants"],
  monsieur: ["docteur"],
  madame: ["docteur"],
  aide: ["vite", "maintenant"],
};

export default function ProfileSettingsPage({
  styles,
  page,
  currentProfile,
  updateCurrentProfileField,
  updateNestedProfileField,
  updateProfilePhoto,
  removeProfilePhoto,
  addTreatment,
  updateTreatment,
  deleteTreatment,
  currentProfileId,
  setCurrentProfileId,
  profiles,
  setFilter,
  setCategory,
  createNewProfile,
  duplicateCurrentProfile,
  deleteCurrentProfile,
  exportAllProfiles,
  importAllProfiles,
  fileInputRef,
  text,
  setText,
  isListening,
  stopDictation,
  startDictation,
  speakText,
  stopSpeaking,
  savePhrase,
  label,
  setLabel,
  category,
  categories,
  newCategoryName,
  setNewCategoryName,
  newCategoryIcon,
  setNewCategoryIcon,
  AVAILABLE_ICONS,
  addCategory,
  customCategories,
  deleteCategory,
  emergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  aiGeneratedText,
  aiLoading,
  aiError,
  aiUsage,
  aiStatusLoading,
  generateTextWithAI,
  setAiGeneratedText,
  tone,
  setTone,
  audience,
  setAudience,
  goToCreditsPage,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [sendMode, setSendMode] = React.useState("sms");
  const [selectedSendContactId, setSelectedSendContactId] = React.useState(
    emergencyContacts?.[0]?.id || ""
  );

  function getContactUsage(contact) {
    return contact?.usage || "contact";
  }

  const sendableContacts = (emergencyContacts || []).filter(
    (contact) =>
      (contact.name || contact.phone) && getContactUsage(contact) !== "urgence"
  );

  const profileHistoryStorageKey = React.useMemo(() => {
    const profileKey =
      currentProfileId ||
      currentProfile?.id ||
      currentProfile?.name ||
      "default";
    return `phraseSuggestionHistory:${profileKey}`;
  }, [currentProfileId, currentProfile?.id, currentProfile?.name]);

  const [suggestionHistory, setSuggestionHistory] = React.useState({});

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(profileHistoryStorageKey);
      setSuggestionHistory(saved ? JSON.parse(saved) : {});
    } catch (error) {
      console.error("Impossible de lire l'historique des suggestions :", error);
      setSuggestionHistory({});
    }
  }, [profileHistoryStorageKey]);

  const profileContextWords = React.useMemo(() => {
    const values = [
      currentProfile?.mainNeeds,
      currentProfile?.language,
      currentProfile?.medicalInfo?.condition,
      currentProfile?.medicalInfo?.allergies,
      currentProfile?.medicalInfo?.medicalHistory,
      currentProfile?.doctorInfo?.name,
      ...(emergencyContacts || []).flatMap((contact) => [
        contact?.name,
        contact?.relation,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const extracted = values.match(/[a-zàâçéèêëîïôûùüÿñæœ'-]{2,}/gi) || [];
    return Array.from(new Set(extracted)).slice(0, 120);
  }, [currentProfile, emergencyContacts]);

  const historyWords = React.useMemo(() => {
    return Object.entries(suggestionHistory || {})
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .map(([word]) => word)
      .filter(Boolean);
  }, [suggestionHistory]);

  function saveSuggestionToHistory(suggestion) {
    const normalized = String(suggestion || "").trim().toLowerCase();
    if (!normalized) return;

    setSuggestionHistory((prev) => {
      const nextHistory = {
        ...(prev || {}),
        [normalized]: Number(prev?.[normalized] || 0) + 1,
      };

      try {
        window.localStorage.setItem(
          profileHistoryStorageKey,
          JSON.stringify(nextHistory)
        );
      } catch (error) {
        console.error("Impossible d'enregistrer l'historique :", error);
      }

      return nextHistory;
    });
  }

  function uniqueSuggestions(words) {
    return Array.from(
      new Set(
        (words || [])
          .map((word) => String(word || "").trim())
          .filter(Boolean)
      )
    );
  }

  const liveSuggestions = React.useMemo(() => {
    const rawText = String(text || "");
    if (!rawText.trim()) return [];

    const trimmed = rawText.trim().toLowerCase();
    const endsWithSpace = /\s$/.test(rawText);
    const words = trimmed.split(/\s+/).filter(Boolean);

    if (words.length === 0) return [];

    const fallbackSuggestions = uniqueSuggestions([
      ...historyWords,
      ...profileContextWords,
      ...PREFIX_WORD_SUGGESTIONS,
    ]);

    if (!endsWithSpace) {
      const fragment = words[words.length - 1];

      return uniqueSuggestions([
        ...historyWords.filter(
          (word) =>
            word.toLowerCase().startsWith(fragment) &&
            word.toLowerCase() !== fragment
        ),
        ...profileContextWords.filter(
          (word) =>
            word.toLowerCase().startsWith(fragment) &&
            word.toLowerCase() !== fragment
        ),
        ...PREFIX_WORD_SUGGESTIONS.filter(
          (word) =>
            word.toLowerCase().startsWith(fragment) &&
            word.toLowerCase() !== fragment
        ),
      ]).slice(0, 6);
    }

    const lastWord = words[words.length - 1];
    const lastTwoWords =
      words.length >= 2
        ? `${words[words.length - 2]} ${words[words.length - 1]}`
        : "";

    return uniqueSuggestions([
      ...(NEXT_WORD_SUGGESTIONS[lastTwoWords] || []),
      ...(NEXT_WORD_SUGGESTIONS[lastWord] || []),
      ...historyWords,
      ...profileContextWords,
      ...fallbackSuggestions,
    ]).slice(0, 6);
  }, [text, historyWords, profileContextWords]);

  function applySuggestion(suggestion) {
    const currentText = String(text || "");
    saveSuggestionToHistory(suggestion);

    if (!currentText.trim()) {
      setText(`${suggestion} `);
      setAiGeneratedText("");
      return;
    }

    const endsWithSpace = /\s$/.test(currentText);

    if (endsWithSpace) {
      setText(`${currentText}${suggestion} `);
      setAiGeneratedText("");
      return;
    }

    const parts = currentText.split(/\s+/).filter(Boolean);
    parts[parts.length - 1] = suggestion;
    setText(`${parts.join(" ")} `);
    setAiGeneratedText("");
  }

  const visibleSuggestionChips = liveSuggestions;

  React.useEffect(() => {
    if (!sendableContacts.length) {
      setSelectedSendContactId("");
      return;
    }

    const stillExists = sendableContacts.some(
      (contact) => contact.id === selectedSendContactId
    );

    if (!stillExists) {
      setSelectedSendContactId(sendableContacts[0].id);
    }
  }, [sendableContacts, selectedSendContactId]);

  function sanitizePhoneInput(value) {
    const raw = String(value || "");
    let cleaned = raw.replace(/[^\d+]/g, "");

    if (!cleaned) return "";

    if (cleaned.startsWith("+")) {
      cleaned = `+${cleaned.slice(1).replace(/\+/g, "")}`;
    } else {
      cleaned = cleaned.replace(/\+/g, "");
    }

    return cleaned;
  }

  function formatPhoneForStorage(value) {
    const cleaned = sanitizePhoneInput(value);

    if (!cleaned) return "";
    if (cleaned.startsWith("+33")) return cleaned;
    if (cleaned.startsWith("33")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+33${cleaned.slice(1)}`;
    if (cleaned.startsWith("+")) return cleaned;
    return `+${cleaned}`;
  }

  function normalizeWhatsAppPhone(rawPhone) {
    const cleaned = String(rawPhone || "")
      .replace(/\s+/g, "")
      .replace(/[^\d+]/g, "");

    if (cleaned.startsWith("+33")) return cleaned.slice(1);
    if (cleaned.startsWith("33")) return cleaned;
    if (cleaned.startsWith("0")) return `33${cleaned.slice(1)}`;
    return cleaned.replace(/^\+/, "");
  }

  function handleSendMessage() {
    const selectedContact =
      sendableContacts.find((contact) => contact.id === selectedSendContactId) ||
      sendableContacts[0];

    if (!selectedContact?.phone) {
      window.alert("Ajoute d'abord un numéro de contact dans Profil.");
      return;
    }

    const message = (aiGeneratedText || text || "").trim();

    if (!message) {
      window.alert("Aucun message à envoyer.");
      return;
    }

    if (sendMode === "whatsapp") {
      const phone = normalizeWhatsAppPhone(selectedContact.phone);
      const appUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.location.href = appUrl;
      window.setTimeout(() => {
        window.open(webUrl, "_blank", "noopener,noreferrer");
      }, 1200);
      return;
    }

    const smsUrl = `sms:${selectedContact.phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  }

  function handleConfirmDeleteProfile() {
    deleteCurrentProfile();
    setShowDeleteConfirm(false);
  }

  function updateCustomThemeField(field, value) {
    updateCurrentProfileField("customTheme", {
      ...(currentProfile.customTheme || {}),
      [field]: value,
    });
  }

  const themeOptionStyle = (mode) =>
    currentProfile.themeMode === mode
      ? styles.primaryButton
      : styles.secondaryButton;

  if (page === "profil") {
    const compactCard = {
      ...styles.card,
      display: "inline-block",
      width: "100%",
      marginBottom: 20,
      breakInside: "avoid",
      WebkitColumnBreakInside: "avoid",
      pageBreakInside: "avoid",
      boxSizing: "border-box",
      verticalAlign: "top",
    };

    return (
      <>
        <div
          style={{
            columnCount: window.innerWidth > 1240 ? 3 : window.innerWidth > 820 ? 2 : 1,
            columnGap: 20,
          }}
        >
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Profil utilisateur</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Photo de profil</label>

            {currentProfile.profilePhoto ? (
              <div style={{ marginBottom: 12 }}>
                <img
                  src={currentProfile.profilePhoto}
                  alt="Photo du profil"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 18,
                    border: "2px solid rgba(255,255,255,0.12)",
                  }}
                />
              </div>
            ) : null}

            <div style={styles.inlineButtons}>
              <label style={styles.importLabel}>
                Choisir une photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={updateProfilePhoto}
                  style={{ display: "none" }}
                />
              </label>

              {currentProfile.profilePhoto ? (
                <button
                  style={styles.deleteButton}
                  onClick={removeProfilePhoto}
                >
                  Supprimer la photo
                </button>
              ) : null}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom du profil</label>
              <input
                value={currentProfile.name}
                onChange={(e) =>
                  updateCurrentProfileField("name", e.target.value)
                }
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Prénom</label>
              <input
                value={currentProfile.firstName || ""}
                onChange={(e) =>
                  updateCurrentProfileField("firstName", e.target.value)
                }
                style={styles.input}
                placeholder="Ex : Lina"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom de famille</label>
              <input
                value={currentProfile.lastName || ""}
                onChange={(e) =>
                  updateCurrentProfileField("lastName", e.target.value)
                }
                style={styles.input}
                placeholder="Ex : Martin"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Date de naissance</label>
              <input
                type="date"
                value={currentProfile.birthDate || ""}
                onChange={(e) =>
                  updateCurrentProfileField("birthDate", e.target.value)
                }
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Adresse</label>
            <textarea
              value={currentProfile.address || ""}
              onChange={(e) =>
                updateCurrentProfileField("address", e.target.value)
              }
              style={styles.smallTextarea}
              placeholder="Adresse complète"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Numéro de sécurité sociale</label>
            <input
              value={currentProfile.socialSecurityNumber || ""}
              onChange={(e) =>
                updateCurrentProfileField(
                  "socialSecurityNumber",
                  e.target.value
                )
              }
              style={styles.input}
              placeholder="Ex : 1 86 05 75 123 456 78"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Langue</label>
            <input
              value={currentProfile.language}
              onChange={(e) =>
                updateCurrentProfileField("language", e.target.value)
              }
              style={styles.input}
              placeholder="fr-FR"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Besoins principaux</label>
            <textarea
              value={currentProfile.mainNeeds}
              onChange={(e) =>
                updateCurrentProfileField("mainNeeds", e.target.value)
              }
              style={styles.smallTextarea}
              placeholder="Ex : eau, douleur, toilette, repos..."
            />
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Thème visuel</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Choisir un thème</label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "dark")}
                style={themeOptionStyle("dark")}
              >
                🌙 Sombre
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "light")}
                style={themeOptionStyle("light")}
              >
                ☀️ Clair
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCurrentProfileField("themeMode", "colorful")
                }
                style={themeOptionStyle("colorful")}
              >
                🎨 Coloré
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "custom")}
                style={themeOptionStyle("custom")}
              >
                🛠️ Personnalisé
              </button>
            </div>
          </div>

          {currentProfile.themeMode === "custom" ? (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fond de page</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.pageBackground || "#111827"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("pageBackground", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fond des cartes</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.cardBackground || "#0f172a"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("cardBackground", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Texte principal</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.textColor || "#e5eefc"}
                    onChange={(e) =>
                      updateCustomThemeField("textColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Titres</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.titleColor || "#f8fafc"}
                    onChange={(e) =>
                      updateCustomThemeField("titleColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Sous-titres</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.subtitleColor || "#94a3b8"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("subtitleColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fond des champs</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.inputBackground || "#0a1020"
                    }
                    onChange={(e) =>
                      updateCustomThemeField("inputBackground", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Contour des champs</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.inputBorder || "#334155"}
                    onChange={(e) =>
                      updateCustomThemeField("inputBorder", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Bouton principal</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.primaryButtonBackground ||
                      "#2563eb"
                    }
                    onChange={(e) =>
                      updateCustomThemeField(
                        "primaryButtonBackground",
                        e.target.value
                      )
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Bouton secondaire</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.secondaryButtonBackground ||
                      "#1e293b"
                    }
                    onChange={(e) =>
                      updateCustomThemeField(
                        "secondaryButtonBackground",
                        e.target.value
                      )
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Texte bouton secondaire</label>
                  <input
                    type="color"
                    value={
                      currentProfile.customTheme?.secondaryButtonText ||
                      "#e2e8f0"
                    }
                    onChange={(e) =>
                      updateCustomThemeField(
                        "secondaryButtonText",
                        e.target.value
                      )
                    }
                    style={styles.colorInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Couleur d'accent</label>
                  <input
                    type="color"
                    value={currentProfile.customTheme?.accentColor || "#3b82f6"}
                    onChange={(e) =>
                      updateCustomThemeField("accentColor", e.target.value)
                    }
                    style={styles.colorInput}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Santé</h2>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Groupe sanguin</label>
              <input
                value={currentProfile.medicalInfo?.bloodType || ""}
                onChange={(e) =>
                  updateNestedProfileField(
                    "medicalInfo",
                    "bloodType",
                    e.target.value
                  )
                }
                style={styles.input}
                placeholder="Ex : O+"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Allergies</label>
              <input
                value={currentProfile.medicalInfo?.allergies || ""}
                onChange={(e) =>
                  updateNestedProfileField(
                    "medicalInfo",
                    "allergies",
                    e.target.value
                  )
                }
                style={styles.input}
                placeholder="Ex : pénicilline, arachides"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Antécédents médicaux importants</label>
            <textarea
              value={currentProfile.medicalInfo?.medicalHistory || ""}
              onChange={(e) =>
                updateNestedProfileField(
                  "medicalInfo",
                  "medicalHistory",
                  e.target.value
                )
              }
              style={styles.smallTextarea}
              placeholder="Ex : AVC, diabète, épilepsie..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Handicap / condition particulière
            </label>
            <textarea
              value={currentProfile.medicalInfo?.condition || ""}
              onChange={(e) =>
                updateNestedProfileField(
                  "medicalInfo",
                  "condition",
                  e.target.value
                )
              }
              style={styles.smallTextarea}
              placeholder="Ex : non verbal, autisme, malentendant..."
            />
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Traitements en cours</h2>

          <div style={styles.customCategoryList}>
            {(currentProfile.medicalInfo?.treatments || []).map((treatment) => (
              <div key={treatment.id} style={styles.categoryManagerBox}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <input
                    value={treatment.name}
                    onChange={(e) =>
                      updateTreatment(treatment.id, "name", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Nom du traitement"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Dosage</label>
                  <input
                    value={treatment.dosage}
                    onChange={(e) =>
                      updateTreatment(treatment.id, "dosage", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Ex : 500 mg"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fréquence</label>
                  <input
                    value={treatment.frequency}
                    onChange={(e) =>
                      updateTreatment(treatment.id, "frequency", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Ex : matin et soir"
                  />
                </div>

                <button
                  style={styles.deleteButton}
                  onClick={() => deleteTreatment(treatment.id)}
                >
                  Supprimer ce traitement
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button style={styles.primaryButton} onClick={addTreatment}>
              Ajouter un traitement
            </button>
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Médecin traitant</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nom</label>
            <input
              value={currentProfile.doctorInfo?.name || ""}
              onChange={(e) =>
                updateNestedProfileField("doctorInfo", "name", e.target.value)
              }
              style={styles.input}
              placeholder="Nom du médecin"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Téléphone</label>
            <input
              value={currentProfile.doctorInfo?.phone || ""}
              onChange={(e) =>
                updateNestedProfileField("doctorInfo", "phone", e.target.value)
              }
              style={styles.input}
              placeholder="06 00 00 00 00"
            />
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Contacts</h2>

          <div style={styles.customCategoryList}>
            {emergencyContacts.map((contact, index) => (
              <div key={contact.id} style={styles.categoryManagerBox}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <input
                    value={contact.name}
                    onChange={(e) =>
                      updateEmergencyContact(contact.id, "name", e.target.value)
                    }
                    style={styles.input}
                    placeholder={`Contact ${index + 1}`}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Téléphone</label>
                  <input
                    value={contact.phone}
                    onChange={(e) =>
                      updateEmergencyContact(
                        contact.id,
                        "phone",
                        sanitizePhoneInput(e.target.value)
                      )
                    }
                    onBlur={(e) =>
                      updateEmergencyContact(
                        contact.id,
                        "phone",
                        formatPhoneForStorage(e.target.value)
                      )
                    }
                    style={styles.input}
                    placeholder="+33600000000"
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      color: "rgba(255,255,255,0.62)",
                    }}
                  >
                    Format forcé : +33 pour les numéros français.
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Privilège / rôle</label>
                  <input
                    value={contact.relation}
                    onChange={(e) =>
                      updateEmergencyContact(
                        contact.id,
                        "relation",
                        e.target.value
                      )
                    }
                    style={styles.input}
                    placeholder="Maman, médecin, voisin..."
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <button
                    style={styles.deleteButton}
                    onClick={() => deleteEmergencyContact(contact.id)}
                  >
                    Supprimer ce contact
                  </button>

                  <select
                    value={getContactUsage(contact)}
                    onChange={(e) =>
                      updateEmergencyContact(contact.id, "usage", e.target.value)
                    }
                    style={{
                      ...styles.input,
                      minWidth: 180,
                      maxWidth: 220,
                    }}
                  >
                    <option value="contact">Contact</option>
                    <option value="urgence">Urgence</option>
                    <option value="both">Les deux</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button style={styles.primaryButton} onClick={addEmergencyContact}>
              Ajouter un contact
            </button>
          </div>
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Profils</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Choisir un profil</label>
            <select
              value={currentProfileId}
              onChange={(e) => {
                setCurrentProfileId(e.target.value);
                setFilter("Toutes");
                setCategory("Général");
              }}
              style={styles.input}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inlineButtons}>
            <button style={styles.primaryButton} onClick={createNewProfile}>
              Ajouter un profil
            </button>

            <button
              style={styles.secondaryButton}
              onClick={duplicateCurrentProfile}
            >
              Dupliquer
            </button>

            <button
              style={styles.deleteButton}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Supprimer ce profil
            </button>
          </div>

          <div style={{ height: 20 }} />

          <div style={styles.categoryManagerBox}>
            <h3 style={styles.managerTitle}>Sauvegarde</h3>

            <div style={styles.inlineButtons}>
              <button
                style={styles.secondaryButton}
                onClick={exportAllProfiles}
              >
                Exporter
              </button>

              <label style={styles.importLabel}>
                Importer
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={importAllProfiles}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-profile-title"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 6, 23, 0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 1000,
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              style={{
                ...styles.card,
                width: "100%",
                maxWidth: 520,
                padding: 24,
                borderRadius: 22,
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="delete-profile-title"
                style={{ ...styles.sectionTitle, marginBottom: 12 }}
              >
                Supprimer ce profil
              </h2>

              <p style={{ ...styles.text, marginBottom: 12 }}>
                Êtes-vous sûr de vouloir supprimer ce profil ?
              </p>

              <p
                style={{
                  ...styles.text,
                  color: "#fca5a5",
                  fontWeight: 700,
                  marginBottom: 20,
                }}
              >
                Cette action est irréversible. Les informations de ce profil seront supprimées, mais les crédits solidaires resteront disponibles pour les autres profils.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  style={styles.deleteButton}
                  onClick={handleConfirmDeleteProfile}
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      </>
    );
  }

  
if (page === "reglages") {
    return (
      <div style={styles.gridSingle}>
        <div style={styles.card}>
          <div style={styles.formGroup}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                Ajouter une phrase
              </h2>

              {liveSuggestions.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {liveSuggestions.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => applySuggestion(phrase)}
                      style={{
                        background: "#123b6b",
                        color: "#ffffff",
                        border: "1px solid #3b82f6",
                        borderRadius: 999,
                        padding: "8px 14px",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <label style={styles.label}>Texte à dire</label>
            <textarea
              value={text}
              onChange={(e) => {
                const nextValue = e.target.value;
                setText(nextValue);

                if (/\s$/.test(nextValue)) {
                  const typedWords = nextValue
                    .trim()
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(Boolean);
                  const lastTypedWord = typedWords[typedWords.length - 1];
                  if (lastTypedWord) {
                    saveSuggestionToHistory(lastTypedWord);
                  }
                }
              }}
              style={styles.textarea}
              placeholder="Écrire ici..."
            />

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 100%" }}>
                <label style={styles.label}>Envoyer à</label>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={selectedSendContactId || ""}
                    onChange={(e) => setSelectedSendContactId(e.target.value)}
                    style={{ ...styles.input, flex: "1 1 320px", minWidth: 220 }}
                    disabled={!sendableContacts.length}
                  >
                    {sendableContacts.length === 0 ? (
                      <option value="">Aucun contact disponible</option>
                    ) : (
                      sendableContacts.map((contact, index) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name || `Contact ${index + 1}`}
                        </option>
                      ))
                    )}
                  </select>

                  <select
                    value={sendMode}
                    onChange={(e) => setSendMode(e.target.value)}
                    style={{ ...styles.input, minWidth: 150, maxWidth: 170 }}
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={handleSendMessage}
                    disabled={!sendableContacts.length}
                  >
                    📩 Envoyer à{" "}
                    {sendableContacts.find(
                      (contact) => contact.id === selectedSendContactId
                    )?.name || sendableContacts[0]?.name || "..."}
                  </button>
                </div>
              </div>

              <div style={{ flex: "1 1 320px" }}>
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    width: "100%",
                  }}
                  onClick={generateTextWithAI}
                  disabled={aiLoading || !text.trim()}
                >
                  {aiLoading
                    ? "Génération..."
                    : aiUsage?.blocked
                    ? "✨ Acheter des crédits pour continuer"
                    : "✨ Générer par IA"}
                </button>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(34,197,94,0.14)",
                      border: "1px solid rgba(34,197,94,0.24)",
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {`Crédits : ${aiUsage?.creditsRemaining ?? 0}`}
                  </span>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={goToCreditsPage}
                  >
                    Recharger
                  </button>
                </div>
              </div>

              <div style={{ minWidth: 180, flex: "0 0 180px" }}>
                <label style={styles.label}>Ton</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={styles.input}
                >
                  <option value="naturel">Naturel</option>
                  <option value="professionnel">Professionnel</option>
                  <option value="humour">Humour</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              <div style={{ minWidth: 220, flex: "0 0 220px" }}>
                <label style={styles.label}>À qui je parle</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  style={styles.input}
                >
                  <option value="général">Général</option>
                  <option value="ami">Ami</option>
                  <option value="famille">Famille</option>
                  <option value="soignant">Soignant</option>
                  <option value="aidant">Aidant</option>
                </select>
              </div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phrase générée par l’IA</label>

            {aiError ? (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.16)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fecaca",
                  borderRadius: 16,
                  padding: 14,
                  fontSize: 18,
                  lineHeight: 1.5,
                }}
              >
                {aiError}
              </div>
            ) : (
              <div
                style={{
                  minHeight: 72,
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 20,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {aiGeneratedText || "La phrase générée apparaîtra ici."}
              </div>
            )}

            {aiGeneratedText ? (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setText(aiGeneratedText)}
                >
                  Utiliser cette phrase
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => speakText(aiGeneratedText)}
                >
                  ▶️ Écouter la phrase IA
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setAiGeneratedText("")}
                >
                  Effacer
                </button>
              </div>
            ) : null}
          </div>

          <div style={styles.buttonGrid}>
            <button
              style={isListening ? styles.recordingButton : styles.primaryButton}
              onClick={isListening ? stopDictation : startDictation}
            >
              {isListening ? "Arrêter la dictée" : "🎤 Dicter"}
            </button>

            <button
              style={styles.secondaryButton}
              onClick={() => speakText(text)}
            >
              ▶️ Écouter
            </button>
          </div>

          <div style={styles.buttonGrid}>
            <button style={styles.secondaryButton} onClick={stopSpeaking}>
              ⏹️ Stop voix
            </button>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Libellé du bouton</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={styles.input}
              placeholder="Ex : Besoin d'eau"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={styles.input}
            >
              {(categories || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button style={styles.primaryButton} onClick={savePhrase}>
            Enregistrer la phrase
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Catégories personnalisées</h2>

          <div style={styles.categoryManagerBox}>
            <h3 style={styles.managerTitle}>Ajouter une catégorie</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nom de la catégorie</label>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={styles.input}
                placeholder="Ex : Loisirs, Travail, Douleur"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Choisir une icône</label>
              <div style={styles.iconPickerGrid}>
                {(AVAILABLE_ICONS || []).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCategoryIcon(icon)}
                    style={
                      newCategoryIcon === icon
                        ? {
                            ...styles.iconButton,
                            ...styles.iconButtonActive,
                          }
                        : styles.iconButton
                    }
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <button style={styles.primaryButton} onClick={addCategory}>
              Ajouter la catégorie
            </button>

            <div style={styles.customCategoryList}>
              {(customCategories || []).map((cat) => (
                <div key={cat.name} style={styles.customCategoryItem}>
                  <div style={styles.customCategoryInfo}>
                    <span style={styles.customCategoryIcon}>{cat.icon}</span>
                    <span style={styles.customCategoryName}>{cat.name}</span>
                  </div>

                  <button
                    style={styles.deleteButton}
                    onClick={() => deleteCategory(cat.name)}
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}