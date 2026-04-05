require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

let credits = 0;
let donorWall = [];

app.get("/", (req, res) => {
  res.send("Backend Mavoix en ligne");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    hasAdminToken: Boolean(process.env.ADMIN_TOKEN),
  });
});

app.get("/api/ai/status", (req, res) => {
  res.json({
    creditsRemaining: credits,
    globalCreditsRemaining: credits,
    donorWall,
  });
});

app.post("/api/admin/add-donation", (req, res) => {
  const token = req.headers["x-admin-token"];

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès admin refusé." });
  }

  const { donorName, amountEuro, note } = req.body || {};
  const amount = Number(amountEuro);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Montant invalide." });
  }

  const addedCredits = Math.round(amount * 1000);
  credits += addedCredits;

  const cleanName =
    typeof donorName === "string" && donorName.trim()
      ? donorName.trim()
      : "Donateur anonyme";

  const message =
    typeof note === "string" && note.trim()
      ? note.trim()
      : `Merci à ${cleanName} pour son don de ${amount.toLocaleString("fr-FR")}€`;

  donorWall.unshift({
    id: `don-${Date.now()}`,
    name: cleanName,
    amountEuro: amount,
    addedCredits,
    message,
    createdAt: new Date().toISOString(),
  });

  return res.json({
    success: true,
    addedCredits,
    donorWall,
    creditsRemaining: credits,
  });
});

app.post("/api/admin/add-credits", (req, res) => {
  const token = req.headers["x-admin-token"];

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès admin refusé." });
  }

  const { creditsToAdd, label } = req.body || {};
  const amount = Math.round(Number(creditsToAdd));

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Nombre de crédits invalide." });
  }

  credits += amount;

  if (typeof label === "string" && label.trim()) {
    donorWall.unshift({
      id: `manual-${Date.now()}`,
      name: "Ajout manuel",
      amountEuro: null,
      addedCredits: amount,
      message: label.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  return res.json({
    success: true,
    addedCredits: amount,
    donorWall,
    creditsRemaining: credits,
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, keywords, tone, audience } = req.body || {};

    const input =
      typeof prompt === "string" && prompt.trim()
        ? prompt.trim()
        : `Transforme en une phrase courte, naturelle et claire en français : ${keywords || ""}.
Ton : ${tone || "naturel"}.
Destinataire : ${audience || "général"}.`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input,
    });

    const text = response.output_text || "";

    if (credits > 0) {
      credits -= 1;
    }

    res.json({
      text,
      message: text,
      usage: {
        creditsRemaining: credits,
        globalCreditsRemaining: credits,
        donorWall,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: "Erreur serveur",
      details: e?.message || "Erreur inconnue",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});
