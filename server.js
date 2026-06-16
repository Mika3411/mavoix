require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const DEFAULT_ALLOWED_ORIGINS = [
  "https://mavoix.onrender.com",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4173",
  "http://localhost:5173",
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins =
  allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

function isAllowedCorsOrigin(origin) {
  if (!origin || corsOrigins.includes(origin)) return true;

  if (origin === "capacitor://localhost" || origin === "ionic://localhost") {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(url.hostname) &&
      ["http:", "https:"].includes(url.protocol)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origine non autorisée par CORS"));
    },
  })
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.path.startsWith("/api/") || req.path === "/aidant-alerte") {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
});
app.use(express.json({ limit: "32kb" }));

const DESKTOP_BUILD_DIR = path.join(__dirname, "build");
const ANDROID_BUILD_DIR = process.env.ANDROID_BUILD_DIR
  ? path.resolve(process.env.ANDROID_BUILD_DIR)
  : path.resolve(__dirname, "..", "ma-voix-android", "build");
const DEFAULT_ALARM_AUDIO_FILE = path.join(
  __dirname,
  "public",
  "aidant-alarm-default.mp3"
);

function sanitizeText(value, maxLength = 140) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizeAlertChannel(value) {
  if (typeof value !== "string") return "";
  const cleanValue = value.trim();
  return /^[a-zA-Z0-9_-]{12,80}$/.test(cleanValue) ? cleanValue : "";
}

const caregiverAlertClients = new Map();
const caregiverMessageClients = new Map();
const caregiverMessageHistory = new Map();
const CAREGIVER_MESSAGE_HISTORY_LIMIT = 80;
const CAREGIVER_MESSAGE_RETENTION_MS = Math.max(
  0,
  Number(process.env.MESSAGE_RETENTION_MS || 24 * 60 * 60 * 1000)
);

function getCaregiverAlertClients(channel) {
  if (!caregiverAlertClients.has(channel)) {
    caregiverAlertClients.set(channel, new Set());
  }

  return caregiverAlertClients.get(channel);
}

function removeCaregiverAlertClient(channel, client) {
  const clients = caregiverAlertClients.get(channel);
  if (!clients) return;

  clients.delete(client);
  if (clients.size === 0) {
    caregiverAlertClients.delete(channel);
  }
}

