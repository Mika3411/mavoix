import React from "react";

export default function CreditsPage({
  styles,
  aiUsage,
  aiStatusLoading,
  onBackToEditor,
}) {
  const donorWall = aiUsage?.donorWall || [];
  const creditsRemaining =
    aiUsage?.globalCreditsRemaining ?? aiUsage?.creditsRemaining ?? 0;

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
              {aiStatusLoading ? "..." : Number(creditsRemaining).toLocaleString("fr-FR")}
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

          <div style={{ display: "grid", gap: 10 }}>
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
      </div>
    </div>
  );
}
