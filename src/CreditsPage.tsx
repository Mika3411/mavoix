import React, { useMemo, useState } from "react";
import { API_BASE } from "./services/config";

export default function CreditsPage(props: any) {
  const {
    styles,
    aiUsage,
    aiStatusLoading,
    onBackToEditor,
    creditsPurchaseLoading,
    creditsMessage,
    onPurchase,
  } = props;
  const donorWall = aiUsage?.donorWall || [];

  const isAdminRoute =
    typeof window !== "undefined" &&
    (window.location.hash === "#admin" || window.location.pathname === "/admin");

  const [showAdmin, setShowAdmin] = useState(isAdminRoute);
  const [adminToken, setAdminToken] = useState("");
  const [donorName, setDonorName] = useState("");
  const [amountEuro, setAmountEuro] = useState("");
  const [note, setNote] = useState("");
  const [manualCredits, setManualCredits] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const estimatedAddedCredits = useMemo(() => {
    const amount = Number(amountEuro);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.round(amount * 1000);
  }, [amountEuro]);

  async function addDonation() {
    try {
      setAdminLoading(true);
      setAdminMessage("");

      const response = await fetch(`${API_BASE}/api/admin/add-donation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          donorName,
          amountEuro,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'ajouter le don.");
      }

      setAdminMessage("Don ajouté. Recharge la page pour voir le compteur mis à jour.");
      setDonorName("");
      setAmountEuro("");
      setNote("");
    } catch (error) {
      setAdminMessage(error.message || "Impossible d'ajouter le don.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function addManualCredits() {
    try {
      setAdminLoading(true);
      setAdminMessage("");

      const response = await fetch(`${API_BASE}/api/admin/add-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          creditsToAdd: manualCredits,
          label: manualLabel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'ajouter les crédits.");
      }

      setAdminMessage("Crédits ajoutés. Recharge la page pour voir le compteur mis à jour.");
      setManualCredits("");
      setManualLabel("");
    } catch (error) {
      setAdminMessage(error.message || "Impossible d'ajouter les crédits.");
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={styles.sectionTitle}>Crédits solidaires</h2>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.78)",
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: 900,
              }}
            >
              J&apos;ai la SLA et j&apos;ai créé cette application pour toutes les
              personnes qui ont perdu la voix, comme moi.
            </p>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onBackToEditor}
          >
            Retour à l&apos;éditeur
          </button>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: 18,
            borderRadius: 22,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          <p style={{ marginTop: 0 }}>
            L&apos;IA fonctionne avec une réserve commune de crédits pour que tout
            le monde puisse en profiter.
          </p>
          <p>
            <strong>1€ = 1000 crédits</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Chaque fois qu&apos;une personne appuie sur <strong>Générer par IA</strong>,
            <strong> 1 crédit</strong> est utilisé dans cette réserve commune.
            Les dons permettent d&apos;augmenter les crédits disponibles pour tous.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.82, marginBottom: 6 }}>
              Crédits encore disponibles
            </div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>
              {aiStatusLoading
                ? "..."
                : Number(
                    aiUsage?.globalCreditsRemaining ?? aiUsage?.creditsRemaining ?? 0
                  ).toLocaleString("fr-FR")}
            </div>
          </div>

          <div
            style={{
              borderRadius: 20,
              padding: 18,
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.24)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.82, marginBottom: 6 }}>
              Valeur d&apos;un don
            </div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>1€</div>
            <div style={{ fontSize: 18, opacity: 0.88 }}>= 1000 crédits</div>
          </div>

          <div
            style={{
              borderRadius: 20,
              padding: 18,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.82, marginBottom: 6 }}>
              Utilisation
            </div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              1 génération IA = 1 crédit
            </div>
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: 18,
            borderRadius: 22,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 10,
            }}
          >
            Merci pour vos dons
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {donorWall.length > 0 ? (
              donorWall.map((donor) => (
                <div
                  key={donor.id || donor.message}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "rgba(59,130,246,0.10)",
                    border: "1px solid rgba(59,130,246,0.18)",
                    fontSize: 16,
                    lineHeight: 1.6,
                  }}
                >
                  {donor.message}
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Aucun don affiché pour le moment.
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 18,
            borderRadius: 22,
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.22)",
            marginBottom: showAdmin ? 18 : 0,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Soutenez-nous
          </div>

          <p
            style={{
              margin: "0 0 14px",
              fontSize: 16,
              lineHeight: 1.7,
              opacity: 0.92,
            }}
          >
            Si vous souhaitez aider ce projet à continuer, vous pouvez faire un
            don. Chaque soutien aide toutes les personnes qui utilisent
            l&apos;application.
          </p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() =>
              window.open(
                "https://paypal.me/anime1120",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            ❤️ Soutenez-nous
          </button>
        </div>

        {showAdmin ? (
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Zone admin privée
              </div>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setShowAdmin(false)}
              >
                Fermer
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Code admin</label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                style={styles.input}
                placeholder="Entre ton code secret"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.16)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
                  Ajouter un don
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom du donateur</label>
                  <input
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    style={styles.input}
                    placeholder="Ex : Sophie"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Montant en €</label>
                  <input
                    value={amountEuro}
                    onChange={(e) => setAmountEuro(e.target.value)}
                    style={styles.input}
                    placeholder="Ex : 5"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Message affiché</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={styles.smallTextarea}
                    placeholder="Ex : Merci à Sophie pour son don de 5€"
                  />
                </div>

                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 15,
                    opacity: 0.82,
                  }}
                >
                  Cela ajoutera environ <strong>{estimatedAddedCredits.toLocaleString("fr-FR")} crédits</strong>.
                </div>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={addDonation}
                  disabled={adminLoading}
                >
                  {adminLoading ? "Ajout..." : "Ajouter le don"}
                </button>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.16)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
                  Ajouter des crédits manuellement
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Crédits à ajouter</label>
                  <input
                    value={manualCredits}
                    onChange={(e) => setManualCredits(e.target.value)}
                    style={styles.input}
                    placeholder="Ex : 5000"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Message optionnel</label>
                  <textarea
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    style={styles.smallTextarea}
                    placeholder="Ex : Recharge manuelle du compteur"
                  />
                </div>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={addManualCredits}
                  disabled={adminLoading}
                >
                  {adminLoading ? "Ajout..." : "Ajouter les crédits"}
                </button>
              </div>
            </div>

            {adminMessage ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 16,
                  background:
                    adminMessage.toLowerCase().includes("impossible") ||
                    adminMessage.toLowerCase().includes("refusé") ||
                    adminMessage.toLowerCase().includes("désactivé")
                      ? "rgba(239,68,68,0.16)"
                      : "rgba(34,197,94,0.16)",
                  border:
                    adminMessage.toLowerCase().includes("impossible") ||
                    adminMessage.toLowerCase().includes("refusé") ||
                    adminMessage.toLowerCase().includes("désactivé")
                      ? "1px solid rgba(239,68,68,0.35)"
                      : "1px solid rgba(34,197,94,0.28)",
                }}
              >
                {adminMessage}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
