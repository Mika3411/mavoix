import type { CSSProperties } from "react";

import React from "react";
import TalkPage from "../../communication/TalkPage";
import { formatTextSmart } from "../../dictionary/textFormatting";
import { createCompactCardStyle } from "../../../ui/layout/profileCardStyles";
import type { SectionKey } from "../../../NoticePage";
import type {
  CaregiverAlertTarget,
  Category,
  EmergencyContact,
  NestedProfileFieldUpdater,
  Phrase,
  PrivacyStatus,
  Profile,
  ProfileFieldUpdater,
  SpeakText,
  StateSetter,
  StyleMap,
  Treatment,
} from "../../../shared/types";

const CONFIG_SECTIONS = [
  { id: "identite", label: "Identité" },
  { id: "sante", label: "Santé" },
  { id: "contacts", label: "Contacts" },
  { id: "phrases", label: "Phrases" },
  { id: "securite", label: "Sécurité" },
] as const;

type ConfigSectionId = (typeof CONFIG_SECTIONS)[number]["id"];

type ProfileSettingsPageProps = {
  styles: StyleMap;
  page: string;
  currentProfile: Profile;
  updateCurrentProfileField: ProfileFieldUpdater;
  updateNestedProfileField: NestedProfileFieldUpdater;
  updateProfilePhoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeProfilePhoto: () => void;
  addTreatment: () => void;
  updateTreatment: (
    treatmentId: string,
    field: keyof Treatment | string,
    value: string
  ) => void;
  deleteTreatment: (treatmentId: string) => void;
  currentProfileId: string;
  setCurrentProfileId: StateSetter<string>;
  profiles: Profile[];
  setFilter: StateSetter<string>;
  setCategory: StateSetter<string>;
  createNewProfile: () => void;
  duplicateCurrentProfile: () => void;
  deleteCurrentProfile: () => void;
  exportCurrentProfile: () => void;
  importCurrentProfile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  exportAllProfiles: () => void;
  importAllProfiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  privacyStatus: PrivacyStatus;
  enablePrivacyPassword?: (password: string) => Promise<void> | void;
  unlockPrivateData?: (password: string) => Promise<void> | void;
  lockPrivateData?: () => void;
  caregiverAlertLinks?: CaregiverAlertTarget[];
  addCaregiverAlertLink: () => void;
  updateCaregiverAlertLink: (
    linkId: string,
    patch: Partial<Pick<CaregiverAlertTarget, "name" | "enabled">>
  ) => void;
  deleteCaregiverAlertLink: (linkId: string) => void;
  regenerateCaregiverAlertLink: (linkId: string) => void;
  copyCaregiverAlertLink: (linkId: string) => void | Promise<void>;
  selectedCaregiverAlertLinkId?: string;
  selectCaregiverAlertTarget: (linkId: string) => void;
  openNoticeSection: (section?: SectionKey) => void;
  text: string;
  setText: StateSetter<string>;
  isListening: boolean;
  stopDictation: () => void;
  startDictation: () => void;
  speakText: SpeakText;
  stopSpeaking: () => void | Promise<void>;
  savePhrase: () => void;
  label: string;
  setLabel: StateSetter<string>;
  category: string;
  categories: string[];
  newCategoryName: string;
  setNewCategoryName: StateSetter<string>;
  newCategoryIcon: string;
  setNewCategoryIcon: StateSetter<string>;
  AVAILABLE_ICONS: string[];
  addCategory: () => void;
  customCategories: Category[];
  deleteCategory: (categoryName: string) => void;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: () => void;
  updateEmergencyContact: (
    contactId: string,
    field: keyof EmergencyContact | string,
    value: string
  ) => void;
  deleteEmergencyContact: (contactId: string) => void;
  selectedSmsContactId?: string;
  setSelectedSmsContactId?: StateSetter<string>;
  onSendSms?: () => void;
};

