import type { CSSProperties } from "react";

import React from "react";
import { formatTextSmart } from "./utils/textFormatting";
import { createCompactCardStyle } from "./utils/profileCardStyles";

export default function ProfileSettingsPage(props: any) {
  const {
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
    privacyStatus,
    enablePrivacyPassword,
    unlockPrivateData,
    lockPrivateData,
    caregiverAlertLinks = [],
    addCaregiverAlertLink,
    updateCaregiverAlertLink,
    deleteCaregiverAlertLink,
    copyCaregiverAlertLink,
    selectedCaregiverAlertLinkId = "",
    selectCaregiverAlertTarget,
    openNoticeSection,
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
    selectedSmsContactId,
    setSelectedSmsContactId,
  } = props;
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isPhraseBrowserOpen, setIsPhraseBrowserOpen] = React.useState(false);
  const [phraseBrowserCategory, setPhraseBrowserCategory] = React.useState("");
  const phraseBrowserRef = React.useRef(null);
  const standardTextAreaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [sendMode, setSendMode] = React.useState("sms");
  const [selectedSendContactId, setSelectedSendContactId] = React.useState(
    emergencyContacts?.[0]?.id || ""
  );
  const [privacyPassword, setPrivacyPassword] = React.useState("");
  const [privacyPasswordConfirm, setPrivacyPasswordConfirm] = React.useState("");
  const [privacyUnlockPassword, setPrivacyUnlockPassword] = React.useState("");
  const [privacyActionMessage, setPrivacyActionMessage] = React.useState("");
  const [privacyActionLoading, setPrivacyActionLoading] = React.useState(false);
  const availableCaregiverAlertLinks = React.useMemo(
    () => (caregiverAlertLinks || []).filter((link) => link.enabled),
    [caregiverAlertLinks]
  );
  const selectedCaregiverAlertLink =
    availableCaregiverAlertLinks.find(
      (link) => link.id === selectedCaregiverAlertLinkId
    ) ||
    availableCaregiverAlertLinks[0] ||
    null;

  async function handleEnablePrivacyPassword() {
    try {
      setPrivacyActionLoading(true);
      setPrivacyActionMessage("");

      if (privacyPassword !== privacyPasswordConfirm) {
        throw new Error("Les deux mots de passe ne correspondent pas.");
      }

      await enablePrivacyPassword?.(privacyPassword);
      setPrivacyPassword("");
      setPrivacyPasswordConfirm("");
      setPrivacyActionMessage("Verrou par mot de passe activé.");
    } catch (error) {
      setPrivacyActionMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'activer le verrou."
      );
    } finally {
      setPrivacyActionLoading(false);
    }
  }

  async function handleUnlockPrivateData() {
    try {
      setPrivacyActionLoading(true);
      setPrivacyActionMessage("");
      await unlockPrivateData?.(privacyUnlockPassword);
      setPrivacyUnlockPassword("");
      setPrivacyActionMessage("Données médicales déverrouillées.");
    } catch (error) {
      setPrivacyActionMessage(
        error instanceof Error
          ? "Mot de passe incorrect ou coffre illisible."
          : "Impossible de déverrouiller les données."
      );
    } finally {
      setPrivacyActionLoading(false);
    }
  }

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
      console.error("Impossible de lire l'historique :", error);
      setSuggestionHistory({});
    }
  }, [profileHistoryStorageKey]);

  function persistSuggestionHistory(nextHistory) {
    try {
      window.localStorage.setItem(
        profileHistoryStorageKey,
        JSON.stringify(nextHistory)
      );
    } catch (error) {
      console.error("Impossible d'enregistrer l'historique :", error);
    }
  }

  function saveWordToHistory(word) {
    const normalized = String(word || "").trim().toLowerCase();
    if (!normalized) return;

    setSuggestionHistory((prev) => {
      const nextHistory = {
        ...(prev || {}),
        [normalized]: Number(prev?.[normalized] || 0) + 1,
      };
      persistSuggestionHistory(nextHistory);
      return nextHistory;
    });
  }

  function focusStandardTextArea(nextCursorStart = null, nextCursorEnd = null) {
    window.requestAnimationFrame(() => {
      const textarea = standardTextAreaRef.current;
      if (!textarea) return;

      textarea.focus();

      const startPos =
        typeof nextCursorStart === "number"
          ? nextCursorStart
          : textarea.value.length;
      const endPos =
        typeof nextCursorEnd === "number" ? nextCursorEnd : startPos;

      try {
        textarea.setSelectionRange(startPos, endPos);
      } catch (error) {
        console.error("Impossible de positionner le curseur :", error);
      }
    });
  }

  function getWordBoundaries(value, selectionStart, selectionEnd) {
    let start = selectionStart;
    let end = selectionEnd;

    while (start > 0 && /[^\s.,;:!?()"“”'’«»]/.test(value[start - 1])) {
      start -= 1;
    }

    while (end < value.length && /[^\s.,;:!?()"“”'’«»]/.test(value[end])) {
      end += 1;
    }

    return { start, end };
  }

  const activeProfile = React.useMemo(() => {
    return (
      (profiles || []).find((profile) => profile.id === currentProfileId) ||
      currentProfile ||
      {}
    );
  }, [profiles, currentProfileId, currentProfile]);

  const savedPhrases = React.useMemo(() => {
    const candidates =
      activeProfile?.phrases ||
      activeProfile?.buttons ||
      activeProfile?.phraseButtons ||
      activeProfile?.quickPhrases ||
      activeProfile?.messages ||
      [];

    if (!Array.isArray(candidates)) return [];

    return candidates
      .map((item, index) => {
        if (typeof item === "string") {
          return {
            id: `phrase-${index}`,
            label: item,
            text: item,
            category: "Général",
          };
        }

        const phraseText =
          item?.text ||
          item?.phrase ||
          item?.message ||
          item?.content ||
          item?.value ||
          item?.label ||
          "";

        const phraseLabel = item?.label || phraseText || `Phrase ${index + 1}`;
        const phraseCategory = item?.category || item?.group || "Général";

        if (!phraseText && !phraseLabel) return null;

        return {
          id: item?.id || `phrase-${index}`,
          label: phraseLabel,
          text: phraseText || phraseLabel,
          category: phraseCategory,
        };
      })
      .filter(Boolean);
  }, [activeProfile]);

  const phraseBrowserCategories = React.useMemo(() => {
    return Array.from(
      new Set(savedPhrases.map((phrase) => phrase.category).filter(Boolean))
    );
  }, [savedPhrases]);

  const filteredSavedPhrases = React.useMemo(() => {
    if (!phraseBrowserCategory) return [];
    return savedPhrases.filter(
      (phrase) => String(phrase.category || "") === phraseBrowserCategory
    );
  }, [savedPhrases, phraseBrowserCategory]);

  React.useEffect(() => {
    if (
      phraseBrowserCategory &&
      !phraseBrowserCategories.includes(phraseBrowserCategory)
    ) {
      setPhraseBrowserCategory("");
    }
  }, [phraseBrowserCategories, phraseBrowserCategory]);

  React.useEffect(() => {
    function handlePointerDown(event) {
      if (!isPhraseBrowserOpen) return;
      const target = event.target;
      if (
        phraseBrowserRef.current &&
        target instanceof Node &&
        phraseBrowserRef.current.contains(target)
      ) {
        return;
      }
      setIsPhraseBrowserOpen(false);
      setPhraseBrowserCategory("");
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isPhraseBrowserOpen]);

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

    const message = (text || "").trim();

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
    const compactCard = createCompactCardStyle(styles.card, {
      marginBottom: 20,
    });

    if (privacyStatus?.passwordProtected && privacyStatus?.locked) {
      return (
        <div style={styles.gridSingle}>
          <div style={compactCard}>
            <h2 style={styles.sectionTitle}>Données médicales verrouillées</h2>

            <div style={{ ...styles.infoBox, marginBottom: 14, lineHeight: 1.55 }}>
              Les informations médicales, d'identité et le code PIN de ce profil
              sont protégés par un mot de passe local. Le mot de passe n'est pas
              stocké.
            </div>

            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              <label style={styles.label}>Mot de passe local</label>
              <input
                type="password"
                value={privacyUnlockPassword}
                onChange={(e) => setPrivacyUnlockPassword(e.target.value)}
                style={styles.input}
                placeholder="Déverrouiller les données médicales"
              />

              <button
                type="button"
                style={styles.primaryButton}
                onClick={handleUnlockPrivateData}
                disabled={privacyActionLoading || !privacyUnlockPassword}
              >
                {privacyActionLoading ? "Déverrouillage..." : "Déverrouiller"}
              </button>

              {privacyActionMessage ? (
                <div
                  style={{
                    ...styles.infoBox,
                    color:
                      privacyActionMessage.toLowerCase().includes("incorrect") ||
                      privacyActionMessage.toLowerCase().includes("impossible")
                        ? "#fecaca"
                        : undefined,
                  }}
                >
                  {privacyActionMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

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
          <h2 style={styles.sectionTitle}>Protection par code PIN</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Activer la protection des onglets Infos et Profil</label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 15,
              }}
            >
              <input
                type="checkbox"
                checked={Boolean((currentProfile as any)?.pinProtection?.enabled)}
                onChange={(e) =>
                  updateCurrentProfileField("pinProtection", {
                    enabled: e.target.checked,
                    pin: (currentProfile as any)?.pinProtection?.pin || "",
                  })
                }
              />
              Protéger l'accès avec un code PIN
            </label>
          </div>

          {Boolean((currentProfile as any)?.pinProtection?.enabled) ? (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Code PIN (4 chiffres)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={(currentProfile as any)?.pinProtection?.pin || ""}
                  onChange={(e) => {
                    const nextPin = e.target.value.replace(/\D/g, "").slice(0, 4);
                    updateCurrentProfileField("pinProtection", {
                      enabled: true,
                      pin: nextPin,
                    });
                  }}
                  style={styles.input}
                  placeholder="0000"
                />
              </div>

              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.5,
                }}
              >
                Ce code sera demandé avant d’ouvrir <strong>Infos</strong> et <strong>Profil</strong>.
              </div>
            </>
          ) : null}
        </div>

        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Téléphone aidant</h2>

          <div style={{ ...styles.infoBox, marginBottom: 14, lineHeight: 1.55 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              À quoi ça sert ?
            </strong>
            Crée un lien par aidant, puis coche ceux qui doivent être
            disponibles dans le choix <strong>Appel aidant</strong>. Avant
            d'appuyer sur la cloche, choisis l'aidant qui doit recevoir
            l'alarme.
          </div>

          {availableCaregiverAlertLinks.length > 0 ? (
            <div style={{ ...styles.formGroup, marginBottom: 14 }}>
              <label style={styles.label}>Aidant appelé par la cloche</label>
              <select
                value={selectedCaregiverAlertLink?.id || ""}
                onChange={(event) =>
                  selectCaregiverAlertTarget?.(event.target.value)
                }
                disabled={availableCaregiverAlertLinks.length <= 1}
                style={styles.input}
              >
                {availableCaregiverAlertLinks.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.name || "Aidant"}
                  </option>
                ))}
              </select>
              <div
                style={{
                  ...styles.infoBox,
                  marginTop: 10,
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                Le bouton Appel aidant enverra l'alarme uniquement à cet
                aidant.
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 14 }}>
            {caregiverAlertLinks.map((link, index) => (
              <div
                key={link.id}
                style={{
                  borderTop:
                    index === 0 ? "none" : "1px solid rgba(148, 163, 184, 0.25)",
                  paddingTop: index === 0 ? 0 : 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <label style={{ ...styles.label, margin: 0 }}>
                    Aidant {index + 1}
                  </label>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(link.enabled)}
                      onChange={(e) =>
                        updateCaregiverAlertLink?.(link.id, {
                          enabled: e.target.checked,
                        })
                      }
                    />
                    Disponible pour Appel aidant
                  </label>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom de l'aidant</label>
                  <input
                    value={link.name || ""}
                    onChange={(e) =>
                      updateCaregiverAlertLink?.(link.id, {
                        name: e.target.value,
                      })
                    }
                    style={styles.input}
                    placeholder={`Aidant ${index + 1}`}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Lien d'alarme</label>
                  <input
                    readOnly
                    value={link.alertLink || ""}
                    style={styles.input}
                  />
                </div>

                <div style={styles.inlineButtons}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => copyCaregiverAlertLink?.(link.id)}
                  >
                    Copier le lien
                  </button>

                  {link.alertLink ? (
                    <a
                      href={link.alertLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...styles.secondaryButton,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      Ouvrir le mode aidant
                    </a>
                  ) : null}

                  {link.appLink ? (
                    <a
                      href={link.appLink}
                      style={{
                        ...styles.secondaryButton,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      Ouvrir l'application aidant
                    </a>
                  ) : null}

                  <button
                    type="button"
                    style={{
                      ...styles.secondaryButton,
                      opacity: caregiverAlertLinks.length <= 1 ? 0.55 : 1,
                      cursor:
                        caregiverAlertLinks.length <= 1
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={caregiverAlertLinks.length <= 1}
                    onClick={() => deleteCaregiverAlertLink?.(link.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.inlineButtons, marginTop: 14 }}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={addCaregiverAlertLink}
            >
              Ajouter un aidant
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => openNoticeSection?.("aidant")}
            >
              Aide
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

            <div
              style={{
                ...styles.infoBox,
                marginBottom: 14,
                lineHeight: 1.55,
              }}
            >
              <strong>Confidentialité locale</strong>
              <br />
              {!privacyStatus?.privateDataLoaded
                ? "Chargement des données médicales protégées..."
                : privacyStatus?.passwordProtected
                ? "Les données médicales sont verrouillées par un mot de passe local non stocké."
                : privacyStatus?.protectedAtRest
                ? "Les données médicales, d'identité et le code PIN sont chiffrés dans le stockage local de cet appareil."
                : "Les données sont enregistrées localement, mais le chiffrement du navigateur n'est pas disponible."}
              {privacyStatus?.error ? (
                <div style={{ marginTop: 8, color: "#fecaca", fontWeight: 700 }}>
                  {privacyStatus.error}
                </div>
              ) : null}
              <div style={{ marginTop: 8, opacity: 0.78 }}>
                Les exports JSON restent lisibles et doivent être partagés avec prudence.
              </div>
              {privacyStatus?.passwordProtected ? (
                <div style={{ marginTop: 8, opacity: 0.78 }}>
                  Si le mot de passe est perdu, les données médicales locales ne pourront pas être récupérées.
                </div>
              ) : null}
            </div>

            {privacyStatus?.passwordProtected && privacyStatus?.locked ? (
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <label style={styles.label}>Mot de passe local</label>
                <input
                  type="password"
                  value={privacyUnlockPassword}
                  onChange={(e) => setPrivacyUnlockPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Déverrouiller les données médicales"
                />
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={handleUnlockPrivateData}
                  disabled={privacyActionLoading || !privacyUnlockPassword}
                >
                  {privacyActionLoading ? "Déverrouillage..." : "Déverrouiller"}
                </button>
              </div>
            ) : null}

            {!privacyStatus?.passwordProtected && privacyStatus?.privateDataLoaded ? (
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <label style={styles.label}>Ajouter un mot de passe local</label>
                <input
                  type="password"
                  value={privacyPassword}
                  onChange={(e) => setPrivacyPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Minimum 8 caractères"
                />
                <input
                  type="password"
                  value={privacyPasswordConfirm}
                  onChange={(e) => setPrivacyPasswordConfirm(e.target.value)}
                  style={styles.input}
                  placeholder="Confirmer le mot de passe"
                />
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={handleEnablePrivacyPassword}
                  disabled={
                    privacyActionLoading ||
                    !privacyPassword ||
                    !privacyPasswordConfirm
                  }
                >
                  {privacyActionLoading ? "Activation..." : "Activer le verrou"}
                </button>
              </div>
            ) : null}

            {privacyStatus?.passwordProtected && privacyStatus?.privateDataLoaded ? (
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    lockPrivateData?.();
                    setPrivacyActionMessage("Données médicales verrouillées.");
                  }}
                >
                  Verrouiller maintenant
                </button>
              </div>
            ) : null}

            {privacyActionMessage ? (
              <div
                style={{
                  ...styles.infoBox,
                  marginBottom: 14,
                  color:
                    privacyActionMessage.toLowerCase().includes("impossible") ||
                    privacyActionMessage.toLowerCase().includes("incorrect") ||
                    privacyActionMessage.toLowerCase().includes("correspondent")
                      ? "#fecaca"
                      : undefined,
                }}
              >
                {privacyActionMessage}
              </div>
            ) : null}

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
                Cette action est irréversible. Les informations de ce profil seront supprimées.
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
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 1180 ? "minmax(0, 1fr) 320px" : "1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div>
                <label style={styles.label}>Texte à dire</label>

                <textarea
                      ref={standardTextAreaRef}
                      value={text}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setText(formatTextSmart(nextValue));

                        if (/\s$/.test(nextValue)) {
                          const typedWords = nextValue
                            .trim()
                            .toLowerCase()
                            .split(/\s+/)
                            .filter(Boolean);

                          const lastTypedWord = typedWords[typedWords.length - 1];
                          if (lastTypedWord) {
                            saveWordToHistory(lastTypedWord);
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
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "nowrap",
                      }}
                    >
                      <button
                        style={{
                          ...styles.primaryButton,
                          flex: 1,
                          opacity: isListening ? 0.6 : 1,
                        }}
                        onClick={startDictation}
                        disabled={isListening}
                      >
                        🎤 Dicter
                      </button>

                      <button
                        style={{
                          ...styles.secondaryButton,
                          flex: 1,
                        }}
                        onClick={() => speakText(text)}
                      >
                        ▶️ Écouter
                      </button>
                    </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  position: "relative",
                  justifySelf: "end",
                  width: "100%",
                  maxWidth: 360,
                }}
              >
                <div
                  ref={phraseBrowserRef}
                  style={{ display: "grid", gap: 10, position: "relative", justifySelf: "end" }}
                >
                <button
                  type="button"
                  onClick={() => {
                    setIsPhraseBrowserOpen((prev) => !prev);
                    if (isPhraseBrowserOpen) {
                      setPhraseBrowserCategory("");
                    }
                  }}
                  style={
                    isPhraseBrowserOpen
                      ? { ...styles.primaryButton, width: "100%" }
                      : { ...styles.secondaryButton, width: "100%" }
                  }
                >
                  Phrases enregistrées
                </button>

                {isPhraseBrowserOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 8,
                      display: "flex",
                      alignItems: "flex-start",
                      zIndex: 40,
                    }}
                  >
                    <div
                      style={{
                        ...styles.card,
                        padding: 10,
                        minWidth: 220,
                        maxHeight: 320,
                        overflowY: "auto",
                        display: "grid",
                        gap: 8,
                        borderTopRightRadius: phraseBrowserCategory ? 8 : 22,
                        borderBottomRightRadius: phraseBrowserCategory ? 8 : 22,
                      }}
                    >
                      {phraseBrowserCategories.length > 0 ? (
                        phraseBrowserCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onMouseEnter={() => setPhraseBrowserCategory(cat)}
                            onClick={() => setPhraseBrowserCategory(cat)}
                            style={
                              phraseBrowserCategory === cat
                                ? {
                                    ...styles.primaryButton,
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    justifyContent: "space-between",
                                  }
                                : {
                                    ...styles.secondaryButton,
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    justifyContent: "space-between",
                                  }
                            }
                          >
                            <span>{cat}</span>
                            <span style={{ opacity: 0.72 }}>›</span>
                          </button>
                        ))
                      ) : (
                        <div style={{ ...styles.text, opacity: 0.72, fontSize: 14 }}>
                          Aucune catégorie enregistrée.
                        </div>
                      )}
                    </div>

                    {phraseBrowserCategory ? (
                      <div
                        style={{
                          ...styles.card,
                          marginLeft: 6,
                          padding: 10,
                          minWidth: 260,
                          maxWidth: 320,
                          maxHeight: 320,
                          overflowY: "auto",
                          display: "grid",
                          gap: 8,
                          borderTopLeftRadius: 8,
                          borderBottomLeftRadius: 8,
                        }}
                      >
                        {filteredSavedPhrases.length > 0 ? (
                          filteredSavedPhrases.map((phrase) => (
                            <button
                              key={phrase.id}
                              type="button"
                              onClick={() => {
                                const phraseValue = String(phrase.text || phrase.label || "");
                                setText((prev) => {
                                  const current = String(prev || "");
                                  if (!current.trim()) {
                                    return formatTextSmart(phraseValue);
                                  }
                                  const result = /\s$/.test(current)
                                    ? `${current}${phraseValue}`
                                    : `${current} ${phraseValue}`;
                                  return formatTextSmart(result);
                                });
                                setLabel(String(phrase.label || phrase.text || ""));
                                setCategory(String(phrase.category || "Général"));
                                setIsPhraseBrowserOpen(false);
                              }}
                              style={{
                                ...styles.secondaryButton,
                                textAlign: "left",
                                padding: "10px 12px",
                                display: "grid",
                                gap: 4,
                              }}
                            >
                              <span style={{ fontWeight: 800 }}>
                                {phrase.label || phrase.text}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  opacity: 0.78,
                                  fontWeight: 500,
                                }}
                              >
                                {phrase.category || "Général"}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div style={{ ...styles.text, opacity: 0.72, fontSize: 14 }}>
                            Aucune phrase dans cette catégorie.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                </div>

                <div
                  style={{
                    ...styles.card,
                    padding: 14,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Envoyer à</label>
                    <select
                      value={selectedSendContactId || ""}
                      onChange={(e) => setSelectedSendContactId(e.target.value)}
                      style={styles.input}
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
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Mode d’envoi</label>
                    <select
                      value={sendMode}
                      onChange={(e) => setSendMode(e.target.value)}
                      style={styles.input}
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

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
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                window.innerWidth > 1400
                  ? "minmax(0, 1fr) minmax(0, 1fr)"
                  : "1fr",
              gap: 14,
              marginTop: 12,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                ...styles.card,
                padding: 14,
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 1400
                    ? "minmax(220px, 1.1fr) minmax(170px, 0.8fr) minmax(320px, 1fr)"
                    : "1fr",
                gap: 14,
                alignItems: "end",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div style={{ ...styles.formGroup, minWidth: 0 }}>
                <label style={styles.label}>Libellé du bouton</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{
                    ...styles.input,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                  placeholder="Ex : Besoin d'eau"
                />
              </div>

              <div style={{ ...styles.formGroup, minWidth: 0 }}>
                <label style={styles.label}>Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    ...styles.input,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {(categories || []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <button
                style={{
                  ...styles.primaryButton,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
                onClick={savePhrase}
              >
                Enregistrer phrase
              </button>
            </div>
          </div>

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

