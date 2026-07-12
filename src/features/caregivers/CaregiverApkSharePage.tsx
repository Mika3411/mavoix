import React from "react";
import { API_BASE } from "../../services/config";
import {
  normalizePhoneForSms,
  normalizeWhatsAppPhone,
} from "../../shared/phone";
import type {
  CaregiverAlertTarget,
  EmergencyContact,
  Profile,
  StyleMap,
} from "../../shared/types";

const AIDANT_APK_PATH = "/ma-voix-aidant.apk";

type CaregiverApkSharePageProps = {
  styles: StyleMap;
  activeTheme: Record<string, string>;
  currentProfile: Profile;
  emergencyContacts: EmergencyContact[];
  caregiverAlertLinks: CaregiverAlertTarget[];
  selectedCaregiverAlertLinkId: string;
  addCaregiverAlertLink?: (options?: {
    name?: string;
    select?: boolean;
  }) => string | void;
  showToast?: (message: string) => void;
};

function resolvePublicUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    if (
      typeof window !== "undefined" &&
      /^https?:\/\//.test(window.location.origin)
    ) {
      return new URL(normalizedPath, window.location.origin).href;
    }

    return new URL(normalizedPath, API_BASE).href;
  } catch {
    return `${API_BASE}${normalizedPath}`;
  }
}

function getProfileDisplayName(profile: Profile) {
  return (
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    profile?.name ||
    "la personne Ma Voix"
  );
}

function buildCaregiverAlertWebLink(target: CaregiverAlertTarget | null) {
  if (!target?.channel) return "";
  if (target.alertLink) return target.alertLink;

  const url = new URL("/aidant-alerte", API_BASE);
  url.searchParams.set("channel", target.channel);
  if (target.accessKey) {
    url.searchParams.set("key", target.accessKey);
  }
  return url.href;
}

function buildCaregiverAlertAppLink(target: CaregiverAlertTarget | null) {
  if (!target?.channel) return "";

  const url = new URL("mavoix-aidant://open");
  url.searchParams.set("apiBase", API_BASE);
  url.searchParams.set("channel", target.channel);
  if (target.accessKey) {
    url.searchParams.set("key", target.accessKey);
  }
  return url.href;
}

function buildAidantShareMessage({
  profileName,
  apkUrl,
  caregiverLink,
}: {
  profileName: string;
  apkUrl: string;
  caregiverLink: string;
}) {
  const connectionLink = caregiverLink
    ? `Lien de connexion à copier dans Ma Voix Aidant > Configurer :\n${caregiverLink}`
    : "Lien de connexion Ma Voix :\nDemande-moi ensuite le lien aidant à copier dans Ma Voix Aidant > Configurer.";

  return `Bonjour,

Voici l'application Ma Voix Aidant pour recevoir les appels et les messages de ${profileName}.

Lien APK Ma Voix Aidant :
${apkUrl}

${connectionLink}

1. Sur le téléphone Android de l'aidant, ouvre le lien APK ci-dessus.
2. Télécharge puis installe le fichier APK.
3. Si Android demande une autorisation, accepte l'installation depuis le navigateur, SMS ou WhatsApp.
4. Ne touche pas au lien de connexion dans SMS ou WhatsApp : fais un appui long dessus et copie-le.
5. Ouvre l'application Ma Voix Aidant, va dans Configurer, colle ce lien, puis appuie sur Ajouter ce lien patient.
6. Autorise les notifications, l'alarme et la batterie si Android le demande.

Après ça, ${profileName} pourra appeler l'aidant avec la cloche de Ma Voix.`;
}

function contactLabel(contact: EmergencyContact, index: number) {
  const name = contact.name?.trim();
  const phone = contact.phone?.trim();
  if (name && phone) return `${name} - ${phone}`;
  return name || phone || `Contact ${index + 1}`;
}

