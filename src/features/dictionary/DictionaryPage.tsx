import React, { useMemo, useState } from "react";
import {
  type AbbreviationEntry,
  deleteAbbreviation,
  normalizeAbbreviationKey,
  readAbbreviationEntries,
  resetAbbreviation,
  upsertCustomAbbreviation,
} from "./textFormatting";
import type { StyleMap } from "../../shared/types";

function getSourceLabel(source: AbbreviationEntry["source"]) {
  if (source === "personnel") return "Personnel";
  if (source === "modifié") return "Modifié";
  return "Base";
}

function suggestPluralText(value: string) {
  const cleanValue = String(value || "").trim().replace(/\s+/g, " ");
  if (!cleanValue) return "";

  const words = cleanValue.split(" ");
  const lastWord = words[words.length - 1] || "";
  const lowerLastWord = lastWord.toLowerCase();

  let pluralLastWord = `${lastWord}s`;
  if (/[sxz]$/i.test(lastWord)) {
    pluralLastWord = lastWord;
  } else if (lowerLastWord.endsWith("al")) {
    pluralLastWord = `${lastWord.slice(0, -2)}aux`;
  } else if (
    lowerLastWord.endsWith("au") ||
    lowerLastWord.endsWith("eau") ||
    lowerLastWord.endsWith("eu")
  ) {
    pluralLastWord = `${lastWord}x`;
  }

  return [...words.slice(0, -1), pluralLastWord].join(" ");
}

type DictionaryPageProps = {
  styles: StyleMap;
};

export default function DictionaryPage({ styles }: DictionaryPageProps) {
  const [entries, setEntries] = useState<AbbreviationEntry[]>(() =>
    readAbbreviationEntries()
  );
  const [search, setSearch] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [expansion, setExpansion] = useState("");
  const [pluralExpansion, setPluralExpansion] = useState("");
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
        entry.pluralExpansion?.toLowerCase().includes(query) ||
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

  function resetForm() {
    setAbbreviation("");
    setExpansion("");
    setPluralExpansion("");
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

      const saved = upsertCustomAbbreviation(abbreviation, expansion, pluralExpansion);
      resetForm();
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
    setPluralExpansion(entry.pluralExpansion || "");
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
  const suggestedPluralExpansion = suggestPluralText(expansion);
  const previewAlreadyExists = entries.some(
    (entry) =>
      entry.abbreviation === previewAbbreviation &&
      editingAbbreviation !== previewAbbreviation
  );
  const pluralHelpText =
    "Le pluriel s'applique aux noms après un déterminant pluriel (les, des, aux, ces, nos, vos, leurs...) ou une quantité. Il ne s'applique pas aux verbes conjugués.";
  const compactListButtonStyle = {
    ...styles.secondaryButton,
    minHeight: 36,
    padding: "7px 10px",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.1,
    boxShadow: "none",
  };
  const compactDeleteButtonStyle = {
    ...styles.deleteButton,
    minHeight: 36,
    height: 36,
    minWidth: 86,
    padding: "7px 10px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.1,
  };

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Dictionnaire</h2>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(92px, 0.42fr) minmax(0, 1fr)",
            columnGap: 8,
            rowGap: 12,
            alignItems: "end",
            marginBottom: 16,
            minWidth: 0,
          }}
        >
          <div style={{ ...styles.formGroup, marginBottom: 0, minWidth: 0 }}>
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

          <div style={{ ...styles.formGroup, marginBottom: 0, minWidth: 0 }}>
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

          <div
            style={{
              ...styles.formGroup,
              gridColumn: "1 / -1",
              marginBottom: 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <label style={{ ...styles.label, marginBottom: 0 }}>
                Pluriel
              </label>
              <span
                aria-label={pluralHelpText}
                role="img"
                tabIndex={0}
                title={pluralHelpText}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `1px solid ${styles.inputBorder?.borderColor || "currentColor"}`,
                  fontSize: 12,
                  fontWeight: 900,
                  lineHeight: 1,
                  opacity: 0.78,
                  cursor: "help",
                  userSelect: "none",
                }}
              >
                ?
              </span>
            </div>
            <input
              value={pluralExpansion}
              onChange={(event) => {
                setPluralExpansion(event.target.value);
                if (message) setMessage("");
              }}
              style={styles.input}
              placeholder={suggestedPluralExpansion || "ex : chevaux"}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.primaryButton,
              gridColumn: "1 / -1",
              width: "100%",
            }}
            disabled={
              !previewAbbreviation ||
              !expansion.trim() ||
              previewAlreadyExists
            }
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

        <div style={{ display: "grid", gap: 8 }}>
          {filteredEntries.length === 0 ? (
            <div style={styles.emptyText}>Aucune entrée trouvée.</div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.abbreviation}
                style={{
                  ...styles.categoryManagerBox,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 16,
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.1, opacity: 0.72 }}>
                    {getSourceLabel(entry.source)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 4,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: "inherit",
                        lineHeight: 1.05,
                      }}
                    >
                      {entry.abbreviation}
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        lineHeight: 1.25,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {entry.expansion}
                    </span>
                  </div>
                  {entry.pluralExpansion ? (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        lineHeight: 1.25,
                        opacity: 0.78,
                        overflowWrap: "anywhere",
                      }}
                    >
                      Pluriel : {entry.pluralExpansion}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                    flexWrap: "nowrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={compactListButtonStyle}
                    onClick={() => handleEdit(entry)}
                  >
                    Modifier
                  </button>

                  {entry.source === "modifié" ? (
                    <button
                      type="button"
                      style={compactListButtonStyle}
                      onClick={() => handleReset(entry)}
                    >
                      Réinitialiser
                    </button>
                  ) : null}

                  <button
                    type="button"
                    style={compactDeleteButtonStyle}
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
