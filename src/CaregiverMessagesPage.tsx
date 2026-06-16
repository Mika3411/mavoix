import React from "react";
import { API_BASE, getCaregiverNetworkErrorMessage } from "./services/config";
import { formatTextSmart } from "./utils/textFormatting";

type CaregiverTarget = {
  id: string;
  name: string;
  channel: string;
};

type CaregiverMessage = {
  id: string;
  channel: string;
  createdAt: string;
  senderRole: "user" | "caregiver";
  senderName: string;
  message: string;
};

type MessageStore = {
  key: string;
  data: Record<string, CaregiverMessage[]>;
};

const MESSAGE_HISTORY_LIMIT = 80;

function readMessages(storageKey: string) {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mergeMessages(
  currentMessages: CaregiverMessage[] = [],
  incomingMessages: CaregiverMessage[] = []
) {
  const messageMap = new Map<string, CaregiverMessage>();

  [...currentMessages, ...incomingMessages].forEach((message) => {
    if (!message?.id || !message?.message) return;
    messageMap.set(message.id, message);
  });

  return Array.from(messageMap.values())
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .slice(-MESSAGE_HISTORY_LIMIT);
}

function buildMessageStreamUrl(channel: string) {
  const url = new URL("/api/caregiver-messages/stream", API_BASE);
  url.searchParams.set("channel", channel);
  url.searchParams.set("role", "user");
  return url.href;
}

function formatMessageTime(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function CaregiverMessagesPage(props: any) {
  const {
    styles,
    caregiverAlertLinks = [],
    currentProfile,
    currentProfileId,
    text,
    setText,
    isListening,
    startDictation,
    speakText,
    showToast,
  } = props;

  const caregiverTargets = React.useMemo<CaregiverTarget[]>(
    () =>
      (caregiverAlertLinks || [])
        .filter((link) => link?.channel)
        .map((link, index) => ({
          id: link.id || link.channel,
          name: link.name || `Aidant ${index + 1}`,
          channel: link.channel,
        })),
    [caregiverAlertLinks]
  );
  const caregiverChannelKey = React.useMemo(
    () => caregiverTargets.map((target) => target.channel).join("|"),
    [caregiverTargets]
  );
  const storageKey = React.useMemo(
    () =>
      `maVoixCaregiverMessages:${
        currentProfileId || currentProfile?.id || "default"
      }`,
    [currentProfileId, currentProfile?.id]
  );

  const [selectedCaregiverId, setSelectedCaregiverId] = React.useState("");
  const [messageStore, setMessageStore] = React.useState<MessageStore>(() => ({
    key: storageKey,
    data: readMessages(storageKey),
  }));
  const [connectedCaregivers, setConnectedCaregivers] = React.useState<
    Record<string, number>
  >({});
  const [statusText, setStatusText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    setMessageStore({
      key: storageKey,
      data: readMessages(storageKey),
    });
  }, [storageKey]);

  React.useEffect(() => {
    if (messageStore.key !== storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(messageStore.data));
  }, [messageStore, storageKey]);

  React.useEffect(() => {
    if (caregiverTargets.length === 0) {
      setSelectedCaregiverId("");
      return;
    }

    const selectedExists = caregiverTargets.some(
      (target) => target.id === selectedCaregiverId
    );
    if (!selectedExists) {
      setSelectedCaregiverId(caregiverTargets[0].id);
    }
  }, [caregiverTargets, selectedCaregiverId]);

  const updateChannelMessages = React.useCallback(
    (channel: string, incomingMessages: CaregiverMessage[]) => {
      setMessageStore((prev) => ({
        key: prev.key,
        data: {
          ...prev.data,
          [channel]: mergeMessages(prev.data[channel], incomingMessages),
        },
      }));
    },
    []
  );

  React.useEffect(() => {
    if (caregiverTargets.length === 0) return;

    const sources = caregiverTargets.map((target) => {
      const source = new EventSource(buildMessageStreamUrl(target.channel));

      source.addEventListener("connected", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          setConnectedCaregivers((prev) => ({
            ...prev,
            [target.channel]: Number(payload.connectedCaregivers || 0),
          }));
          setStatusText("Conversation connectée.");
        } catch {
          setStatusText("Conversation connectée.");
        }
      });

      source.addEventListener("caregiver-presence", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          setConnectedCaregivers((prev) => ({
            ...prev,
            [target.channel]: Number(payload.connectedCaregivers || 0),
          }));
        } catch {}
      });

      source.addEventListener("caregiver-message-history", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          updateChannelMessages(
            target.channel,
            Array.isArray(payload.messages) ? payload.messages : []
          );
        } catch {}
      });

      source.addEventListener("caregiver-message", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          updateChannelMessages(target.channel, [payload]);
          setStatusText("Nouveau message reçu.");
        } catch {}
      });

      source.onerror = () => {
        setStatusText("Connexion messages interrompue. Reconnexion en cours...");
      };

      return source;
    });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [caregiverChannelKey, caregiverTargets, updateChannelMessages]);

  const selectedCaregiver =
    caregiverTargets.find((target) => target.id === selectedCaregiverId) ||
    caregiverTargets[0] ||
    null;
  const selectedMessages = selectedCaregiver
    ? messageStore.data[selectedCaregiver.channel] || []
    : [];
  const selectedConnectedCount = selectedCaregiver
    ? connectedCaregivers[selectedCaregiver.channel] || 0
    : 0;

  async function sendCaregiverMessage() {
    if (!selectedCaregiver || isSending) return;

    const message = String(text || "").trim();
    if (!message) {
      setStatusText("Écris un message avant l'envoi.");
      return;
    }

    try {
      setIsSending(true);

      const response = await fetch(`${API_BASE}/api/caregiver-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedCaregiver.channel,
          senderRole: "user",
          senderName: currentProfile?.firstName || currentProfile?.name || "Utilisateur",
          message,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.details || data?.error || "Impossible d'envoyer le message."
        );
      }

      if (data?.message) {
        updateChannelMessages(selectedCaregiver.channel, [data.message]);
      }
      setText("");

      const nextStatus =
        Number(data?.deliveredTo || 0) > 0
          ? `Message envoyé à ${selectedCaregiver.name}.`
          : `Message enregistré pour ${selectedCaregiver.name}.`;
      setStatusText(nextStatus);
      showToast?.(nextStatus);
    } catch (error) {
      const nextStatus = getCaregiverNetworkErrorMessage(
        error,
        "Impossible d'envoyer le message."
      );
      setStatusText(nextStatus);
      showToast?.(nextStatus);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div style={styles.gridSingle}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Messages aidants</h2>

        {caregiverTargets.length === 0 ? (
          <p style={styles.emptyText}>
            Ajoute un aidant dans Profil pour ouvrir une conversation.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 900 ? "minmax(0, 0.9fr) minmax(0, 1.4fr)" : "1fr",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Choisir l'aidant</label>
                  <select
                    value={selectedCaregiver?.id || ""}
                    onChange={(event) => setSelectedCaregiverId(event.target.value)}
                    style={styles.input}
                  >
                    {caregiverTargets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    background:
                      selectedConnectedCount > 0
                        ? "rgba(34,197,94,0.14)"
                        : "rgba(245,158,11,0.14)",
                    border:
                      selectedConnectedCount > 0
                        ? "1px solid rgba(74,222,128,0.32)"
                        : "1px solid rgba(251,191,36,0.32)",
                    color: "rgba(255,255,255,0.88)",
                    fontWeight: 700,
                  }}
                >
                  {selectedConnectedCount > 0
                    ? `${selectedCaregiver?.name} est connecté.`
                    : `${selectedCaregiver?.name} n'est pas connecté pour le moment.`}
                </div>
              </div>

              <div
                style={{
                  minHeight: 260,
                  maxHeight: 420,
                  overflowY: "auto",
                  display: "grid",
                  alignContent: "start",
                  gap: 10,
                  padding: 12,
                  borderRadius: 18,
                  background: "rgba(0,0,0,0.16)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {selectedMessages.length === 0 ? (
                  <div style={{ ...styles.emptyText, margin: 0 }}>
                    Aucun message avec cet aidant.
                  </div>
                ) : (
                  selectedMessages.map((message) => {
                    const isUser = message.senderRole === "user";
                    return (
                      <div
                        key={message.id}
                        style={{
                          justifySelf: isUser ? "end" : "start",
                          maxWidth: "88%",
                          display: "grid",
                          gap: 5,
                          padding: "11px 13px",
                          borderRadius: 16,
                          background: isUser
                            ? "rgba(37,99,235,0.32)"
                            : "rgba(34,197,94,0.18)",
                          border: isUser
                            ? "1px solid rgba(96,165,250,0.36)"
                            : "1px solid rgba(74,222,128,0.28)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.78,
                            fontWeight: 800,
                          }}
                        >
                          {isUser
                            ? currentProfile?.firstName ||
                              currentProfile?.name ||
                              "Moi"
                            : message.senderName || selectedCaregiver?.name}
                          {formatMessageTime(message.createdAt)
                            ? ` - ${formatMessageTime(message.createdAt)}`
                            : ""}
                        </div>
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            lineHeight: 1.35,
                          }}
                        >
                          {message.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ ...styles.formGroup, marginTop: 16 }}>
              <label style={styles.label}>Message</label>
              <textarea
                value={text}
                onChange={(event) => setText(formatTextSmart(event.target.value))}
                style={styles.textarea}
                placeholder="Écrire ici..."
              />
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth > 760
                    ? "repeat(3, minmax(0, 1fr))"
                    : "1fr",
                gap: 10,
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  opacity: isListening ? 0.6 : 1,
                }}
                onClick={startDictation}
                disabled={isListening}
              >
                🎤 Dicter
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => speakText(text)}
              >
                ▶️ Écouter
              </button>

              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  opacity: isSending ? 0.7 : 1,
                }}
                onClick={sendCaregiverMessage}
                disabled={isSending || !selectedCaregiver}
              >
                {isSending ? "Envoi..." : "Envoyer"}
              </button>
            </div>

            {statusText ? (
              <div
                style={{
                  ...styles.infoBox,
                  marginTop: 14,
                  lineHeight: 1.45,
                }}
              >
                {statusText}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
