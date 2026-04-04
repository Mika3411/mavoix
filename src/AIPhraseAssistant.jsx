import React from "react";

export default function AIPhraseAssistant({
  styles,
  aiPremiumEnabled,
  setAiPremiumEnabled,
  aiMode,
  setAiMode,
  aiTone,
  setAiTone,
  aiSuggestions,
  aiIsLoading,
  aiError,
  onGenerate,
  onApply,
  onSpeak,
  onSave,
  currentText,
}) {
  const helperText = aiPremiumEnabled
    ? "L'IA reformule les mots-clés en phrases courtes, naturelles et faciles à dire."
    : "Active le mode premium pour afficher les suggestions intelligentes dans l'éditeur de phrase.";

  return (
    <div
      style={{
        ...styles.card,
        marginTop: 20,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: styles.sectionTitle.color,
            }}
          >
            ✨ Premium IA
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.78)",
              fontSize: 18,
              lineHeight: 1.45,
              maxWidth: 760,
            }}
          >
            {helperText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAiPremiumEnabled(!aiPremiumEnabled)}
          style={
            aiPremiumEnabled ? styles.primaryButton : styles.secondaryButton
          }
        >
          {aiPremiumEnabled ? "IA activée" : "Activer l'IA"}
        </button>
      </div>

      {aiPremiumEnabled ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div>
              <label style={styles.label}>Style de phrase</label>
              <select
                value={aiMode}
                onChange={(e) => setAiMode(e.target.value)}
                style={styles.input}
              >
                <option value="simple">Simple</option>
                <option value="polite">Poli</option>
                <option value="urgent">Urgence</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Ton préféré</label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                style={styles.input}
              >
                <option value="direct">Direct</option>
                <option value="gentle">Doux</option>
                <option value="medical">Soin / aide</option>
              </select>
            </div>
          </div>

          <div style={styles.buttonGrid}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={onGenerate}
              disabled={aiIsLoading || !currentText.trim()}
            >
              {aiIsLoading ? "Génération..." : "✨ Générer 3 phrases"}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onGenerate}
              disabled={aiIsLoading || !currentText.trim()}
            >
              🔄 Régénérer
            </button>
          </div>

          {aiError ? (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.16)",
                border: "1px solid rgba(239, 68, 68, 0.38)",
                color: "#fecaca",
                borderRadius: 18,
                padding: 14,
                marginBottom: 18,
                fontSize: 18,
              }}
            >
              {aiError}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={`${suggestion}-${index}`}
                style={{
                  borderRadius: 20,
                  padding: 18,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    lineHeight: 1.5,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  {suggestion}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={() => onApply(suggestion)}
                  >
                    Utiliser
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => onSpeak(suggestion)}
                  >
                    🔊 Écouter
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => onSave(suggestion)}
                  >
                    💾 Enregistrer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!aiSuggestions.length && !aiIsLoading ? (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 18,
                background: "rgba(59,130,246,0.10)",
                border: "1px solid rgba(59,130,246,0.24)",
                fontSize: 18,
                lineHeight: 1.5,
              }}
            >
              Exemple : <strong>"douleur jambe droite"</strong> → “J'ai mal à la
              jambe droite.”
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