function broadcastCaregiverAlert(channel, payload) {
  const clients = caregiverAlertClients.get(channel);
  if (!clients || clients.size === 0) return 0;

  let deliveredTo = 0;
  const message = `event: caregiver-alert\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const client of Array.from(clients)) {
    try {
      client.res.write(message);
      deliveredTo += 1;
    } catch (error) {
      clearInterval(client.keepAlive);
      removeCaregiverAlertClient(channel, client);
    }
  }

  return deliveredTo;
}

function getCaregiverMessageClients(channel) {
  if (!caregiverMessageClients.has(channel)) {
    caregiverMessageClients.set(channel, new Set());
  }

  return caregiverMessageClients.get(channel);
}

function getCaregiverMessageHistory(channel) {
  if (!caregiverMessageHistory.has(channel)) {
    caregiverMessageHistory.set(channel, []);
  }

  const history = caregiverMessageHistory.get(channel);
  pruneCaregiverMessageHistory(history);
  return history;
}

function getMessageTimestamp(payload) {
  const timestamp = Date.parse(payload?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function pruneCaregiverMessageHistory(history) {
  if (!history) return;

  if (CAREGIVER_MESSAGE_RETENTION_MS > 0) {
    const cutoff = Date.now() - CAREGIVER_MESSAGE_RETENTION_MS;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (getMessageTimestamp(history[index]) < cutoff) {
        history.splice(index, 1);
      }
    }
  }

  if (history.length > CAREGIVER_MESSAGE_HISTORY_LIMIT) {
    history.splice(0, history.length - CAREGIVER_MESSAGE_HISTORY_LIMIT);
  }
}

function saveCaregiverMessage(channel, payload) {
  const history = getCaregiverMessageHistory(channel);
  history.push(payload);
  pruneCaregiverMessageHistory(history);
}

function removeCaregiverMessageClient(channel, client) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients) return;

  clients.delete(client);
  if (clients.size === 0) {
    caregiverMessageClients.delete(channel);
  }
}

function countCaregiverMessageClients(channel, role) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients) return 0;

  return Array.from(clients).filter((client) => client.role === role).length;
}

function writeSseEvent(client, eventName, payload) {
  client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function broadcastCaregiverPresence(channel) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients || clients.size === 0) return;

  const payload = {
    channel,
    connectedCaregivers: countCaregiverMessageClients(channel, "caregiver"),
  };

  for (const client of Array.from(clients)) {
    if (client.role !== "user") continue;

    try {
      writeSseEvent(client, "caregiver-presence", payload);
    } catch (error) {
      clearInterval(client.keepAlive);
      removeCaregiverMessageClient(channel, client);
    }
  }
}

function broadcastCaregiverMessage(channel, payload, recipientRole) {
  const clients = caregiverMessageClients.get(channel);
  if (!clients || clients.size === 0) return 0;

  let deliveredTo = 0;

  for (const client of Array.from(clients)) {
    if (recipientRole && client.role !== recipientRole) continue;

    try {
      writeSseEvent(client, "caregiver-message", payload);
      deliveredTo += 1;
    } catch (error) {
      clearInterval(client.keepAlive);
      removeCaregiverMessageClient(channel, client);
    }
  }

  return deliveredTo;
}

function sanitizeMessageRole(value) {
  return value === "caregiver" ? "caregiver" : "user";
}

function sanitizeMessageType(value) {
  return value === "audio" ? "audio" : "text";
}

function getCaregiverAlertPageHtml() {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ma Voix - Alerte aidant</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Arial, system-ui, sans-serif;
        background: #0f172a;
        color: #f8fafc;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
        box-sizing: border-box;
      }

      main {
        width: min(100%, 560px);
        display: grid;
        gap: 16px;
      }

      h1 {
        margin: 0;
        font-size: clamp(28px, 8vw, 44px);
        line-height: 1.05;
      }

      p {
        margin: 0;
        color: #cbd5e1;
        font-size: 18px;
        line-height: 1.5;
      }

      label {
        color: #cbd5e1;
        font-size: 15px;
        font-weight: 800;
      }

      .card {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        padding: 22px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
      }

      .status {
        border-radius: 16px;
        padding: 14px;
        background: rgba(59, 130, 246, 0.16);
        border: 1px solid rgba(59, 130, 246, 0.28);
        font-weight: 700;
      }

      .alert {
        background: rgba(220, 38, 38, 0.25);
        border-color: rgba(248, 113, 113, 0.45);
        animation: pulse 0.8s ease-in-out infinite alternate;
      }

      button {
        min-height: 58px;
        border: 0;
        border-radius: 18px;
        padding: 14px 18px;
        color: white;
        font-size: 19px;
        font-weight: 800;
        cursor: pointer;
      }

      .primary {
        background: #2563eb;
      }

      .danger {
        background: #dc2626;
      }

      .secondary {
        background: #334155;
      }

      .actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .sound-settings {
        display: grid;
        gap: 12px;
      }

      .messages,
      .message-form,
      .section-menu,
      .config-form {
        display: grid;
        gap: 12px;
      }

      .section-select,
      .connection-link {
        min-height: 58px;
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px;
        padding: 0 16px;
        box-sizing: border-box;
        background: rgba(15, 23, 42, 0.82);
        color: #f8fafc;
        font: inherit;
        font-size: 18px;
        font-weight: 800;
      }

      .section-panel[hidden] {
        display: none;
      }

      .connection-button {
        min-height: 132px;
        border-radius: 26px;
        font-size: clamp(26px, 8vw, 40px);
        line-height: 1.05;
        text-align: center;
        box-shadow: 0 22px 50px rgba(0, 0, 0, 0.32);
      }

      .connection-button.connected {
        background: linear-gradient(135deg, #16a34a, #22c55e);
        color: #052e16;
      }

      .connection-button.disconnected {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        color: #fff7ed;
      }

      .unread-list {
        display: grid;
        gap: 10px;
      }

      .unread-item {
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(34, 197, 94, 0.16);
        border: 1px solid rgba(74, 222, 128, 0.26);
      }

      .unread-meta {
        color: #bbf7d0;
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 4px;
      }

      .unread-text {
        color: #f8fafc;
        font-size: 17px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .unread-empty {
        color: #cbd5e1;
        font-size: 16px;
        line-height: 1.45;
      }

      .file-label {
        min-height: 58px;
        border-radius: 18px;
        padding: 14px 18px;
        color: white;
        font-size: 19px;
        font-weight: 800;
        cursor: pointer;
        background: #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
      }

      .file-label input {
        display: none;
      }

      .sound-name {
        color: #cbd5e1;
        font-size: 16px;
        line-height: 1.45;
      }

      .message-list {
        min-height: 180px;
        max-height: 340px;
        overflow-y: auto;
        display: grid;
        align-content: start;
        gap: 10px;
        padding: 12px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.52);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .message-empty,
      .message-status {
        color: #cbd5e1;
        font-size: 15px;
        line-height: 1.45;
      }

      .message-status.error {
        color: #fecaca;
        font-weight: 800;
      }

      .message-bubble {
        max-width: 86%;
        padding: 11px 13px;
        border-radius: 16px;
        display: grid;
        gap: 5px;
        line-height: 1.35;
      }

      .message-user {
        justify-self: start;
        background: rgba(34, 197, 94, 0.18);
        border: 1px solid rgba(74, 222, 128, 0.28);
      }

      .message-caregiver {
        justify-self: end;
        background: rgba(37, 99, 235, 0.32);
        border: 1px solid rgba(96, 165, 250, 0.38);
      }

      .message-meta {
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 700;
      }

      .message-text {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 17px;
      }

      .message-audio-button {
        min-height: 44px;
        border-radius: 14px;
        padding: 8px 12px;
        background: rgba(15, 23, 42, 0.58);
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: #f8fafc;
        font-size: 16px;
        font-weight: 800;
        text-align: left;
      }

      .message-input {
        width: 100%;
        min-height: 110px;
        resize: vertical;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px;
        padding: 14px;
        box-sizing: border-box;
        background: rgba(15, 23, 42, 0.72);
        color: #f8fafc;
        font: inherit;
        font-size: 18px;
      }

      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @keyframes pulse {
        from { transform: scale(1); }
        to { transform: scale(1.02); }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>Alarme aidant</h1>
        <p>Garde cette page ouverte sur le téléphone de l'aidant. Appuie une fois sur “Activer le son”. Quand Ma Voix envoie une alerte, ce téléphone sonnera.</p>
      </section>

      <section class="card section-menu">
        <label for="sectionSelect">Menu aidant</label>
        <select id="sectionSelect" class="section-select">
          <option value="connexion">Connexion</option>
          <option value="configurer">Configurer</option>
          <option value="messages">Messages</option>
        </select>
      </section>

      <section id="connexionPanel" class="section-panel" data-section="connexion">
        <div class="card actions">
          <button id="connectionButton" class="connection-button disconnected" type="button">Non connecté</button>
          <section id="status" class="status">Connexion en attente...</section>
          <button id="stopAlarm" class="danger" type="button" disabled>Arrêter l'alarme</button>
          <div>
            <h2>Derniers messages non lus</h2>
            <div id="unreadList" class="unread-list">
              <div class="unread-empty">Aucun message non lu.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="configurerPanel" class="section-panel" data-section="configurer" hidden>
        <div class="card sound-settings">
          <h2>Configurer</h2>
          <div class="config-form">
            <label for="connectionLink">Lien de connexion</label>
            <input id="connectionLink" class="connection-link" type="text" readonly />
            <button id="copyLink" class="secondary" type="button">Copier le lien</button>
          </div>
          <h2>Son d'alarme</h2>
          <p>L'aidant peut importer un son depuis son téléphone. Le fichier reste enregistré localement sur ce téléphone.</p>
          <label class="file-label">
            Importer un son
            <input id="importSound" type="file" accept="audio/*" />
          </label>
          <div id="customSoundName" class="sound-name">Son actuel : alarme par défaut.</div>
          <button id="testSound" class="secondary" type="button">Tester le son</button>
          <button id="clearSound" class="secondary" type="button" disabled>Revenir au son par défaut</button>
        </div>
      </section>

      <section id="messagesPanel" class="section-panel" data-section="messages" hidden>
        <div class="card messages">
          <h2>Messages</h2>
          <p>Les messages envoyés depuis Ma Voix apparaissent ici. Réponds dans le champ ci-dessous pour que l'utilisateur les reçoive dans l'application.</p>
          <div id="messageList" class="message-list">
            <div class="message-empty">Aucun message pour le moment.</div>
          </div>
          <form id="messageForm" class="message-form">
            <textarea id="messageInput" class="message-input" placeholder="Répondre à l'utilisateur..." maxlength="600"></textarea>
            <button id="sendMessage" class="primary" type="submit">Envoyer le message</button>
          </form>
          <div id="messageStatus" class="message-status">Connexion aux messages en attente...</div>
        </div>
      </section>
    </main>

    <script>
      const params = new URLSearchParams(window.location.search);
      const channel = params.get("channel") || "";
      const sectionSelect = document.getElementById("sectionSelect");
      const sectionPanels = Array.from(document.querySelectorAll("[data-section]"));
      const connectionButton = document.getElementById("connectionButton");
      const statusElement = document.getElementById("status");
      const stopAlarmButton = document.getElementById("stopAlarm");
      const importSoundInput = document.getElementById("importSound");
      const customSoundNameElement = document.getElementById("customSoundName");
      const testSoundButton = document.getElementById("testSound");
      const clearSoundButton = document.getElementById("clearSound");
      const connectionLinkInput = document.getElementById("connectionLink");
      const copyLinkButton = document.getElementById("copyLink");
      const unreadListElement = document.getElementById("unreadList");
      const messageListElement = document.getElementById("messageList");
      const messageForm = document.getElementById("messageForm");
      const messageInput = document.getElementById("messageInput");
      const sendMessageButton = document.getElementById("sendMessage");
      const messageStatusElement = document.getElementById("messageStatus");

      let audioContext = null;
      let alarmInterval = null;
      let customAudio = null;
      let customAlarmUrl = "";
      let customAlarmName = "";
      let soundEnabled = false;
      let events = null;
      let messageEvents = null;
      let messageItems = [];
      let activeSection = "connexion";
      let alertConnected = false;
      let messagesConnected = false;
      let unreadMessageIds = new Set();
      const alarmDbName = "maVoixCaregiverAlarm";
      const alarmStoreName = "settings";
      const customSoundKey = "customSound";
      const defaultAlarmUrl = "/aidant-alarm-default.mp3";
      const defaultAlarmName = "0615.MP3";
      const readMessagesKey = "maVoixCaregiverReadMessages:" + (channel || "default");

      function setStatus(message, isAlert = false) {
        statusElement.textContent = message;
        statusElement.classList.toggle("alert", isAlert);
      }

      function setMessageStatus(message, isError = false) {
        messageStatusElement.textContent = message;
        messageStatusElement.classList.toggle("error", Boolean(isError));
      }

      function readStoredMessageIds() {
        try {
          const saved = window.localStorage.getItem(readMessagesKey);
          const ids = saved ? JSON.parse(saved) : [];
          return Array.isArray(ids) ? new Set(ids) : new Set();
        } catch {
          return new Set();
        }
      }

      let readMessageIds = readStoredMessageIds();

      function persistReadMessageIds() {
        try {
          window.localStorage.setItem(readMessagesKey, JSON.stringify(Array.from(readMessageIds).slice(-200)));
        } catch {}
      }

      function updateConnectionButton() {
        const isConnected = Boolean(alertConnected);
        connectionButton.classList.toggle("connected", isConnected);
        connectionButton.classList.toggle("disconnected", !isConnected);
        connectionButton.textContent = isConnected ? "Connecté" : "Non connecté";
      }

      function setAlertConnected(nextValue) {
        alertConnected = Boolean(nextValue);
        updateConnectionButton();
      }

      function setMessagesConnected(nextValue) {
        messagesConnected = Boolean(nextValue);
        updateConnectionButton();
      }

      function renderUnreadMessages() {
        unreadListElement.innerHTML = "";
        const unreadMessages = messageItems
          .filter((item) => item.senderRole !== "caregiver" && unreadMessageIds.has(item.id))
          .slice(-3)
          .reverse();

        if (unreadMessages.length === 0) {
          const empty = document.createElement("div");
          empty.className = "unread-empty";
          empty.textContent = "Aucun message non lu.";
          unreadListElement.appendChild(empty);
          return;
        }

        for (const item of unreadMessages) {
          const card = document.createElement("div");
          card.className = "unread-item";

          const meta = document.createElement("div");
          meta.className = "unread-meta";
          const time = formatMessageTime(item.createdAt);
          meta.textContent = time ? "Utilisateur - " + time : "Utilisateur";

          const text = document.createElement("div");
          text.className = "unread-text";
          text.textContent = getMessagePreview(item);

          card.appendChild(meta);
          card.appendChild(text);
          unreadListElement.appendChild(card);
        }
      }

      function markMessagesRead() {
        let changed = false;

        for (const item of messageItems) {
          if (item.senderRole === "caregiver" || !item.id) continue;
          if (!readMessageIds.has(item.id)) {
            readMessageIds.add(item.id);
            changed = true;
          }
          unreadMessageIds.delete(item.id);
        }

        if (changed) persistReadMessageIds();
        renderUnreadMessages();
      }

      function refreshUnreadMessagesFromHistory() {
        for (const item of messageItems) {
          if (item.senderRole === "caregiver" || !item.id) continue;
          if (!readMessageIds.has(item.id)) {
            unreadMessageIds.add(item.id);
          }
        }

        if (activeSection === "messages") {
          markMessagesRead();
          return;
        }

        renderUnreadMessages();
      }

      function setActiveSection(nextSection) {
        activeSection = nextSection || "connexion";
        sectionSelect.value = activeSection;

        for (const panel of sectionPanels) {
          panel.hidden = panel.dataset.section !== activeSection;
        }

        if (activeSection === "messages") {
          markMessagesRead();
        } else {
          renderUnreadMessages();
        }
      }

      function formatMessageTime(value) {
        try {
          return new Intl.DateTimeFormat("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(value));
        } catch {
          return "";
        }
      }

      function isAudioMessage(item) {
        return item && item.messageType === "audio";
      }

      function getMessagePreview(item) {
        if (isAudioMessage(item)) {
          return "Audio reçu";
        }

        return item && item.message ? item.message : "";
      }

      function playReceivedAudio(item) {
        const message = item && item.message ? String(item.message) : "";
        if (!message) {
          setMessageStatus("Aucun audio à lire.", true);
          return;
        }

        const SpeechSynthesisUtteranceConstructor = window.SpeechSynthesisUtterance;
        if (!window.speechSynthesis || !SpeechSynthesisUtteranceConstructor) {
          setMessageStatus("Lecture audio indisponible sur cet appareil.", true);
          return;
        }

        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtteranceConstructor(message);
          utterance.lang = "fr-FR";
          window.speechSynthesis.speak(utterance);
          setMessageStatus("Lecture de l'audio reçu.");
        } catch {
          setMessageStatus("Impossible de lire cet audio.", true);
        }
      }

      function renderMessages() {
        messageListElement.innerHTML = "";

        if (messageItems.length === 0) {
          const empty = document.createElement("div");
          empty.className = "message-empty";
          empty.textContent = "Aucun message pour le moment.";
          messageListElement.appendChild(empty);
          return;
        }

        for (const item of messageItems) {
          const bubble = document.createElement("div");
          bubble.className =
            "message-bubble " +
            (item.senderRole === "caregiver" ? "message-caregiver" : "message-user");

          const meta = document.createElement("div");
          meta.className = "message-meta";
          const sender =
            item.senderRole === "caregiver"
              ? item.senderName || "Aidant"
              : item.senderName || "Utilisateur";
          const time = formatMessageTime(item.createdAt);
          meta.textContent = time ? sender + " - " + time : sender;

          bubble.appendChild(meta);

          if (isAudioMessage(item)) {
            const audioButton = document.createElement("button");
            audioButton.type = "button";
            audioButton.className = "message-audio-button";
            audioButton.textContent =
              item.senderRole === "caregiver" ? "▶ Audio envoyé" : "▶ Audio reçu";
            audioButton.addEventListener("click", () => playReceivedAudio(item));
            bubble.appendChild(audioButton);
          } else {
            const text = document.createElement("div");
            text.className = "message-text";
            text.textContent = item.message || "";
            bubble.appendChild(text);
          }

          messageListElement.appendChild(bubble);
        }

        messageListElement.scrollTop = messageListElement.scrollHeight;
      }

      function upsertMessage(payload) {
        if (!payload || !payload.id) return;
        if (messageItems.some((item) => item.id === payload.id)) return;
        messageItems = messageItems.concat(payload).slice(-80);
        renderMessages();

        if (payload.senderRole !== "caregiver" && !readMessageIds.has(payload.id)) {
          if (activeSection === "messages") {
            readMessageIds.add(payload.id);
            persistReadMessageIds();
          } else {
            unreadMessageIds.add(payload.id);
          }
        }

        renderUnreadMessages();
      }

      async function ensureAudioContext() {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
          throw new Error("Audio non disponible sur ce téléphone.");
        }

        if (!audioContext || audioContext.state === "closed") {
          audioContext = new AudioContextConstructor();
        }

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
      }

      function updateCustomSoundUi() {
        if (customAlarmName) {
          customSoundNameElement.textContent = "Son actuel : " + customAlarmName;
          clearSoundButton.disabled = false;
          return;
        }

        customSoundNameElement.textContent = "Son actuel : " + defaultAlarmName + " par défaut.";
        clearSoundButton.disabled = true;
      }

      function openAlarmDb() {
        return new Promise((resolve, reject) => {
          if (!("indexedDB" in window)) {
            reject(new Error("Stockage audio indisponible sur ce téléphone."));
            return;
          }

          const request = indexedDB.open(alarmDbName, 1);
          request.onupgradeneeded = () => {
            request.result.createObjectStore(alarmStoreName);
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error("Impossible d'ouvrir le stockage audio."));
        });
      }

      async function readStoredSound() {
        const db = await openAlarmDb();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(alarmStoreName, "readonly");
          const request = transaction.objectStore(alarmStoreName).get(customSoundKey);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error || new Error("Impossible de lire le son."));
        });
      }

      async function saveStoredSound(file) {
        const db = await openAlarmDb();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(alarmStoreName, "readwrite");
          const record = {
            name: file.name || "son d'alarme",
            type: file.type || "audio/mpeg",
            blob: file,
            savedAt: new Date().toISOString()
          };
          const request = transaction.objectStore(alarmStoreName).put(record, customSoundKey);
          request.onsuccess = () => resolve(record);
          request.onerror = () => reject(request.error || new Error("Impossible d'enregistrer le son."));
        });
      }

      async function clearStoredSound() {
        const db = await openAlarmDb();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(alarmStoreName, "readwrite");
          const request = transaction.objectStore(alarmStoreName).delete(customSoundKey);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error || new Error("Impossible de supprimer le son."));
        });
      }

      function setCustomSound(record) {
        if (customAlarmUrl) {
          URL.revokeObjectURL(customAlarmUrl);
        }

        customAlarmUrl = "";
        customAlarmName = "";

        if (record && record.blob) {
          customAlarmUrl = URL.createObjectURL(record.blob);
          customAlarmName = record.name || "son importé";
        }

        updateCustomSoundUi();
      }

      async function loadStoredSound() {
        try {
          const record = await readStoredSound();
          setCustomSound(record);
        } catch (error) {
          updateCustomSoundUi();
        }
      }

      function stopCustomAudio() {
        if (!customAudio) return;

        try {
          customAudio.pause();
          customAudio.currentTime = 0;
        } catch {}

        customAudio = null;
      }

      async function playCustomAlarm(loop) {
        if (!customAlarmUrl) return false;

        stopCustomAudio();
        customAudio = new Audio(customAlarmUrl);
        customAudio.loop = Boolean(loop);
        customAudio.volume = 1;
        await customAudio.play();
        return true;
      }

      async function playDefaultAlarmMusic(loop) {
        if (!soundEnabled) return false;

        stopCustomAudio();
        customAudio = new Audio(defaultAlarmUrl);
        customAudio.loop = Boolean(loop);
        customAudio.volume = 1;
        await customAudio.play();
        return true;
      }

      async function playDefaultAlarmTone() {
        if (!soundEnabled) return;
        await ensureAudioContext();

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.linearRampToValueAtTime(1320, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.36, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };

        if (navigator.vibrate) {
          navigator.vibrate([280, 120, 280]);
        }
      }

      async function playMessageTone() {
        try {
          await ensureAudioContext();

          const now = audioContext.currentTime;
          const gain = audioContext.createGain();
          const firstTone = audioContext.createOscillator();
          const secondTone = audioContext.createOscillator();

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

          firstTone.type = "sine";
          firstTone.frequency.setValueAtTime(740, now);
          secondTone.type = "sine";
          secondTone.frequency.setValueAtTime(980, now + 0.13);

          firstTone.connect(gain);
          secondTone.connect(gain);
          gain.connect(audioContext.destination);
          firstTone.start(now);
          firstTone.stop(now + 0.16);
          secondTone.start(now + 0.13);
          secondTone.stop(now + 0.34);
          secondTone.onended = () => {
            firstTone.disconnect();
            secondTone.disconnect();
            gain.disconnect();
          };
        } catch {}

        if (navigator.vibrate) {
          navigator.vibrate([90]);
        }
      }

      async function requestMessageNotifications() {
        if (!("Notification" in window)) {
          return "unsupported";
        }

        if (Notification.permission === "default") {
          return Notification.requestPermission();
        }

        return Notification.permission;
      }

      function truncateNotificationText(value) {
        const text = String(value || "").replace(/\s+/g, " ").trim();
        return text.length > 140 ? text.slice(0, 137) + "..." : text;
      }

      async function showMessageNotification(payload) {
        if (!("Notification" in window) || Notification.permission !== "granted") {
          return;
        }

        const title = "Message de " + (payload.senderName || "l'utilisateur");
        const options = {
          body: truncateNotificationText(payload.message),
          icon: "/icon-192.png",
          tag: "ma-voix-aidant-message-" + (payload.channel || channel || "default"),
          renotify: true,
          data: { url: window.location.href },
        };

        try {
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
              await registration.showNotification(title, options);
              return;
            }
          }
        } catch {}

        try {
          new Notification(title, options);
        } catch {}
      }

      async function playAlarmOnce() {
        if (!soundEnabled && !customAlarmUrl) return;

        if (customAlarmUrl) {
          await playCustomAlarm(false);
          if (navigator.vibrate) {
            navigator.vibrate([280, 120, 280]);
          }
          return;
        }

        try {
          await playDefaultAlarmMusic(false);
        } catch (error) {
          await playDefaultAlarmTone();
        }
      }

      async function startAlarmSound() {
        if (customAlarmUrl) {
          await playCustomAlarm(true);
          if (navigator.vibrate) {
            navigator.vibrate([280, 120, 280]);
            alarmInterval = window.setInterval(() => {
              navigator.vibrate([280, 120, 280]);
            }, 1200);
          }
          return;
        }

        try {
          await playDefaultAlarmMusic(true);
          if (navigator.vibrate) {
            navigator.vibrate([280, 120, 280]);
            alarmInterval = window.setInterval(() => {
              navigator.vibrate([280, 120, 280]);
            }, 1200);
          }
          return;
        } catch (error) {
          await playDefaultAlarmTone();
          alarmInterval = window.setInterval(() => {
            void playDefaultAlarmTone();
          }, 850);
        }
      }

      function startAlarm(payload) {
        stopAlarm();
        const name = payload && payload.profileName ? " de " + payload.profileName : "";
        setStatus("Alerte reçue" + name + " : besoin d'aide.", true);
        stopAlarmButton.disabled = false;

        void startAlarmSound().catch((error) => {
          setStatus(error && error.message ? error.message : "Impossible de jouer le son d'alarme.", true);
        });
      }

      function stopAlarm() {
        if (alarmInterval) {
          window.clearInterval(alarmInterval);
          alarmInterval = null;
        }

        stopCustomAudio();

        if (navigator.vibrate) {
          navigator.vibrate(0);
        }

        stopAlarmButton.disabled = true;
        statusElement.classList.remove("alert");
      }

      function connect() {
        if (!channel) {
          setAlertConnected(false);
          setStatus("Lien incomplet : canal d'alerte manquant.");
          return;
        }

        if (events) {
          events.close();
        }

        events = new EventSource("/api/caregiver-alert/stream?channel=" + encodeURIComponent(channel));
        setStatus("Connexion au canal d'alerte...");

        events.addEventListener("connected", () => {
          setAlertConnected(true);
          setStatus(soundEnabled ? "Prêt : le téléphone sonnera à la prochaine alerte." : "Connecté. Appuie sur “Activer le son”.");
        });

        events.addEventListener("caregiver-alert", (event) => {
          let payload = {};
          try {
            payload = JSON.parse(event.data || "{}");
          } catch {}

          if (!soundEnabled) {
            setStatus("Alerte reçue, mais le son n'est pas encore activé.", true);
            return;
          }

          startAlarm(payload);
        });

        events.onerror = () => {
          setAlertConnected(false);
          setStatus("Connexion interrompue. Reconnexion en cours...");
        };
      }

      function connectMessages() {
        if (!channel) {
          setMessagesConnected(false);
          setMessageStatus("Lien incomplet : canal de messages manquant.", true);
          return;
        }

        if (messageEvents) {
          messageEvents.close();
        }

        messageEvents = new EventSource(
          "/api/caregiver-messages/stream?channel=" +
            encodeURIComponent(channel) +
            "&role=caregiver"
        );
        setMessageStatus("Connexion aux messages...");

        messageEvents.addEventListener("connected", () => {
          setMessagesConnected(true);
          setMessageStatus("Connecté aux messages.");
        });

        messageEvents.addEventListener("caregiver-message-history", (event) => {
          try {
            const payload = JSON.parse(event.data || "{}");
            messageItems = Array.isArray(payload.messages)
              ? payload.messages.slice(-80)
              : [];
            renderMessages();
            refreshUnreadMessagesFromHistory();
          } catch {}
        });

        messageEvents.addEventListener("caregiver-message", (event) => {
          try {
            const payload = JSON.parse(event.data || "{}");
            const alreadyExists = messageItems.some((item) => item.id === payload.id);
            upsertMessage(payload);
            if (!alreadyExists && payload.senderRole !== "caregiver") {
              void playMessageTone();
              void showMessageNotification(payload);
            }
            setMessageStatus("Nouveau message reçu.");
          } catch {}
        });

        messageEvents.onerror = () => {
          setMessagesConnected(false);
          setMessageStatus("Connexion messages interrompue. Reconnexion en cours...", true);
        };
      }

      connectionButton.addEventListener("click", async () => {
        try {
          void requestMessageNotifications();
          soundEnabled = true;
          if (!customAlarmUrl) {
            await ensureAudioContext();
          }
          await playAlarmOnce();
          connect();
          connectMessages();
          setStatus("Prêt : le téléphone sonnera à la prochaine alerte.");
        } catch (error) {
          setStatus(error && error.message ? error.message : "Impossible d'activer le son.");
        }
      });

      stopAlarmButton.addEventListener("click", () => {
        stopAlarm();
        setStatus("Alarme arrêtée. Le téléphone reste connecté.");
      });

      importSoundInput.addEventListener("change", async () => {
        const file = importSoundInput.files && importSoundInput.files[0];
        if (!file) return;

        if (!file.type || !file.type.startsWith("audio/")) {
          setStatus("Choisis un fichier audio.");
          importSoundInput.value = "";
          return;
        }

        try {
          const record = await saveStoredSound(file);
          setCustomSound(record);
          setStatus("Son importé sur ce téléphone : " + customAlarmName + ".");
          if (soundEnabled) {
            await playAlarmOnce();
          }
        } catch (error) {
          setStatus(error && error.message ? error.message : "Impossible d'importer ce son.");
        } finally {
          importSoundInput.value = "";
        }
      });

      testSoundButton.addEventListener("click", async () => {
        try {
          soundEnabled = true;
          if (!customAlarmUrl) {
            await ensureAudioContext();
          }
          await playAlarmOnce();
          setStatus("Test du son envoyé.");
        } catch (error) {
          setStatus(error && error.message ? error.message : "Impossible de tester le son.");
        }
      });

      clearSoundButton.addEventListener("click", async () => {
        try {
          stopAlarm();
          await clearStoredSound();
          setCustomSound(null);
          setStatus("Son par défaut réactivé.");
        } catch (error) {
          setStatus(error && error.message ? error.message : "Impossible de supprimer le son importé.");
        }
      });

      messageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = (messageInput.value || "").trim();

        if (!message) {
          setMessageStatus("Écris un message avant l'envoi.", true);
          return;
        }

        sendMessageButton.disabled = true;

        try {
          const response = await fetch("/api/caregiver-messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel,
              senderRole: "caregiver",
              senderName: "Aidant",
              message,
            }),
          });
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.details || data.error || "Impossible d'envoyer le message.");
          }

          upsertMessage(data.message);
          messageInput.value = "";
          setMessageStatus("Message envoyé.");
        } catch (error) {
          setMessageStatus(
            error && error.message ? error.message : "Impossible d'envoyer le message.",
            true
          );
        } finally {
          sendMessageButton.disabled = false;
        }
      });

      sectionSelect.addEventListener("change", (event) => {
        setActiveSection(event.target.value);
      });

      connectionLinkInput.value = window.location.href;
      copyLinkButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(connectionLinkInput.value);
          setStatus("Lien de connexion copié.");
        } catch {
          window.prompt("Lien de connexion", connectionLinkInput.value);
        }
      });

      updateCustomSoundUi();
      updateConnectionButton();
      renderUnreadMessages();
      setActiveSection("connexion");
      void loadStoredSound();
      connect();
      connectMessages();
    </script>
  </body>
</html>`;
}