export default function ProfileSettingsPage(props: ProfileSettingsPageProps) {
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
    exportCurrentProfile,
    importCurrentProfile,
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
    regenerateCaregiverAlertLink,
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
  } = props;
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [configSection, setConfigSection] =
    React.useState<ConfigSectionId>("identite");
  const isCompactLayout =
    typeof window !== "undefined" && window.innerWidth <= 640;

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

  function getContactUsage(contact: EmergencyContact) {
    return contact?.usage || "contact";
  }

  function sanitizePhoneInput(value: string) {
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

  function formatPhoneForStorage(value: string) {
    const cleaned = sanitizePhoneInput(value);

    if (!cleaned) return "";
    if (cleaned.startsWith("+33")) return cleaned;
    if (cleaned.startsWith("33")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+33${cleaned.slice(1)}`;
    if (cleaned.startsWith("+")) return cleaned;
    return `+${cleaned}`;
  }

  function handleConfirmDeleteProfile() {
    deleteCurrentProfile();
    setShowDeleteConfirm(false);
  }

  function updateCustomThemeField(field: string, value: string) {
    updateCurrentProfileField("customTheme", {
      ...(currentProfile.customTheme || {}),
      [field]: value,
    });
  }

  const themeOptionStyle = (mode: string) =>
    currentProfile.themeMode === mode
      ? styles.primaryButton
      : styles.secondaryButton;
  const compactThemeOptionStyle = (mode: string): CSSProperties => ({
    ...themeOptionStyle(mode),
    minWidth: 0,
    minHeight: 56,
    padding: "9px 8px",
    borderRadius: 16,
    fontSize: 16,
    lineHeight: 1.1,
    whiteSpace: "normal",
  });

  if (page === "profil") {
    const compactViewportWidth = isCompactLayout
      ? "calc(100vw - 52px)"
      : "100%";
    const caregiverPanelWidth = "100%";
    const caregiverControlsWidth = "100%";
    const compactCard = createCompactCardStyle(styles.card, {
      marginBottom: 20,
      minWidth: 0,
      maxWidth: "100%",
      overflow: "hidden",
    });
    const caregiverCardStyle: CSSProperties = {
      ...compactCard,
      width: compactViewportWidth,
      maxWidth: compactViewportWidth,
      inlineSize: compactViewportWidth,
      maxInlineSize: compactViewportWidth,
      justifySelf: "start",
      boxSizing: "border-box",
      minWidth: 0,
      overflow: "hidden",
    };
    const configContentGrid: CSSProperties = {
      display: "grid",
      gridTemplateColumns: isCompactLayout
        ? "minmax(0, max-content)"
        : "repeat(auto-fit, minmax(min(390px, 100%), 1fr))",
      gap: 20,
      alignItems: "start",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
    };
    const activeConfigSection =
      CONFIG_SECTIONS.find((section) => section.id === configSection) ||
      CONFIG_SECTIONS[0];
    const configSectionMenuStyle: CSSProperties = {
      ...styles.card,
      padding: 12,
      marginBottom: 16,
      borderRadius: 18,
      boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
    };
    const configSectionSelectWrapStyle: CSSProperties = {
      position: "relative",
      marginTop: 8,
    };
    const configSectionSelectStyle: CSSProperties = {
      ...styles.input,
      minHeight: 50,
      marginTop: 0,
      padding: "10px 42px 10px 12px",
      borderRadius: 14,
      fontWeight: 800,
      appearance: "none",
      WebkitAppearance: "none",
    };
    const caregiverPanelStyle: CSSProperties = {
      display: "grid",
      gap: 12,
      padding: 12,
      justifyItems: "stretch",
      borderRadius: 18,
      border: `1px solid ${styles.input.borderColor || "rgba(148, 163, 184, 0.32)"}`,
      background: "rgba(15, 23, 42, 0.20)",
      boxSizing: "border-box",
      width: caregiverPanelWidth,
      maxWidth: caregiverPanelWidth,
      inlineSize: caregiverPanelWidth,
      maxInlineSize: caregiverPanelWidth,
      minWidth: 0,
      overflow: "hidden",
    };
    const caregiverHeaderStyle: CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      minWidth: 0,
      maxWidth: "100%",
      overflow: "hidden",
    };
    const caregiverFieldGroupStyle: CSSProperties = {
      ...styles.formGroup,
      marginBottom: 0,
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
      boxSizing: "border-box",
    };
    const caregiverToggleStyle: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 999,
      border: `1px solid ${styles.input.borderColor || "rgba(148, 163, 184, 0.32)"}`,
      background: styles.input.background || "rgba(15, 23, 42, 0.55)",
      fontSize: 13,
      fontWeight: 800,
      lineHeight: 1,
    };
    const caregiverLinkBoxStyle: CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      padding: "6px 6px 6px 10px",
      borderRadius: 14,
      border: styles.input.border,
      background: styles.input.background,
      color: styles.input.color,
      boxSizing: "border-box",
      width: caregiverControlsWidth,
      maxWidth: caregiverControlsWidth,
      inlineSize: caregiverControlsWidth,
      maxInlineSize: caregiverControlsWidth,
      minWidth: 0,
      overflow: "hidden",
    };
    const caregiverLinkTextStyle: CSSProperties = {
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      display: "block",
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.2,
    };
    const caregiverActionGridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      alignItems: "stretch",
      minWidth: 0,
      width: caregiverControlsWidth,
      maxWidth: caregiverControlsWidth,
      inlineSize: caregiverControlsWidth,
      maxInlineSize: caregiverControlsWidth,
      overflow: "hidden",
      boxSizing: "border-box",
    };
    const compactCaregiverButtonStyle: CSSProperties = {
      ...styles.secondaryButton,
      width: "100%",
      minHeight: 40,
      padding: "8px 10px",
      borderRadius: 14,
      fontSize: 14,
      lineHeight: 1.1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      textDecoration: "none",
      boxSizing: "border-box",
      minWidth: 0,
      maxWidth: "100%",
      overflow: "hidden",
      whiteSpace: "normal",
    };
    const caregiverIconButtonStyle: CSSProperties = {
      ...compactCaregiverButtonStyle,
      minHeight: 40,
      padding: "8px 8px",
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 800,
      lineHeight: 1.1,
      whiteSpace: "nowrap",
    };
    const caregiverDeleteButtonStyle: CSSProperties = {
      ...caregiverIconButtonStyle,
      ...styles.deleteButton,
      width: "100%",
      height: "auto",
      minHeight: 40,
      minWidth: 0,
      padding: "8px 8px",
      borderRadius: 12,
      fontSize: 14,
      lineHeight: 1.1,
    };
    const caregiverModeButtonStyle: CSSProperties = {
      ...compactCaregiverButtonStyle,
      minHeight: 40,
      padding: "8px 8px",
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 800,
      whiteSpace: "nowrap",
    };
    const primaryCaregiverButtonStyle: CSSProperties = {
      ...styles.primaryButton,
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      minHeight: 44,
      padding: "10px 12px",
      borderRadius: 16,
      fontSize: 16,
      lineHeight: 1.1,
      boxSizing: "border-box",
    };
    const securityPrimaryButtonStyle: CSSProperties = {
      ...styles.primaryButton,
      width: "100%",
      minHeight: 48,
      padding: "10px 12px",
      borderRadius: 16,
      fontSize: 18,
      lineHeight: 1.1,
      boxSizing: "border-box",
    };
    const securityActionGridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 10,
      alignItems: "stretch",
      width: "100%",
      minWidth: 0,
    };
    const securityActionButtonStyle: CSSProperties = {
      ...styles.secondaryButton,
      width: "100%",
      minHeight: 46,
      padding: "10px 12px",
      borderRadius: 16,
      fontSize: 16,
      lineHeight: 1.1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      boxSizing: "border-box",
    };
    const profileActionGridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: isCompactLayout ? 8 : 10,
      alignItems: "stretch",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
    };
    const profileActionButtonStyle: CSSProperties = {
      ...styles.secondaryButton,
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      minHeight: 56,
      padding: isCompactLayout ? "10px 8px" : "10px 10px",
      borderRadius: 18,
      fontSize: isCompactLayout ? 15 : 16,
      fontWeight: 800,
      lineHeight: 1.1,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
    const profilePrimaryActionButtonStyle: CSSProperties = {
      ...profileActionButtonStyle,
      ...styles.primaryButton,
      borderRadius: 18,
      padding: "10px 10px",
    };
    const profileDeleteActionButtonStyle: CSSProperties = {
      ...profileActionButtonStyle,
      ...styles.deleteButton,
      minHeight: 56,
      padding: "10px 10px",
      borderRadius: 18,
      fontSize: 15,
      border: styles.deleteButton.border,
    };

    if (privacyStatus?.passwordProtected && privacyStatus?.locked) {
      return (
        <div style={styles.gridSingle}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Données médicales verrouillées</h2>

            <div style={{ ...styles.infoBox, marginBottom: 14, lineHeight: 1.55 }}>
              Les informations médicales et d'identité de ce profil sont protégées
              par un mot de passe local. Le mot de passe n'est pas stocké.
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
        <div style={configSectionMenuStyle}>
          <label style={styles.label} htmlFor="profile-config-section">
            Rubrique du profil
          </label>
          <div style={configSectionSelectWrapStyle}>
            <select
              id="profile-config-section"
              value={activeConfigSection.id}
              onChange={(event) =>
                setConfigSection(event.target.value as ConfigSectionId)
              }
              style={configSectionSelectStyle}
              aria-label="Choisir une rubrique du profil"
            >
              {CONFIG_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: 16,
                fontWeight: 900,
                opacity: 0.72,
              }}
            >
              ▾
            </span>
          </div>
        </div>

        <div
          style={{
            ...configContentGrid,
          }}
        >
        {configSection === "identite" ? (
          <>
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
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "dark")}
                style={compactThemeOptionStyle("dark")}
              >
                🌙 Sombre
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "light")}
                style={compactThemeOptionStyle("light")}
              >
                ☀️ Clair
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCurrentProfileField("themeMode", "colorful")
                }
                style={compactThemeOptionStyle("colorful")}
              >
                🎨 Coloré
              </button>

              <button
                type="button"
                onClick={() => updateCurrentProfileField("themeMode", "custom")}
                style={compactThemeOptionStyle("custom")}
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

        </>
        ) : null}

        {configSection === "sante" ? (
          <>
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

        </>
        ) : null}

        {configSection === "contacts" ? (
          <>
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

        </>
        ) : null}

        {configSection === "phrases" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Phrases rapides</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Texte de la phrase</label>
            <textarea
              value={text}
              onChange={(e) => setText(formatTextSmart(e.target.value))}
              style={styles.smallTextarea}
              placeholder="Ex : J'ai besoin d'eau"
            />
          </div>

          <div style={styles.formRow}>
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
          </div>

          <button
            style={styles.primaryButton}
            onClick={savePhrase}
            disabled={!String(text || "").trim()}
          >
            Enregistrer la phrase
          </button>
        </div>

        <div style={compactCard}>
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

        </>
        ) : null}

        {configSection === "securite" ? (
          <>
        <div style={compactCard}>
          <h2 style={styles.sectionTitle}>Données administratives sensibles</h2>

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
        </div>

        <div style={caregiverCardStyle}>
          <h2 style={styles.sectionTitle}>Téléphone aidant</h2>

          <div style={{ ...styles.infoBox, marginBottom: 14, lineHeight: 1.55 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              À quoi ça sert ?
            </strong>
            Ça sert à choisir quel téléphone aidant reçoit l'alerte quand la
            personne appuie sur la cloche orange. Crée un lien pour chaque
            aidant, ouvre ce lien sur son téléphone, puis coche les aidants
            disponibles dans <strong>Appel aidant</strong>. Ensuite, choisis
            ici l'aidant à prévenir.
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

          <div
            style={{
              display: "grid",
              gap: 12,
              minWidth: 0,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {caregiverAlertLinks.map((link, index) => (
              <div
                key={link.id}
                style={caregiverPanelStyle}
              >
                <div style={caregiverHeaderStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...styles.label, margin: 0 }}>
                      Aidant {index + 1}
                    </div>
                    <div style={{ ...styles.text, fontSize: 13, opacity: 0.72 }}>
                      {link.name || `Aidant ${index + 1}`}
                    </div>
                  </div>

                  <label
                    style={caregiverToggleStyle}
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
                    Disponible
                  </label>
                </div>

                <div style={caregiverFieldGroupStyle}>
                  <label style={styles.label}>Nom de l'aidant</label>
                  <input
                    value={link.name || ""}
                    onChange={(e) =>
                      updateCaregiverAlertLink?.(link.id, {
                        name: e.target.value,
                      })
                    }
                    style={{
                      ...styles.input,
                      width: caregiverControlsWidth,
                      maxWidth: caregiverControlsWidth,
                      inlineSize: caregiverControlsWidth,
                      maxInlineSize: caregiverControlsWidth,
                      minWidth: 0,
                    }}
                    placeholder={`Aidant ${index + 1}`}
                  />
                </div>

                <div style={caregiverFieldGroupStyle}>
                  <label style={styles.label}>Lien d'alarme</label>
                  <div style={caregiverLinkBoxStyle}>
                    <span
                      title={link.alertLink || ""}
                      style={{
                        ...caregiverLinkTextStyle,
                        opacity: link.alertLink ? 1 : 0.62,
                      }}
                    >
                      {link.alertLink || "Lien indisponible"}
                    </span>
                  </div>
                </div>

                <div style={caregiverActionGridStyle}>
                  <button
                    type="button"
                    aria-label="Copier le lien"
                    title="Copier le lien"
                    style={{ ...caregiverIconButtonStyle, gridColumn: 1 }}
                    onClick={() => copyCaregiverAlertLink?.(link.id)}
                  >
                    Copier
                  </button>

                  <button
                    type="button"
                    aria-label="Regénérer le lien"
                    title="Regénérer le lien"
                    style={{ ...caregiverIconButtonStyle, gridColumn: 2 }}
                    onClick={() => regenerateCaregiverAlertLink?.(link.id)}
                  >
                    Regénérer
                  </button>

                  {link.appLink ? (
                    <a
                      href={link.appLink}
                      aria-label="Ouvrir l'application aidant"
                      title="Ouvrir l'application aidant"
                      style={{
                        ...caregiverModeButtonStyle,
                        gridColumn: "1 / -1",
                      }}
                    >
                      App aidant
                    </a>
                  ) : null}

                  <button
                    type="button"
                    aria-label="Supprimer l'aidant"
                    title="Supprimer l'aidant"
                    style={{
                      ...caregiverDeleteButtonStyle,
                      gridColumn: "1 / -1",
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(74px, 0.34fr)",
              gap: 10,
              marginTop: 14,
              alignItems: "stretch",
              width: caregiverPanelWidth,
              maxWidth: caregiverPanelWidth,
              inlineSize: caregiverPanelWidth,
              maxInlineSize: caregiverPanelWidth,
              minWidth: 0,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              style={primaryCaregiverButtonStyle}
              onClick={addCaregiverAlertLink}
            >
              Ajouter un aidant
            </button>

            <button
              type="button"
              style={{
                ...compactCaregiverButtonStyle,
                minHeight: 44,
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 800,
              }}
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

          <div style={profileActionGridStyle}>
            <button
              type="button"
              aria-label="Ajouter"
              title="Ajouter"
              style={profilePrimaryActionButtonStyle}
              onClick={createNewProfile}
            >
              Ajouter
            </button>

            <button
              type="button"
              aria-label="Dupliquer"
              title="Dupliquer"
              style={profileActionButtonStyle}
              onClick={duplicateCurrentProfile}
            >
              Dupliquer
            </button>

            <button
              type="button"
              aria-label="Supprimer"
              title="Supprimer"
              style={profileDeleteActionButtonStyle}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Supprimer
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
                ? "Les données médicales et d'identité sont chiffrées dans le stockage local de cet appareil."
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
                  style={securityPrimaryButtonStyle}
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
                  style={securityPrimaryButtonStyle}
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
                  style={securityActionButtonStyle}
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

            <div style={securityActionGridStyle}>
              <button
                type="button"
                style={securityActionButtonStyle}
                onClick={exportCurrentProfile}
              >
                Exporter ce profil
              </button>

              <label style={{ ...securityActionButtonStyle, cursor: "pointer" }}>
                Importer un profil
                <input
                  type="file"
                  accept="application/json"
                  onChange={importCurrentProfile}
                  style={{ display: "none" }}
                />
              </label>

              <button
                type="button"
                style={securityActionButtonStyle}
                onClick={exportAllProfiles}
              >
                Exporter tous les profils
              </button>

              <label style={{ ...securityActionButtonStyle, cursor: "pointer" }}>
                Importer tous les profils
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

        </>
        ) : null}

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
                Supprimer
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
      <TalkPage
        styles={styles}
        currentProfile={currentProfile}
        currentProfileId={currentProfileId}
        text={text}
        setText={setText}
        isListening={isListening}
        stopDictation={stopDictation}
        startDictation={startDictation}
        speakText={speakText}
        stopSpeaking={stopSpeaking}
        emergencyContacts={emergencyContacts}
      />
    );
  }
  return null;
}
