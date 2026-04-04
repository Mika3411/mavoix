import React from "react";

export default function CommunicationPage({
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
}) {
  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Communication rapide</h2>

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
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
              alignItems: "start",
            }}
          >
            {filteredPhrases.map((item) => (
              <div
                key={item.id}
                style={{
                  ...styles.quickPhraseCard,
                  padding: 8,
                  gap: 6,
                  borderRadius: 14,
                }}
              >
                <button
                  style={{
                    ...styles.quickPhraseButton,
                    background: getCategoryBackground(item.category),
                    minHeight: 64,
                    fontSize: 15,
                    padding: "10px 12px",
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
                    justifyContent: "space-between",
                    flexWrap: "nowrap",
                  }}
                >
                  <button
                    onClick={() => movePhrase(item.id, "up")}
                    style={{
                      ...styles.smallActionButton,
                      minWidth: 36,
                      height: 36,
                      fontSize: 14,
                      padding: "4px 6px",
                    }}
                    title="Monter"
                  >
                    ⬆
                  </button>

                  <button
                    onClick={() => movePhrase(item.id, "down")}
                    style={{
                      ...styles.smallActionButton,
                      minWidth: 36,
                      height: 36,
                      fontSize: 14,
                      padding: "4px 6px",
                    }}
                    title="Descendre"
                  >
                    ⬇
                  </button>

                  <button
                    onClick={() =>
                      updatePhrase(item.id, "favorite", !item.favorite)
                    }
                    style={{
                      ...styles.favoriteButton,
                      width: 36,
                      minWidth: 36,
                      height: 36,
                      fontSize: 16,
                    }}
                    title={
                      item.favorite
                        ? "Retirer des favoris"
                        : "Ajouter aux favoris"
                    }
                  >
                    {item.favorite ? "⭐" : "☆"}
                  </button>

                  <button
                    onClick={() => deletePhrase(item.id)}
                    style={{
                      ...styles.deleteButton,
                      minWidth: 72,
                      height: 36,
                      fontSize: 12,
                      padding: "4px 8px",
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}