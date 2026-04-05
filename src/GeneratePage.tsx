import React, { useEffect, useState } from "react";

type Contact = {
  name: string;
  phone: string;
  relation?: string;
};

export default function GeneratePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
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
          setSelectedContact(parsed[0]);
        }
      }
    } catch (error) {
      console.error("Impossible de lire les contacts enregistrés :", error);
    }
  }, []);

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
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
        <div style={{ display: "flex", overflowX: "auto", gap: "10px", flex: 1 }}>
          {contacts.map((c, index) => (
            <button key={index} onClick={() => setSelectedContact(c)}>
              {c.name}
            </button>
          ))}
        </div>

        <select
          value={sendMode}
          onChange={(e) => setSendMode(e.target.value as "sms" | "whatsapp")}
        >
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        <button onClick={handleSendMessage}>
          📩 Envoyer à {selectedContact?.name || "..."}
        </button>
      </div>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Écrire ici..."
      />

      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setGeneratedText(inputText)}>
          Générer par IA
        </button>
      </div>
    </div>
  );
}
