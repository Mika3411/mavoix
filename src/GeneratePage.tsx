import React, { useEffect, useMemo, useState } from "react";
import { QUICK_SUGGESTIONS, WORD_SUGGESTIONS } from "./utils/suggestions";
import { normalizeWhatsAppPhone } from "./utils/phone";

type Contact = {
  name: string;
  phone: string;
  relation?: string;
};

function levenshtein(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function getBestCorrection(word: string) {
  const normalized = String(word || "").trim().toLowerCase();
  if (!normalized) return "";

  let best = normalized;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of WORD_SUGGESTIONS) {
    const current = String(candidate || "").trim().toLowerCase();
    if (!current) continue;

    const distance = levenshtein(normalized, current);
    if (distance < bestScore) {
      best = current;
      bestScore = distance;
    }

    if (distance === 0) break;
  }

  if (bestScore <= 2 || best.startsWith(normalized.slice(0, Math.max(1, normalized.length - 1)))) {
    return best;
  }

  return normalized;
}

function buildRealtimeAssist(inputText: string) {
  const raw = String(inputText || "");
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      correctedText: "",
      completion: "",
      displayText: "L'IA corrige votre texte en direct ici.",
    };
  }

  const words = trimmed.split(/\s+/);
  const lastWord = words[words.length - 1] || "";
  const correctedLastWord = getBestCorrection(lastWord);
  const correctedWords = [...words];
  correctedWords[correctedWords.length - 1] = correctedLastWord;
  const correctedText = correctedWords.join(" ");

  const lowerCorrected = correctedText.toLowerCase();
  const completion = "";

  return {
    correctedText,
    completion,
    displayText: correctedText,
  };
}

export default function GeneratePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [sendMode, setSendMode] = useState<"sms" | "whatsapp">("sms");
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("contacts");
    if (!saved) return;

    try {
      const parsed: Contact[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setContacts(parsed);
        if (parsed.length > 0) {
          setSelectedContactName(parsed[0].name);
        }
      }
    } catch (error) {
      console.error("Impossible de lire les contacts enregistrés :", error);
    }
  }, []);

  const selectedContact =
    contacts.find((contact) => contact.name === selectedContactName) ?? null;

  const aiAssist = useMemo(() => buildRealtimeAssist(inputText), [inputText]);

  const handleSendMessage = () => {
    if (!selectedContact) return;

    const message = (aiAssist.correctedText || inputText).trim();
    if (!message) {
      alert("Aucun message à envoyer");
      return;
    }

    if (sendMode === "whatsapp") {
      const phone = normalizeWhatsAppPhone(selectedContact.phone);
      const appUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.location.href = appUrl;

      setTimeout(() => {
        window.open(webUrl, "_blank");
      }, 1200);

      return;
    }

    const smsUrl = `sms:${selectedContact.phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  return (
    <div style={{ color: "white" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 260px) minmax(320px, 1fr)",
          gap: "18px",
          alignItems: "start",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
          Ajouter une phrase
        </h2>

        <div
          style={{
            minHeight: "88px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "20px",
            fontSize: "18px",
            lineHeight: 1.4,
            color: "#e5e7eb",
            boxSizing: "border-box",
          }}
        >
          {aiAssist.displayText}
        </div>
      </div>

      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        Texte à dire
      </label>

      <div style={{ position: "relative" }}>
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
          }}
          placeholder="Écrire ici..."
          style={{
            width: "100%",
            minHeight: "180px",
            background: "#020b27",
            color: "white",
            border: "1px solid #334155",
            borderRadius: "24px",
            padding: "20px",
            fontSize: "18px",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "14px",
          marginTop: "24px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 360px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Envoyer à
          </label>

          <select
            value={selectedContactName}
            onChange={(e) => setSelectedContactName(e.target.value)}
            style={{
              width: "100%",
              background: "#020b27",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "18px",
              padding: "14px 16px",
              fontSize: "16px",
            }}
          >
            {contacts.map((contact) => (
              <option key={contact.name} value={contact.name}>
                {contact.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: "210px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Mode
          </label>

          <select
            value={sendMode}
            onChange={(e) => setSendMode(e.target.value as "sms" | "whatsapp")}
            style={{
              width: "100%",
              background: "#020b27",
              color: "white",
              border: "1px solid #334155",
              borderRadius: "18px",
              padding: "14px 16px",
              fontSize: "16px",
            }}
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <button
          onClick={handleSendMessage}
          style={{
            marginTop: "28px",
            background: "#263a63",
            color: "white",
            border: "1px solid #3c4d6e",
            borderRadius: "18px",
            padding: "14px 18px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          📩 Envoyer à {selectedContact?.name || "..."}
        </button>
      </div>
    </div>
  );
}
