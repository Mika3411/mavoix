require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

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
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CREDITS_PER_EURO = 1000;
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || "").trim();
const MISSING_RPC_HINT =
  "Les migrations Supabase RPC ne sont pas appliquées. Applique les fichiers dans supabase/migrations avant de déployer ce backend.";
const DESKTOP_BUILD_DIR = path.join(__dirname, "build");
const ANDROID_BUILD_DIR = process.env.ANDROID_BUILD_DIR
  ? path.resolve(process.env.ANDROID_BUILD_DIR)
  : path.resolve(__dirname, "..", "ma-voix-android", "build");
const DEFAULT_ALARM_AUDIO_FILE = path.join(
  __dirname,
  "public",
  "aidant-alarm-default.mp3"
);

async function getAppState() {
  const { data, error } = await supabase
    .from("app_state")
    .select("credits, donor_wall")
    .eq("id", "global")
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return {
    credits: Number(data?.credits || 0),
    donorWall: Array.isArray(data?.donor_wall) ? data.donor_wall : [],
  };
}

function normalizeAppStateRow(row) {
  return {
    reserved: Boolean(row?.reserved),
    credits: Number(row?.credits || 0),
    donorWall: Array.isArray(row?.donor_wall) ? row.donor_wall : [],
  };
}

function normalizeRpcRow(data) {
  return normalizeAppStateRow(Array.isArray(data) ? data[0] : data);
}

async function reserveAiCredit() {
  const { data, error } = await supabase.rpc("reserve_global_ai_credit");

  if (error) {
    throw error;
  }

  return normalizeRpcRow(data);
}

async function refundAiCredit() {
  const { data, error } = await supabase.rpc("refund_global_ai_credit");

  if (error) {
    throw error;
  }

  return normalizeRpcRow(data);
}

async function addAiCredits(creditsToAdd, donorEntry = null) {
  const { data, error } = await supabase.rpc("add_global_ai_credits", {
    p_credits_to_add: creditsToAdd,
    p_donor_entry: donorEntry,
  });

  if (error) {
    throw error;
  }

  return normalizeRpcRow(data);
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function isMissingSupabaseRpc(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error?.details || "");

  return (
    code === "42883" ||
    /function .* does not exist/i.test(message) ||
    /could not find the function/i.test(message)
  );
}

function sendServerError(res, error, fallback) {
  if (isMissingSupabaseRpc(error)) {
    return res.status(503).json({
      error: "Migration Supabase manquante",
      details: MISSING_RPC_HINT,
    });
  }

  return res.status(500).json({
    error: "Erreur serveur",
    details: getErrorMessage(error, fallback),
  });
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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

  return caregiverMessageHistory.get(channel);
}