function isMobileRequest(req) {
  const ua = req.get("user-agent") || "";
  const clientHintMobile = req.get("sec-ch-ua-mobile") === "?1";
  return (
    clientHintMobile ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  );
}

function getClientBuildDir(req) {
  if (isMobileRequest(req) && fs.existsSync(ANDROID_BUILD_DIR)) {
    return ANDROID_BUILD_DIR;
  }

  return DESKTOP_BUILD_DIR;
}

function serveClientBuild(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  if (req.path.startsWith("/api/")) {
    next();
    return;
  }

  const buildDir = getClientBuildDir(req);
  if (!fs.existsSync(buildDir)) {
    next();
    return;
  }

  express.static(buildDir, { index: false })(req, res, (staticError) => {
    if (staticError) {
      next(staticError);
      return;
    }

    const indexPath = path.join(buildDir, "index.html");
    if (fs.existsSync(indexPath) && req.accepts("html")) {
      res.sendFile(indexPath);
      return;
    }

    next();
  });
}

app.get("/aidant-alerte", (_req, res) => {
  res.type("html").send(getCaregiverAlertPageHtml());
});

app.get("/aidant-alarm-default.mp3", (_req, res, next) => {
  if (!fs.existsSync(DEFAULT_ALARM_AUDIO_FILE)) {
    next();
    return;
  }

  res.type("audio/mpeg").sendFile(DEFAULT_ALARM_AUDIO_FILE);
});

