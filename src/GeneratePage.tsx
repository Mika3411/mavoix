import React, { useEffect, useMemo, useState } from "react";

type Contact = {
  name: string;
  phone: string;
  relation?: string;
};

const QUICK_SUGGESTIONS = [
  "Bonjour",
  "Merci",
  "Oui",
  "Non",
  "J'ai besoin d'aide",
  "Je suis fatigué",
];

const WORD_SUGGESTIONS = [
  "Bonjour",
  "Bonsoir",
  "Bonne journée",
  "Merci",
  "S'il te plaît",
  "Je suis fatigué",
  "J'ai besoin d'aide",
  "Je voudrais boire",
  "Je voudrais manger",
  "Je suis en douleur",
  "Appelle-moi",
  "À plus tard",
];

export default function GeneratePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [sendMode, setSendMode] = useState<"sms" | "whatsapp">("sms");
  const [inputText, setInputText] = useState("");
  const [generatedText, setGeneratedText] = useState("");

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

  const normalizeWhatsAppPhone = (rawPhone: string) => {
    const cleaned = rawPhone.replace(/\s+/g, "").replace(/[^\d+]/g, "");

    if (cleaned.startsWith("+33")) {
      return cleaned.slice(1);
    }

    if (cleaned.startsWith("0")) {
      return `33${cleaned.slice(1)}`;
    }

    return cleaned.replace(/^\+/, "");
  };

  const suggestions = useMemo(() => {
    const lastWord = inputText.trim().split(/\s+/).pop()?.toLowerCase() ?? "";

    if (lastWord.length < 1) return [];

    return WORD_SUGGESTIONS.filter((word) =>
      word.toLowerCase().startsWith(lastWord)
    ).slice(0, 6);
  }, [inputText]);

  const replaceLastWord = (suggestion: string) => {
    const hasTrailingSpace = /\s$/.test(inputText);
    const parts = inputText.split(/\s+/).filter(Boolean);

    if (parts.length === 0 || hasTrailingSpace) {
      setInputText((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${suggestion} `);
      return;
    }

    parts[parts.length - 1] = suggestion;
    setInputText(`${parts.join(" ")} `);
  };

  const applyQuickSuggestion = (phrase: string) => {
    setInputText(phrase);
    setGeneratedText("");
  };

  const handleSendMessage = () => {
    if (!selectedContact) return;

    const message = (generatedText || inputText).trim();
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
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
          Ajouter une phrase
        </h2>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {(suggestions.length > 0 ? suggestions : QUICK_SUGGESTIONS).map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() =>
                suggestions.length > 0
                  ? replaceLastWord(phrase)
                  : applyQuickSuggestion(phrase)
              }
              style={{
                background: suggestions.length > 0 ? "#0f766e" : "#2f66f0",
                color: "white",
                border: suggestions.length > 0
                  ? "1px solid #34d399"
                  : "1px solid #5d8cff",
                borderRadius: "999px",
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              {phrase}
            </button>
          ))}
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
            setGeneratedText("");
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

      <div style={{ marginTop: "18px" }}>
        <button
          onClick={() => setGeneratedText(inputText)}
          style={{
            width: "100%",
            background: "#2f66f0",
            color: "white",
            border: "none",
            borderRadius: "18px",
            padding: "16px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "16px",
          }}
        >
          ✨ Générer par IA
        </button>
      </div>
    </div>
  );
}
