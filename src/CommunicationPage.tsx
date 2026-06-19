import React from "react";

export default function CommunicationPage(props: any) {
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
            marginBottom: 12,
          }}
        >
          <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
            Communication rapide
          </h2>

          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            aria-pressed={isEditMode}
            style={{
              ...editToggleStyle,
              minHeight: 44,
              padding: "8px 16px",
              fontSize: 15,
            }}
          >
            {isEditMode ? "Terminer" : "Modifier"}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={styles.filterTitle}>Catégories</p>

          <div style={styles.categoryGrid}>
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
                "repeat(auto-fit, minmax(min(150px, 42vw), 1fr))",
              gap: 10,
              alignItems: "start",
            }}
          >
            {filteredPhrases.map((item) => (
              <div
                key={item.id}
                style={{
                  ...styles.quickPhraseCard,
                  padding: 10,
                  gap: 8,
                  borderRadius: 14,
                }}
              >
                <button
                  style={{
                    ...styles.quickPhraseButton,
                    background: getCategoryBackground(item.category),
                    minHeight: 72,
                    fontSize: 16,
                    padding: "12px 14px",
                    borderRadius: 14,
                    width: "100%",
                  }}
                  onClick={() =>
                    speakText(item.text, item.assignedVoice, item.id)
                  }
                >
                  {item.text}
                </button>

                {isEditMode && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
