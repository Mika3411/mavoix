import React, { useMemo, useState } from "react";
import {
  type AbbreviationEntry,
  deleteAbbreviation,
  normalizeAbbreviationKey,
  readAbbreviationEntries,
  resetAbbreviation,
  upsertCustomAbbreviation,
} from "./utils/textFormatting";

function getSourceLabel(source: AbbreviationEntry["source"]) {
  if (source === "personnel") return "Personnel";
  if (source === "modifié") return "Modifié";
  return "Base";
}

export default function DictionaryPage({ styles }: { styles: any }) {
  const [entries, setEntries] = useState<AbbreviationEntry[]>(() =>
    readAbbreviationEntries()
  );
  const [search, setSearch] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [expansion, setExpansion] = useState("");
  const [message, setMessage] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState("");
  const [editingAbbreviation, setEditingAbbreviation] = useState("");

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => {
      return (
        entry.abbreviation.toLowerCase().includes(query) ||
        entry.expansion.toLowerCase().includes(query) ||
        getSourceLabel(entry.source).toLowerCase().includes(query)
      );
    });
  }, [entries, search]);

  function refreshEntries(nextMessage = "") {
    setEntries(readAbbreviationEntries());
    setMessage(nextMessage);
    setDeleteCandidate("");
    setEditingAbbreviation("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const cleanAbbreviation = normalizeAbbreviationKey(abbreviation);
      const existingEntry = entries.find(
        (entry) => entry.abbreviation === cleanAbbreviation
      );

      if (existingEntry && editingAbbreviation !== cleanAbbreviation) {
        setMessage(
          `${cleanAbbreviation} existe déjà. Clique sur Modifier dans la liste pour changer son texte.`
        );
        setSearch(cleanAbbreviation);
        return;
      }

      const saved = upsertCustomAbbreviation(abbreviation, expansion);
      setAbbreviation("");
      setExpansion("");
      refreshEntries(
        editingAbbreviation
          ? `${saved.abbreviation} modifié.`
          : `${saved.abbreviation} ajouté au dictionnaire.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer."
      );
    }
  }

  function handleEdit(entry: AbbreviationEntry) {
    setAbbreviation(entry.abbreviation);
    setExpansion(entry.expansion);
    setEditingAbbreviation(entry.abbreviation);
    setMessage("");
    setDeleteCandidate("");
  }

  function handleDelete(entry: AbbreviationEntry) {
    if (deleteCandidate !== entry.abbreviation) {
      setDeleteCandidate(entry.abbreviation);
      setMessage(`Confirme la suppression de ${entry.abbreviation}.`);
      return;
    }

    deleteAbbreviation(entry.abbreviation);
    refreshEntries(`${entry.abbreviation} supprimé.`);
  }

  function handleReset(entry: AbbreviationEntry) {
    resetAbbreviation(entry.abbreviation);
    refreshEntries(`${entry.abbreviation} réinitialisé.`);
  }

  const previewAbbreviation = normalizeAbbreviationKey(abbreviation);
  const previewAlreadyExists = entries.some(
    (entry) =>
      entry.abbreviation === previewAbbreviation &&
      editingAbbreviation !== previewAbbreviation
  );

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Dictionnaire</h2>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            alignItems: "end",
            marginBottom: 16,
          }}
        >
          <div style={styles.formGroup}>
            <label style={styles.label}>Abréviation</label>
            <input
              value={abbreviation}
              onChange={(event) => {
                setAbbreviation(event.target.value);
                if (message) setMessage("");
              }}
              style={styles.input}
              placeholder="ex : smplmt"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Texte</label>
            <input
              value={expansion}
              onChange={(event) => {
                setExpansion(event.target.value);
                if (message) setMessage("");
              }}
              style={styles.input}
              placeholder="ex : simplement"
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.primaryButton,
              marginBottom: 12,
              width: "100%",
            }}
            disabled={!previewAbbreviation || !expansion.trim()}
          >
            {editingAbbreviation ? "Modifier" : "Enregistrer"}
          </button>
        </form>

        {previewAlreadyExists ? (
          <div style={{ ...styles.infoBox, marginBottom: 16 }}>
            {previewAbbreviation} existe déjà. Utilise le bouton Modifier de son entrée.
          </div>
        ) : null}

        {message ? (
          <div style={{ ...styles.infoBox, marginBottom: 16 }}>{message}</div>
        ) : null}

        <div style={{ ...styles.formGroup, marginBottom: 16 }}>
          <label style={styles.label}>Recherche</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.input}
            placeholder="Abréviation, texte ou source"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 800 }}>
            {filteredEntries.length} / {entries.length} entrées
          </div>
          {search ? (
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setSearch("")}
            >
              Effacer
            </button>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filteredEntries.length === 0 ? (
            <div style={styles.emptyText}>Aucune entrée trouvée.</div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.abbreviation}
                style={{
                  ...styles.categoryManagerBox,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, opacity: 0.72 }}>
                    {getSourceLabel(entry.source)}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "inherit",
                    }}
                  >
                    {entry.abbreviation}
                  </div>
                </div>

                <div style={{ fontSize: 18, lineHeight: 1.45 }}>
                  {entry.expansion}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => handleEdit(entry)}
                  >
                    Modifier
                  </button>

                  {entry.source === "modifié" ? (
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => handleReset(entry)}
                    >
                      Réinitialiser
                    </button>
                  ) : null}

                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => handleDelete(entry)}
                  >
                    {deleteCandidate === entry.abbreviation
                      ? "Confirmer"
                      : "Supprimer"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
