import React from "react";
import type {
  Category,
  Phrase,
  SpeakText,
  StateSetter,
  StyleMap,
} from "../../shared/types";

function isIconOnlyPhraseText(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return false;

  const normalizedText = text.replace(/[\uFE0E\uFE0F]/g, "");
  return (
    !/[\p{L}\p{N}]/u.test(normalizedText) &&
    Array.from(normalizedText).length <= 5
  );
}

function MicrophoneIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <rect
        x="8.75"
        y="3.5"
        width="6.5"
        height="10"
        rx="3.25"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 11.5v.7a6.5 6.5 0 0 0 13 0v-.7M12 18.7V21M8.8 21h6.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CommunicationPageProps = {
  styles: StyleMap;
  categoryOptions: Category[];
  filter: string;
  setFilter: StateSetter<string>;
  filteredPhrases: Phrase[];
  getCategoryBackground: (categoryName: string) => string;
  speakText: SpeakText;
  movePhrase: (id: string, direction: "up" | "down") => void;
  updatePhrase: (id: string, field: keyof Phrase, value: unknown) => void;
  deletePhrase: (id: string) => void;
  isEditMode: boolean;
  setIsEditMode: StateSetter<boolean>;
};

export default function CommunicationPage(props: CommunicationPageProps) {
  const {
    styles,
    categoryOptions,
    filter,
    setFilter,
    filteredPhrases,
    getCategoryBackground,
    speakText,
    movePhrase,
    updatePhrase,
    deletePhrase,
    isEditMode,
    setIsEditMode,
  } = props;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1024;
  const categoryGridColumns =
    viewportWidth <= 560
      ? "repeat(2, minmax(0, 1fr))"
      : viewportWidth <= 920
        ? "repeat(3, minmax(0, 1fr))"
        : "repeat(4, minmax(0, 1fr))";
  const isMobilePhraseLayout = viewportWidth <= 640;

  const editToggleStyle = isEditMode
    ? styles.primaryButton
    : styles.secondaryButton;
  const quickPhraseActionIconStyle = {
    ...styles.smallActionButton,
    width: "100%",
    minWidth: 0,
    height: 36,
    padding: 0,
    borderRadius: 12,
    fontSize: 18,
    lineHeight: 1,
  };
  const quickPhraseFavoriteStyle = {
    ...styles.favoriteButton,
    width: "100%",
    minWidth: 0,
    height: 36,
    borderRadius: 12,
    fontSize: 18,
    background: "rgba(250, 204, 21, 0.12)",
  };
  const quickPhraseDeleteStyle = {
    ...styles.deleteButton,
    width: "100%",
    minWidth: 0,
    height: 36,
    padding: 0,
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#19c2ff",
                background: "rgba(25, 194, 255, 0.12)",
                border: "1px solid rgba(25, 194, 255, 0.26)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              <MicrophoneIcon size={22} />
            </span>
            <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
              Communication rapide
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            aria-pressed={isEditMode}
            style={{
              ...editToggleStyle,
              minHeight: 44,
              padding: "8px 16px",
              fontSize: 15,
              borderRadius: 12,
            }}
          >
            {isEditMode ? "Terminer" : "Modifier"}
          </button>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: 8,
            borderRadius: 8,
            background: styles.surfaceAlt?.background || "rgba(255,255,255,0.055)",
            border: styles.input?.border || "1px solid rgba(132,157,184,0.28)",
          }}
        >
          <p style={styles.filterTitle}>Catégories</p>

          <div
            style={{
              ...styles.categoryGrid,
              gridTemplateColumns: categoryGridColumns,
            }}
          >
            {categoryOptions.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setFilter(cat.name)}
                style={
                  filter === cat.name
                    ? {
                        ...styles.categoryCard,
                        ...styles.categoryCardActive,
                      }
                    : styles.categoryCard
                }
              >
                <div style={styles.categoryEmoji}>{cat.icon}</div>
                <span style={styles.categoryLabel}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredPhrases.length === 0 ? (
          <p style={styles.emptyText}>Aucune phrase enregistrée.</p>
        ) : (
          <div
            style={{
              ...styles.quickPhraseGrid,
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(180px, 46vw), 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            {filteredPhrases.map((item) => {
              const phraseText = item.text;
              const isIconOnlyPhrase = isIconOnlyPhraseText(phraseText);

              const actionRow = (
                <div
                  style={{
                    ...styles.quickPhraseActions,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 6,
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => movePhrase(item.id, "up")}
                    style={quickPhraseActionIconStyle}
                    title="Monter"
                    aria-label={`Monter ${item.label || item.text}`}
                  >
                    ↑
                  </button>

                  <button
                    onClick={() => movePhrase(item.id, "down")}
                    style={quickPhraseActionIconStyle}
                    title="Descendre"
                    aria-label={`Descendre ${item.label || item.text}`}
                  >
                    ↓
                  </button>

                  <button
                    onClick={() =>
                      updatePhrase(item.id, "favorite", !item.favorite)
                    }
                    style={{
                      ...quickPhraseFavoriteStyle,
                      background: item.favorite
                        ? "rgba(250, 204, 21, 0.22)"
                        : "rgba(250, 204, 21, 0.10)",
                      borderColor: item.favorite ? "#facc15" : undefined,
                    }}
                    title={
                      item.favorite
                        ? "Retirer des favoris"
                        : "Ajouter aux favoris"
                    }
                    aria-label={
                      item.favorite
                        ? `Retirer ${item.label || item.text} des favoris`
                        : `Ajouter ${item.label || item.text} aux favoris`
                    }
                  >
                    {item.favorite ? "★" : "☆"}
                  </button>

                  <button
                    onClick={() => deletePhrase(item.id)}
                    style={quickPhraseDeleteStyle}
                    title="Supprimer"
                    aria-label={`Supprimer ${item.label || item.text}`}
                  >
                    ×
                  </button>
                </div>
              );

              return (
                <div
                  key={item.id}
                  style={{
                    ...styles.quickPhraseCard,
                    padding: 10,
                    gap: 8,
                    borderRadius: 8,
                  }}
                >
                  {isEditMode && isMobilePhraseLayout ? actionRow : null}

                  <button
                    style={{
                      ...styles.quickPhraseButton,
                      background: getCategoryBackground(item.category),
                      minHeight: isEditMode && isMobilePhraseLayout ? 72 : 82,
                      fontSize: isIconOnlyPhrase ? 34 : 18,
                      lineHeight: isIconOnlyPhrase ? 1 : 1.15,
                      padding: isIconOnlyPhrase ? "10px" : "14px 16px",
                      borderRadius: 10,
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isIconOnlyPhrase ? "center" : "flex-start",
                      gap: 14,
                      textAlign: isIconOnlyPhrase ? "center" : "left",
                    }}
                    onClick={() =>
                      speakText(item.text, item.assignedVoice, item.id)
                    }
                  >
                    {!isIconOnlyPhrase ? (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.16)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                          flexShrink: 0,
                        }}
                      >
                        <MicrophoneIcon size={24} />
                      </span>
                    ) : null}
                    <span style={{ overflowWrap: "anywhere" }}>{phraseText}</span>
                  </button>

                  {isEditMode && !isMobilePhraseLayout ? actionRow : null}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
