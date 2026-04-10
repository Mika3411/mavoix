import React from "react";

export default function VoicePage(props: any) {
  const {
    styles,
    defaultVoice,
    defaultVoiceSettings,
    voices,
    voiceStatus,
    testVoice,
    updateCurrentProfileField,
    currentProfile,
    savedPhrases,
    selectedPhraseId,
    setSelectedPhraseId,
    selectedPhrase,
    voiceEditor,
    setVoiceEditor,
    categories,
    saveSelectedPhraseVoiceSettings,
    speakText,
    recordingPhraseId,
    stopRecording,
    startRecording,
    audioMap,
    deleteRecording,
  } = props;
  const visibleVoices = voices.filter(
    (voice) => voiceStatus?.[voice.voiceURI] !== "failed"
  );

  const voicesToDisplay = visibleVoices.length > 0 ? visibleVoices : voices;

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Réglages voix</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Voix française par défaut</label>
          <select
            value={defaultVoice}
            onChange={(e) =>
              updateCurrentProfileField("defaultVoice", e.target.value)
            }
            style={styles.input}
          >
            <option value="default">Voix du navigateur</option>
            {voicesToDisplay.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} {voice.lang ? `(${voice.lang})` : ""}
              </option>
            ))}
          </select>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.78 }}>
              Certaines voix proposées par le navigateur peuvent ne pas fonctionner selon l'appareil.
            </div>

            {defaultVoice !== "default" ? (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => testVoice(defaultVoice)}
              >
                Tester cette voix
              </button>
            ) : null}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Langue du profil</label>
          <input
            value={currentProfile.language}
            onChange={(e) =>
              updateCurrentProfileField("language", e.target.value)
            }
            style={styles.input}
            placeholder="fr-FR"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Vitesse ({(defaultVoiceSettings?.rate ?? 1).toFixed(1)}x)
            </label>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.1"
              value={defaultVoiceSettings?.rate ?? 1}
              onChange={(e) =>
                updateCurrentProfileField("voiceSettings", {
                  ...(currentProfile.voiceSettings || {}),
                  rate: Number(e.target.value),
                })
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Hauteur ({(defaultVoiceSettings?.pitch ?? 1).toFixed(1)})
            </label>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.1"
              value={defaultVoiceSettings?.pitch ?? 1}
              onChange={(e) =>
                updateCurrentProfileField("voiceSettings", {
                  ...(currentProfile.voiceSettings || {}),
                  pitch: Number(e.target.value),
                })
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Volume ({Math.round((defaultVoiceSettings?.volume ?? 1) * 100)}%)
            </label>
            <input
              type="range"
              min="0.4"
              max="1"
              step="0.1"
              value={defaultVoiceSettings?.volume ?? 1}
              onChange={(e) =>
                updateCurrentProfileField("voiceSettings", {
                  ...(currentProfile.voiceSettings || {}),
                  volume: Number(e.target.value),
                })
              }
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ ...styles.inlineButtons, marginTop: 8 }}>
          <button
            style={styles.secondaryButton}
            onClick={() =>
              updateCurrentProfileField("voiceSettings", {
                rate: 1,
                pitch: 1,
                volume: 1,
              })
            }
          >
            Réinitialiser les réglages
          </button>

          <button
            style={styles.primaryButton}
            onClick={() => speakText("Bonjour, ceci est un test de voix.")}
          >
            Tester la voix du profil
          </button>
        </div>

        <div style={styles.infoBox}>
          Chaque profil peut avoir sa propre voix par défaut, sa vitesse, son
          volume et sa hauteur de voix, ainsi que ses propres enregistrements
          audio.
          {defaultVoice !== "default" && voiceStatus?.[defaultVoice] === "failed" ? (
            <div style={{ marginTop: 10, color: "#fecaca", fontWeight: 700 }}>
              La voix choisie a déjà échoué sur cet appareil. L'application utilisera automatiquement une autre voix compatible.
            </div>
          ) : null}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Voix personnalisées</h2>

        {savedPhrases.length === 0 ? (
          <p style={styles.emptyText}>Aucune phrase enregistrée.</p>
        ) : (
          <div style={styles.phraseEditorBox}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Choisir une phrase</label>
              <select
                value={selectedPhraseId || ""}
                onChange={(e) => setSelectedPhraseId(e.target.value)}
                style={styles.input}
              >
                {savedPhrases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label || item.text}
                  </option>
                ))}
              </select>
            </div>

            {selectedPhrase && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom</label>
                  <input
                    value={voiceEditor.label}
                    onChange={(e) =>
                      setVoiceEditor((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Texte</label>
                  <textarea
                    value={voiceEditor.text}
                    onChange={(e) =>
                      setVoiceEditor((prev) => ({
                        ...prev,
                        text: e.target.value,
                      }))
                    }
                    style={styles.smallTextarea}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Catégorie</label>
                  <select
                    value={voiceEditor.category}
                    onChange={(e) =>
                      setVoiceEditor((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    style={styles.input}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Voix associée</label>
                  <select
                    value={voiceEditor.assignedVoice || "default"}
                    onChange={(e) =>
                      setVoiceEditor((prev) => ({
                        ...prev,
                        assignedVoice: e.target.value,
                      }))
                    }
                    style={styles.input}
                  >
                    <option value="default">Voix par défaut</option>
                    {voicesToDisplay.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} {voice.lang ? `(${voice.lang})` : ""}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.78 }}>
                      Les voix détectées comme instables sont masquées automatiquement.
                    </div>

                    {(voiceEditor.assignedVoice || "default") !== "default" ? (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => testVoice(voiceEditor.assignedVoice)}
                      >
                        Tester cette voix
                      </button>
                    ) : null}
                  </div>
                </div>

                <div style={styles.categoryManagerBox}>
                  <h3 style={styles.managerTitle}>Réglages de cette phrase</h3>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={voiceEditor.useProfileVoiceSettings !== false}
                      onChange={(e) =>
                        setVoiceEditor((prev) => ({
                          ...prev,
                          useProfileVoiceSettings: e.target.checked,
                          voiceSettings: e.target.checked
                            ? { ...defaultVoiceSettings }
                            : {
                                ...prev.voiceSettings,
                                rate: prev.voiceSettings?.rate ?? defaultVoiceSettings.rate,
                                pitch: prev.voiceSettings?.pitch ?? defaultVoiceSettings.pitch,
                                volume: prev.voiceSettings?.volume ?? defaultVoiceSettings.volume,
                              },
                        }))
                      }
                    />
                    Utiliser les réglages du profil
                  </label>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 12,
                      opacity: voiceEditor.useProfileVoiceSettings ? 0.55 : 1,
                    }}
                  >
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Vitesse ({Number(voiceEditor.voiceSettings?.rate ?? 1).toFixed(1)}x)
                      </label>
                      <input
                        type="range"
                        min="0.7"
                        max="1.4"
                        step="0.1"
                        disabled={voiceEditor.useProfileVoiceSettings}
                        value={voiceEditor.voiceSettings?.rate ?? 1}
                        onChange={(e) =>
                          setVoiceEditor((prev) => ({
                            ...prev,
                            voiceSettings: {
                              ...prev.voiceSettings,
                              rate: Number(e.target.value),
                            },
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Hauteur ({Number(voiceEditor.voiceSettings?.pitch ?? 1).toFixed(1)})
                      </label>
                      <input
                        type="range"
                        min="0.8"
                        max="1.3"
                        step="0.1"
                        disabled={voiceEditor.useProfileVoiceSettings}
                        value={voiceEditor.voiceSettings?.pitch ?? 1}
                        onChange={(e) =>
                          setVoiceEditor((prev) => ({
                            ...prev,
                            voiceSettings: {
                              ...prev.voiceSettings,
                              pitch: Number(e.target.value),
                            },
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Volume ({Math.round(Number(voiceEditor.voiceSettings?.volume ?? 1) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0.4"
                        max="1"
                        step="0.1"
                        disabled={voiceEditor.useProfileVoiceSettings}
                        value={voiceEditor.voiceSettings?.volume ?? 1}
                        onChange={(e) =>
                          setVoiceEditor((prev) => ({
                            ...prev,
                            voiceSettings: {
                              ...prev.voiceSettings,
                              volume: Number(e.target.value),
                            },
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={styles.inlineButtons}>
                  <button
                    style={styles.primaryButton}
                    onClick={saveSelectedPhraseVoiceSettings}
                  >
                    Sauvegarder
                  </button>

                  <button
                    style={styles.secondaryButton}
                    onClick={() =>
                      speakText(
                        voiceEditor.text,
                        voiceEditor.assignedVoice,
                        null,
                        voiceEditor.useProfileVoiceSettings
                          ? null
                          : voiceEditor.voiceSettings
                      )
                    }
                  >
                    Tester la voix synthétique
                  </button>
                </div>

                <div style={styles.recordingBox}>
                  <strong style={styles.recordingTitle}>
                    Voix réelle enregistrée
                  </strong>
                  <p style={styles.recordingText}>
                    Enregistre ici la vraie voix de la personne pour cette
                    phrase.
                  </p>

                  <div style={styles.inlineButtons}>
                    <button
                      style={
                        recordingPhraseId === selectedPhrase.id
                          ? styles.recordingButton
                          : styles.primaryButton
                      }
                      onClick={() =>
                        recordingPhraseId === selectedPhrase.id
                          ? stopRecording()
                          : startRecording(selectedPhrase.id)
                      }
                    >
                      {recordingPhraseId === selectedPhrase.id
                        ? "Stop enregistrement"
                        : "Enregistrer ma voix"}
                    </button>

                    <button
                      style={styles.secondaryButton}
                      onClick={() =>
                        speakText(
                          selectedPhrase.text,
                          selectedPhrase.assignedVoice,
                          selectedPhrase.id
                        )
                      }
                    >
                      Écouter l'audio actuel
                    </button>

                    {audioMap[selectedPhrase.id] && (
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteRecording(selectedPhrase.id)}
                      >
                        Supprimer audio
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    {audioMap[selectedPhrase.id] ? (
                      <span style={styles.recordingBadge}>
                        Audio enregistré pour cette phrase
                      </span>
                    ) : (
                      <span style={styles.noRecordingBadge}>
                        Aucun audio enregistré
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