app.get("/api/caregiver-alert/stream", (req, res) => {
  const channel = sanitizeAlertChannel(req.query?.channel);

  if (!channel) {
    res.status(400).json({
      error: "Canal invalide",
      details: "Le lien d'alerte aidant est incomplet ou invalide.",
    });
    return;
  }

  res.set({
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write("event: connected\ndata: {}\n\n");

  const client = {
    id: randomUUID(),
    res,
    keepAlive: setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 25000),
  };

  getCaregiverAlertClients(channel).add(client);

  req.on("close", () => {
    clearInterval(client.keepAlive);
    removeCaregiverAlertClient(channel, client);
  });
});

app.get("/api/caregiver-messages/stream", (req, res) => {
  const channel = sanitizeAlertChannel(req.query?.channel);
  const role = sanitizeMessageRole(req.query?.role);

  if (!channel) {
    res.status(400).json({
      error: "Canal invalide",
      details: "Le lien de conversation aidant est incomplet ou invalide.",
    });
    return;
  }

  res.set({
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const client = {
    id: randomUUID(),
    role,
    res,
    keepAlive: setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 25000),
  };

  getCaregiverMessageClients(channel).add(client);

  writeSseEvent(client, "connected", {
    role,
    connectedCaregivers: countCaregiverMessageClients(channel, "caregiver"),
  });
  writeSseEvent(client, "caregiver-message-history", {
    messages: getCaregiverMessageHistory(channel),
  });
  broadcastCaregiverPresence(channel);

  req.on("close", () => {
    clearInterval(client.keepAlive);
    removeCaregiverMessageClient(channel, client);
    broadcastCaregiverPresence(channel);
  });
});

app.post("/api/caregiver-alert", (req, res) => {
  const channel = sanitizeAlertChannel(req.body?.channel);

  if (!channel) {
    res.status(400).json({
      error: "Canal invalide",
      details: "Aucun téléphone aidant n'est associé à cette app.",
    });
    return;
  }

  const payload = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    profileName: sanitizeText(req.body?.profileName, 80),
    message:
      sanitizeText(req.body?.message, 180) ||
      "J'ai besoin de mon aidant.",
  };
  const deliveredTo = broadcastCaregiverAlert(channel, payload);

  res.json({
    success: true,
    deliveredTo,
  });
});

app.post("/api/caregiver-messages", (req, res) => {
  const channel = sanitizeAlertChannel(req.body?.channel);

  if (!channel) {
    res.status(400).json({
      error: "Canal invalide",
      details: "Aucun aidant n'est associé à cette conversation.",
    });
    return;
  }

  const messageType = sanitizeMessageType(req.body?.messageType);
  const messageText = sanitizeText(req.body?.message, 600);

  if (!messageText) {
    res.status(400).json({
      error: "Message vide",
      details:
        messageType === "audio"
          ? "Écris un message avant d'envoyer l'audio."
          : "Écris un message avant l'envoi.",
    });
    return;
  }

  const senderRole = sanitizeMessageRole(req.body?.senderRole);
  const payload = {
    id: randomUUID(),
    channel,
    createdAt: new Date().toISOString(),
    senderRole,
    senderName: sanitizeText(req.body?.senderName, 80),
    message: messageText,
    messageType,
  };
  const recipientRole = senderRole === "caregiver" ? "user" : "caregiver";

  saveCaregiverMessage(channel, payload);
  const deliveredTo = broadcastCaregiverMessage(
    channel,
    payload,
    recipientRole
  );

  res.json({
    success: true,
    deliveredTo,
    connectedCaregivers: countCaregiverMessageClients(channel, "caregiver"),
    message: payload,
  });
});

app.use(serveClientBuild);

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});