export default function CaregiverApkSharePage({
  styles,
  activeTheme,
  currentProfile,
  emergencyContacts,
  caregiverAlertLinks,
  selectedCaregiverAlertLinkId,
  addCaregiverAlertLink,
  showToast,
}: CaregiverApkSharePageProps) {
  const apkUrl = React.useMemo(() => resolvePublicUrl(AIDANT_APK_PATH), []);
  const availableContacts = React.useMemo(
    () =>
      (emergencyContacts || []).filter((contact) =>
        String(contact?.phone || "").trim()
      ),
    [emergencyContacts]
  );
  const availableCaregivers = React.useMemo(
    () =>
      (caregiverAlertLinks || []).filter((link) =>
        String(link?.channel || "").trim()
      ),
    [caregiverAlertLinks]
  );
  const caregiverIds = React.useMemo(
    () => availableCaregivers.map((link) => link.id).join("|"),
    [availableCaregivers]
  );

  const [selectedContactId, setSelectedContactId] = React.useState("");
  const [selectedCaregiverId, setSelectedCaregiverId] = React.useState(
    selectedCaregiverAlertLinkId || ""
  );
  const [newCaregiverName, setNewCaregiverName] = React.useState("");

  React.useEffect(() => {
    if (!selectedContactId) return;

    const selectedExists = availableContacts.some(
      (contact) => contact.id === selectedContactId
    );
    if (!selectedExists) {
      setSelectedContactId("");
    }
  }, [availableContacts, selectedContactId]);

  React.useEffect(() => {
    const selectedExists = availableCaregivers.some(
      (link) => link.id === selectedCaregiverId
    );
    if (selectedExists) return;

    const preferredCaregiver =
      availableCaregivers.find(
        (link) => link.id === selectedCaregiverAlertLinkId
      ) || availableCaregivers[0];
    setSelectedCaregiverId(preferredCaregiver?.id || "");
  }, [
    availableCaregivers,
    caregiverIds,
    selectedCaregiverAlertLinkId,
    selectedCaregiverId,
  ]);

  const selectedContact =
    availableContacts.find((contact) => contact.id === selectedContactId) ||
    null;
  const selectedCaregiver =
    availableCaregivers.find((link) => link.id === selectedCaregiverId) ||
    null;
  const caregiverWebLink = buildCaregiverAlertWebLink(selectedCaregiver);
  const caregiverAppLink = buildCaregiverAlertAppLink(selectedCaregiver);
  const selectedCaregiverLink = caregiverWebLink || caregiverAppLink;
  const profileName = getProfileDisplayName(currentProfile);
  const shareMessage = buildAidantShareMessage({
    profileName,
    apkUrl,
    caregiverLink: selectedCaregiverLink,
  });

  function createAndSelectCaregiver() {
    if (!addCaregiverAlertLink) {
      showToast?.("Création d'aidant indisponible.");
      return;
    }

    const fallbackName = selectedContact?.name?.trim();
    const requestedName =
      newCaregiverName.trim() ||
      fallbackName ||
      `Aidant ${availableCaregivers.length + 1}`;
    const createdId = addCaregiverAlertLink({ name: requestedName });

    if (createdId) {
      setSelectedCaregiverId(createdId);
      setNewCaregiverName("");
      showToast?.(`Lien ${requestedName} ajouté au message.`);
      return;
    }

    showToast?.("Aidant créé. Sélectionne son lien dans la liste.");
  }

  function handleNewCaregiverKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    createAndSelectCaregiver();
  }

  function openSmsShare() {
    const phone = selectedContact?.phone
      ? normalizePhoneForSms(selectedContact.phone)
      : "";
    window.location.href = `sms:${phone}?body=${encodeURIComponent(
      shareMessage
    )}`;
    showToast?.("SMS préparé. Appuie sur Envoyer dans Messages.");
  }

  function openWhatsAppShare() {
    const phone = selectedContact?.phone
      ? normalizeWhatsAppPhone(selectedContact.phone)
      : "";
    const encodedMessage = encodeURIComponent(shareMessage);
    const appUrl = phone
      ? `whatsapp://send?phone=${phone}&text=${encodedMessage}`
      : `whatsapp://send?text=${encodedMessage}`;
    const webUrl = phone
      ? `https://wa.me/${phone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.location.href = appUrl;
    window.setTimeout(() => {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }, 1200);
    showToast?.("WhatsApp préparé. Appuie sur Envoyer dans WhatsApp.");
  }

  async function copyShareMessage() {
    try {
      await window.navigator.clipboard.writeText(shareMessage);
      showToast?.("Message d'installation copié.");
    } catch {
      window.prompt("Message d'installation aidant", shareMessage);
    }
  }

  async function copyApkLink() {
    try {
      await window.navigator.clipboard.writeText(apkUrl);
      showToast?.("Lien APK aidant copié.");
    } catch {
      window.prompt("Lien APK aidant", apkUrl);
    }
  }

  const mutedTextColor = activeTheme?.mutedText || "rgba(255,255,255,0.68)";
  const surfaceBackground =
    activeTheme?.surfaceAlt || "rgba(15, 23, 42, 0.72)";
  const stepCardStyle: React.CSSProperties = {
    padding: 14,
    borderRadius: 18,
    background: surfaceBackground,
    border: `1px solid ${activeTheme?.inputBorder || "rgba(255,255,255,0.1)"}`,
    lineHeight: 1.55,
  };
  const messagePreviewStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    border: `2px solid ${activeTheme?.inputBorder || "rgba(148,163,184,0.35)"}`,
    background: activeTheme?.inputBackground || "rgba(15,23,42,0.72)",
    color: activeTheme?.textColor || "inherit",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    lineHeight: 1.45,
    fontSize: 16,
  };
  const selectedLinkStyle: React.CSSProperties = {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${activeTheme?.inputBorder || "rgba(148,163,184,0.3)"}`,
    background: surfaceBackground,
    color: mutedTextColor,
    fontSize: 13,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  };
  const createCaregiverGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(104px, auto)",
    gap: 10,
    alignItems: "stretch",
    marginTop: 10,
  };
  const createCaregiverButtonStyle: React.CSSProperties = {
    ...styles.secondaryButton,
    minHeight: 44,
    whiteSpace: "normal",
  };

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Envoyer l'app aidant</h2>

        <div style={{ ...styles.infoBox, marginBottom: 16 }}>
          Depuis l'iPhone, Ma Voix prépare un SMS ou un message WhatsApp avec le
          lien direct de l'APK aidant et les étapes d'installation. L'aidant doit
          ouvrir le message sur son téléphone Android.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div style={styles.formGroup}>
            <label style={styles.label}>Destinataire</label>
            <select
              value={selectedContactId}
              onChange={(event) => setSelectedContactId(event.target.value)}
              style={styles.input}
            >
              <option value="">Choisir dans SMS ou WhatsApp</option>
              {availableContacts.map((contact, index) => (
                <option key={contact.id} value={contact.id}>
                  {contactLabel(contact, index)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Choisir l'aidant à connecter</label>
            <select
              value={selectedCaregiverId}
              onChange={(event) => setSelectedCaregiverId(event.target.value)}
              style={styles.input}
              disabled={availableCaregivers.length === 0}
            >
              {availableCaregivers.length === 0 ? (
                <option value="">Aucun lien aidant configuré</option>
              ) : (
                availableCaregivers.map((link, index) => (
                  <option key={link.id} value={link.id}>
                    {link.name || `Aidant ${index + 1}`}
                  </option>
                ))
              )}
            </select>

            <div style={selectedLinkStyle}>
              <strong
                style={{
                  display: "block",
                  color: activeTheme?.textColor || "inherit",
                  marginBottom: 4,
                }}
              >
                Liens ajoutés au message
              </strong>
              <div>
                <span style={{ fontWeight: 800 }}>APK : </span>
                {apkUrl}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontWeight: 800 }}>
                  Aidant, à copier dans Configurer :{" "}
                </span>
                {selectedCaregiverLink ||
                  "Crée ou choisis un aidant pour ajouter son lien."}
              </div>
            </div>

            <label style={{ ...styles.label, marginTop: 12 }}>
              Créer un nouvel aidant
            </label>
            <div style={createCaregiverGridStyle}>
              <input
                value={newCaregiverName}
                onChange={(event) => setNewCaregiverName(event.target.value)}
                onKeyDown={handleNewCaregiverKeyDown}
                style={styles.input}
                placeholder={
                  selectedContact?.name?.trim()
                    ? `Nom : ${selectedContact.name.trim()}`
                    : "Nom du nouvel aidant"
                }
              />
              <button
                type="button"
                style={createCaregiverButtonStyle}
                onClick={createAndSelectCaregiver}
                disabled={!addCaregiverAlertLink}
              >
                Créer
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 6,
            marginBottom: 16,
          }}
        >
          <button type="button" style={styles.primaryButton} onClick={openSmsShare}>
            Envoyer par SMS
          </button>
          <button
            type="button"
            style={{
              ...styles.primaryButton,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
            }}
            onClick={openWhatsAppShare}
          >
            Envoyer par WhatsApp
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={copyShareMessage}
          >
            Copier le message
          </button>
        </div>

        <div style={{ ...styles.formGroup, marginBottom: 16 }}>
          <label style={styles.label}>Message envoyé à l'aidant</label>
          <div style={messagePreviewStyle}>{shareMessage}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          <div style={stepCardStyle}>
            <strong style={{ display: "block", marginBottom: 8 }}>
              Côté expéditeur
            </strong>
            <div style={{ color: mutedTextColor }}>
              Choisis le contact si tu veux préremplir le numéro, puis appuie
              sur SMS ou WhatsApp. L'app ouvre la messagerie avec le texte prêt :
              il reste seulement à vérifier le destinataire et envoyer.
            </div>
          </div>

          <div style={stepCardStyle}>
            <strong style={{ display: "block", marginBottom: 8 }}>
              Côté aidant
            </strong>
            <div style={{ color: mutedTextColor }}>
              L'aidant ouvre seulement le lien APK pour installer l'application,
              puis copie le lien de connexion du message. Dans Ma Voix Aidant,
              il va dans Configurer, colle le lien et appuie sur Ajouter ce
              lien patient. Il doit garder les notifications et l'alarme
              autorisées pour recevoir les appels.
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.infoBox,
            marginTop: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 800 }}>Lien APK aidant</div>
          <div
            style={{
              overflowWrap: "anywhere",
              color: mutedTextColor,
              lineHeight: 1.45,
            }}
          >
            {apkUrl}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href={apkUrl}
              download
              style={{
                ...styles.secondaryButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Ouvrir le lien APK
            </a>
            <button type="button" style={styles.secondaryButton} onClick={copyApkLink}>
              Copier le lien APK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
