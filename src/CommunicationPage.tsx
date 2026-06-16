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
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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

                <div
                  style={{
                    ...styles.quickPhraseActions,
                    gap: 6,
                    justifyContent: isEditMode ? "space-between" : "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  {isEditMode && (
                    <>
                      <button
                        onClick={() => movePhrase(item.id, "up")}
                        style={{
                          ...styles.smallActionButton,
                          minWidth: 44,
                          height: 44,
                          fontSize: 16,
                          padding: "4px 6px",
                        }}
                        title="Monter"
                        aria-label={`Monter ${item.label || item.text}`}
                      >
                        ⬆
                      </button>

                      <button
                        onClick={() => movePhrase(item.id, "down")}
                        style={{
                          ...styles.smallActionButton,
                          minWidth: 44,
                          height: 44,
                          fontSize: 16,
                          padding: "4px 6px",
                        }}
                        title="Descendre"
                        aria-label={`Descendre ${item.label || item.text}`}
                      >
                        ⬇
                      </button>
                    </>
                  )}

                  <button
                    onClick={() =>
                      updatePhrase(item.id, "favorite", !item.favorite)
                    }
                    style={{
                      ...styles.favoriteButton,
                      width: 44,
                      minWidth: 44,
                      height: 44,
                      fontSize: 18,
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
                    {item.favorite ? "⭐" : "☆"}
                  </button>

                  {isEditMode && (
                    <button
                      onClick={() => deletePhrase(item.id)}
                      style={{
                        ...styles.deleteButton,
                        minWidth: 92,
                        height: 44,
                        fontSize: 13,
                        padding: "4px 10px",
                      }}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