function saveCaregiverMessage(channel, payload) {
  const history = getCaregiverMessageHistory(channel);
  history.push(payload);
  if (history.length > CAREGIVER_MESSAGE_HISTORY_LIMIT) {
    history.splice(0, history.length - CAREGIVER_MESSAGE_HISTORY_LIMIT);
  }
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

function getCaregiverAlertPageHtml() {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ma Voix - Alerte auxiliaire</title>
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

      @keyframes pulse {
        from { transform: scale(1); }
        to { transform: scale(1.02); }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>Alarme auxiliaire</h1>
        <p>Garde cette page ouverte sur le téléphone de l'auxiliaire. Appuie une fois sur “Activer le son”. Quand Ma Voix envoie une alerte, ce téléphone sonnera.</p>
      </section>

      <section id="status" class="card status">Connexion en attente...</section>

      <section class="actions">
        <button id="enableSound" class="primary" type="button">Activer le son</button>
        <button id="stopAlarm" class="danger" type="button" disabled>Arrêter l'alarme</button>
        <button id="reconnect" class="secondary" type="button">Reconnecter</button>
      </section>

      <section class="card sound-settings">
        <h2>Son d'alarme</h2>
        <p>L'auxiliaire peut importer un son depuis son téléphone. Le fichier reste enregistré localement sur ce téléphone.</p>
        <label class="file-label">
          Importer un son
          <input id="importSound" type="file" accept="audio/*" />
        </label>
        <div id="customSoundName" class="sound-name">Son actuel : alarme par défaut.</div>
        <button id="testSound" class="secondary" type="button">Tester le son</button>
        <button id="clearSound" class="secondary" type="button" disabled>Revenir au son par défaut</button>
      </section>
    </main>

    <script>
      const params = new URLSearchParams(window.location.search);
      const channel = params.get("channel") || "";
      const statusElement = document.getElementById("status");
      const enableSoundButton = document.getElementById("enableSound");
      const stopAlarmButton = document.getElementById("stopAlarm");
      const reconnectButton = document.getElementById("reconnect");
      const importSoundInput = document.getElementById("importSound");
      const customSoundNameElement = document.getElementById("customSoundName");
      const testSoundButton = document.getElementById("testSound");
      const clearSoundButton = document.getElementById("clearSound");

      let audioContext = null;
      let alarmInterval = null;
      let customAudio = null;
      let customAlarmUrl = "";
      let customAlarmName = "";
      let soundEnabled = false;
      let events = null;
      const alarmDbName = "maVoixCaregiverAlarm";
      const alarmStoreName = "settings";
      const customSoundKey = "customSound";
      const defaultAlarmUrl = "/aidant-alarm-default.mp3";
      const defaultAlarmName = "0615.MP3";

      function setStatus(message, isAlert = false) {
        statusElement.textContent = message;
        statusElement.classList.toggle("alert", isAlert);
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
          setStatus("Lien incomplet : canal d'alerte manquant.");
          return;
        }

        if (events) {
          events.close();
        }

        events = new EventSource("/api/caregiver-alert/stream?channel=" + encodeURIComponent(channel));
        setStatus("Connexion au canal d'alerte...");

        events.addEventListener("connected", () => {
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
          setStatus("Connexion interrompue. Reconnexion en cours...");
        };
      }

      enableSoundButton.addEventListener("click", async () => {
        try {
          soundEnabled = true;
          if (!customAlarmUrl) {
            await ensureAudioContext();
          }
          await playAlarmOnce();
          setStatus("Prêt : le téléphone sonnera à la prochaine alerte.");
          enableSoundButton.textContent = "Son activé";
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
          enableSoundButton.textContent = "Son activé";
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

      reconnectButton.addEventListener("click", connect);
      updateCustomSoundUi();
      void loadStoredSound();
      connect();
    </script>
  </body>
</html>`;
}

function requireAdmin(req, res) {
  if (!ADMIN_TOKEN) {
    res.status(503).json({
      error: "Admin désactivé",
      details: "La variable ADMIN_TOKEN n'est pas configurée sur le serveur.",
    });
    return false;
  }

  const receivedToken = String(req.headers["x-admin-token"] || "").trim();

  if (!receivedToken || receivedToken !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Accès refusé" });
    return false;
  }

  return true;
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

function buildUsagePayload(credits, donorWall) {
  return {
    creditsRemaining: credits,
    globalCreditsRemaining: credits,
    blocked: credits <= 0,
    donorWall,
    euroToCreditsRate: CREDITS_PER_EURO,
    availableSource: "shared",
  };
}

app.get("/api/app-state", async (_req, res) => {
  try {
    const state = await getAppState();
    res.json({ usage: buildUsagePayload(state.credits, state.donorWall) });
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      details: getErrorMessage(error, "Impossible de récupérer l'état de l'application."),
    });
  }
});

app.get("/api/ai/status", async (_req, res) => {
  try {
    const state = await getAppState();
    res.json({ usage: buildUsagePayload(state.credits, state.donorWall) });
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      details: getErrorMessage(error, "Impossible de récupérer le compteur IA."),
    });
  }
});

app.post("/api/admin/add-credits", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const creditsToAdd = parsePositiveNumber(req.body?.creditsToAdd);
    const label = sanitizeText(req.body?.label, 220);

    if (!creditsToAdd) {
      return res.status(400).json({
        error: "Montant invalide",
        details: "Le nombre de crédits à ajouter doit être supérieur à 0.",
      });
    }

    const roundedCredits = Math.round(creditsToAdd);
    const donorEntry = label
      ? {
          id: `manual-${randomUUID()}`,
          donorName: "Admin",
          amountEuro: null,
          creditsAdded: roundedCredits,
          message: label,
          createdAt: new Date().toISOString(),
        }
      : null;

    const updatedState = await addAiCredits(roundedCredits, donorEntry);

    res.json({
      success: true,
      message: "Crédits ajoutés.",
      usage: buildUsagePayload(updatedState.credits, updatedState.donorWall),
    });
  } catch (error) {
    sendServerError(res, error, "Impossible d'ajouter les crédits.");
  }
});

app.post("/api/admin/add-donation", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const donorName = sanitizeText(req.body?.donorName, 80) || "Don anonyme";
    const amountEuro = parsePositiveNumber(req.body?.amountEuro);
    const note = sanitizeText(req.body?.note, 220);

    if (!amountEuro) {
      return res.status(400).json({
        error: "Montant invalide",
        details: "Le montant du don doit être supérieur à 0.",
      });
    }

    const creditsAdded = Math.round(amountEuro * CREDITS_PER_EURO);
    const donorEntry = {
      id: `don-${randomUUID()}`,
      donorName,
      amountEuro,
      creditsAdded,
      message:
        note ||
        `Merci à ${donorName} pour son don de ${amountEuro.toLocaleString("fr-FR")}€`,
      createdAt: new Date().toISOString(),
    };

    const updatedState = await addAiCredits(creditsAdded, donorEntry);

    res.json({
      success: true,
      message: "Don ajouté.",
      usage: buildUsagePayload(updatedState.credits, updatedState.donorWall),
    });
  } catch (error) {
    sendServerError(res, error, "Impossible d'ajouter le don.");
  }
});

app.post("/api/ai/purchase", (_req, res) => {
  res.status(410).json({
    error: "Achat direct désactivé",
    details:
      "Les crédits sont ajoutés dans la zone admin après réception d'un don.",
  });
});

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
      details: "Le lien d'alerte auxiliaire est incomplet ou invalide.",
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
      details: "Aucun téléphone auxiliaire n'est associé à cette app.",
    });
    return;
  }

  const payload = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    profileName: sanitizeText(req.body?.profileName, 80),
    message:
      sanitizeText(req.body?.message, 180) ||
      "J'ai besoin de mon auxiliaire de vie.",
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

  const messageText = sanitizeText(req.body?.message, 600);

  if (!messageText) {
    res.status(400).json({
      error: "Message vide",
      details: "Écris un message avant l'envoi.",
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

app.post("/api/generate", async (req, res) => {
  let creditReserved = false;

  try {
    const { prompt, keywords, text } = req.body || {};

    const sourceText =
      typeof text === "string" && text.trim()
        ? text.trim()
        : typeof keywords === "string" && keywords.trim()
        ? keywords.trim()
        : "";

    const input =
      typeof prompt === "string" && prompt.trim()
        ? prompt.trim()
        : `Corrige uniquement le texte suivant en français.
Améliore l’orthographe, la grammaire, la ponctuation et la casse.
Ne complète pas la phrase.
N’ajoute aucun mot.
N’invente pas de suite.
Conserve exactement l’intention du texte saisi.
Réponds uniquement avec le texte corrigé, sans guillemets.

Texte : ${sourceText}`;

    const creditState = await reserveAiCredit();
    creditReserved = creditState.reserved;

    if (!creditReserved) {
      return res.status(403).json({
        error: "Crédits épuisés",
        details:
          "La réserve commune de crédits IA est vide. Ajoutez des crédits pour continuer.",
        usage: buildUsagePayload(creditState.credits, creditState.donorWall),
      });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input,
      temperature: 0,
    });

    const textOutput = (response.output_text || "").trim();

    res.json({
      text: textOutput,
      message: textOutput,
      usage: buildUsagePayload(creditState.credits, creditState.donorWall),
    });
  } catch (error) {
    if (creditReserved) {
      try {
        await refundAiCredit();
      } catch (refundError) {
        console.error("Impossible de rembourser le crédit IA :", refundError);
      }
    }

    sendServerError(res, error, "Erreur inconnue");
  }
});

app.use(serveClientBuild);

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});
