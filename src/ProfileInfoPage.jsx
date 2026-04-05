import React from "react";
import { createStyles, getActiveTheme } from "./themes";

export default function ProfileInfoPage(props) {
  const profile = props.profile || props.currentProfile;
  const onSpeak = props.onSpeak;

  if (!profile) return null;

  const theme = getActiveTheme(profile);
  const styles = createStyles(theme);

  const compactSectionTitle = {
    ...styles.sectionTitle,
    fontSize: 20,
    marginBottom: 12,
    lineHeight: 1.25,
  };

  const compactCard = {
    ...styles.card,
    display: "inline-block",
    width: "100%",
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    breakInside: "avoid",
    WebkitColumnBreakInside: "avoid",
    boxSizing: "border-box",
  };

  const quickButtonStyle = {
    ...styles.primaryButton,
    width: "100%",
    padding: "10px 14px",
    fontSize: 17,
    lineHeight: 1.3,
    minHeight: 50,
    borderRadius: 16,
  };

  const compactManagerBox = {
    ...styles.categoryManagerBox,
    padding: 10,
    borderRadius: 14,
  };

  const compactSecondaryButton = {
    ...styles.secondaryButton,
    padding: "10px 14px",
    fontSize: 17,
    lineHeight: 1.3,
    minHeight: 50,
    borderRadius: 16,
  };

  const photo = profile.profilePhoto || profile.photo;
  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.name ||
    "";
  const medicalInfo = profile.medicalInfo || {};
  const treatments = medicalInfo.treatments || [];
  const emergencyContacts = profile.emergencyContacts || [];
  const emergencySpeakContacts = emergencyContacts.filter(
    (c) => c && (c.usage === "urgence" || c.usage === "both")
  );
  const doctorInfo = profile.doctorInfo || {};

  return (
    <div
      style={{
        columnCount: window.innerWidth > 1240 ? 3 : window.innerWidth > 820 ? 2 : 1,
        columnGap: 14,
      }}
    >
      <div style={compactCard}>
        <h2 style={compactSectionTitle}>Aide rapide</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          <button
            style={quickButtonStyle}
            onClick={() =>
              onSpeak?.(
                `Je m'appelle ${fullName || "non renseigné"}, je suis né le ${
                  profile.birthDate || "non renseigné"
                }, j'habite à ${profile.address || "non renseigné"} et mon numéro de sécurité sociale est ${
                  profile.socialSecurityNumber || "non renseigné"
                }.`
              )
            }
          >
            🪪 Identité
          </button>

          <button
            style={quickButtonStyle}
            onClick={() =>
              onSpeak?.(
                treatments.length > 0
                  ? `Mes traitements en cours sont : ${treatments
                      .map((t) =>
                        [t.name, t.dosage, t.frequency].filter(Boolean).join(", ")
                      )
                      .join(" ; ")}.`
                  : "Je n'ai pas de traitement renseigné."
              )
            }
          >
            ❤️ Traitements
          </button>

          <button
            style={quickButtonStyle}
            onClick={() =>
              onSpeak?.(
                `Mes informations de santé sont : groupe sanguin ${
                  medicalInfo.bloodType || "non renseigné"
                }, allergies ${medicalInfo.allergies || "non renseigné"}, conditions médicales ${
                  medicalInfo.condition || "non renseigné"
                }, antécédents médicaux ${
                  medicalInfo.medicalHistory || "non renseigné"
                }.`
              )
            }
          >
            🩺 Santé
          </button>

          <button
            style={quickButtonStyle}
            onClick={() =>
              onSpeak?.(
                emergencySpeakContacts.length > 0
                  ? `Mes contacts d'urgence sont : ${emergencySpeakContacts
                      .map((c) =>
                        [c.name, c.relation, c.phone].filter(Boolean).join(", ")
                      )
                      .join(" ; ")}.`
                  : "Je n'ai pas de contact d'urgence renseigné."
              )
            }
          >
            🚨 Contact d'urgence
          </button>
        </div>
      </div>

      <div style={compactCard}>
        <h2 style={compactSectionTitle}>Identité</h2>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="profil"
              style={{
                width: 144,
                maxWidth: "100%",
                height: 144,
                borderRadius: 18,
                objectFit: "cover",
                border: `2px solid ${theme.inputBorder}`,
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: 144,
                height: 144,
                borderRadius: 18,
                background: theme.surfaceAlt,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${theme.inputBorder}`,
                fontSize: 40,
              }}
            >
              👤
            </div>
          )}

          <div
            style={{
              flex: 1,
              minWidth: 260,
            }}
          >
            <div style={styles.formGroup}>
              <label style={styles.label}>Numéro de sécurité sociale</label>
              <div style={styles.readOnlyBox}>
                {profile.socialSecurityNumber || "Non renseigné"}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Nom complet</label>
          <div style={styles.readOnlyBox}>{fullName || "Non renseigné"}</div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Date de naissance</label>
          <div style={styles.readOnlyBox}>
            {profile.birthDate || "Non renseignée"}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Adresse</label>
          <div style={styles.readOnlyBox}>
            {profile.address || "Non renseignée"}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Langue</label>
          <div style={styles.readOnlyBox}>
            {profile.language || "Non renseignée"}
          </div>
        </div>
      </div>

      <div style={compactCard}>
        <h2 style={compactSectionTitle}>Santé</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Groupe sanguin</label>
          <div style={styles.readOnlyBox}>
            {medicalInfo.bloodType || "Non renseigné"}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Allergies</label>
          <div style={styles.readOnlyBox}>
            {medicalInfo.allergies || "Aucune information"}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Conditions médicales</label>
          <div style={styles.readOnlyBox}>
            {medicalInfo.condition || "Aucune information"}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Antécédents médicaux</label>
          <div style={styles.readOnlyBox}>
            {medicalInfo.medicalHistory || "Aucune information"}
          </div>
        </div>
      </div>

      <div style={compactCard}>
        <h2 style={compactSectionTitle}>Traitements en cours</h2>

        {treatments.length > 0 ? (
          <div style={styles.customCategoryList}>
            {treatments.map((treatment) => (
              <div key={treatment.id} style={compactManagerBox}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <div style={styles.readOnlyBox}>
                    {treatment.name || "Non renseigné"}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Dosage</label>
                  <div style={styles.readOnlyBox}>
                    {treatment.dosage || "Non renseigné"}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fréquence</label>
                  <div style={styles.readOnlyBox}>
                    {treatment.frequency || "Non renseignée"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.readOnlyBox}>Aucun traitement renseigné</div>
        )}
      </div>

      <div style={compactCard}>
        <h2 style={compactSectionTitle}>Médecin traitant</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Nom</label>
          <div style={styles.readOnlyBox}>
            {doctorInfo.name || "Non renseigné"}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Téléphone</label>
          <div style={styles.readOnlyBox}>
            {doctorInfo.phone || "Non renseigné"}
          </div>
        </div>

        {doctorInfo.phone ? (
          <div style={{ marginTop: 12 }}>
            <a
              href={`tel:${doctorInfo.phone}`}
              style={{
                ...compactSecondaryButton,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              📞 Appeler le médecin
            </a>
          </div>
        ) : null}
      </div>

      <div style={compactCard}>
        <h2 style={compactSectionTitle}>Contacts d'urgence</h2>

        {emergencyContacts.length > 0 ? (
          <div style={styles.customCategoryList}>
            {emergencyContacts.map((contact, index) => (
              <div key={contact.id || index} style={compactManagerBox}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <div style={styles.readOnlyBox}>
                    {contact.name || "Non renseigné"}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Téléphone</label>
                  <div style={styles.readOnlyBox}>
                    {contact.phone || "Non renseigné"}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Lien / rôle</label>
                  <div style={styles.readOnlyBox}>
                    {contact.relation || "Non renseigné"}
                  </div>
                </div>

                {contact.phone ? (
                  <div style={{ marginTop: 12 }}>
                    <a
                      href={`tel:${contact.phone}`}
                      style={{
                        ...compactSecondaryButton,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      📞 Appeler
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.readOnlyBox}>
            Aucun contact d'urgence renseigné
          </div>
        )}
      </div>
    </div>
  );
}