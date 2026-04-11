require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const hasSupabaseConfig =
  Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = hasSupabaseConfig
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const CREDITS_PER_EURO = 1000;
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || "").trim();

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeText(value, maxLength = 140) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function buildUsagePayload(credits, donorWall) {
  return {
    creditsRemaining: credits,
    globalCreditsRemaining: credits,
    donorWall,
  };
}

async function getAppState() {
  if (!supabase) {
    return { credits: 0, donorWall: [] };
  }

  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("credits, donor_wall")
      .eq("id", "global")
      .maybeSingle();

    if (error) {
      console.error("[getAppState] Supabase error:", error);
      return { credits: 0, donorWall: [] };
    }

    return {
      credits: Number(data?.credits || 0),
      donorWall: Array.isArray(data?.donor_wall) ? data.donor_wall : [],
    };
  } catch (error) {
    console.error("[getAppState] Unexpected error:", error);
    return { credits: 0, donorWall: [] };
  }
}

async function saveAppState(credits, donorWall) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from("app_state").upsert({
      id: "global",
      credits,
      donor_wall: donorWall,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[saveAppState] Supabase error:", error);
    }
  } catch (error) {
    console.error("[saveAppState] Unexpected error:", error);
  }
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

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    hasSupabaseConfig,
    hasAdminToken: Boolean(ADMIN_TOKEN),
  });
});

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

    const state = await getAppState();
    const updatedCredits = state.credits + Math.round(creditsToAdd);
    const updatedDonorWall = Array.isArray(state.donorWall) ? [...state.donorWall] : [];

    if (label) {
      updatedDonorWall.unshift({
        id: `manual-${Date.now()}`,
        donorName: "Admin",
        amountEuro: null,
        creditsAdded: Math.round(creditsToAdd),
        message: label,
        createdAt: new Date().toISOString(),
      });
    }

    await saveAppState(updatedCredits, updatedDonorWall.slice(0, 100));

    res.json({
      success: true,
      message: "Crédits ajoutés.",
      usage: buildUsagePayload(updatedCredits, updatedDonorWall.slice(0, 100)),
    });
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      details: getErrorMessage(error, "Impossible d'ajouter les crédits."),
    });
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
    const state = await getAppState();
    const updatedCredits = state.credits + creditsAdded;
    const updatedDonorWall = [
      {
        id: `don-${Date.now()}`,
        donorName,
        amountEuro,
        creditsAdded,
        message:
          note ||
          `Merci à ${donorName} pour son don de ${amountEuro.toLocaleString("fr-FR")}€`,
        createdAt: new Date().toISOString(),
      },
      ...(Array.isArray(state.donorWall) ? state.donorWall : []),
    ].slice(0, 100);

    await saveAppState(updatedCredits, updatedDonorWall);

    res.json({
      success: true,
      message: "Don ajouté.",
      usage: buildUsagePayload(updatedCredits, updatedDonorWall),
    });
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      details: getErrorMessage(error, "Impossible d'ajouter le don."),
    });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Erreur serveur",
        details: "OPENAI_API_KEY manquante sur le serveur.",
      });
    }

    const { prompt, keywords, text } = req.body || {};
    const state = await getAppState();
    let credits = state.credits;
    const donorWall = state.donorWall;

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

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input,
      temperature: 0,
    });

    const textOutput = (response.output_text || "").trim();

    if (credits > 0) {
      credits -= 1;
      await saveAppState(credits, donorWall);
    }

    res.json({
      text: textOutput,
      message: textOutput,
      usage: buildUsagePayload(credits, donorWall),
    });
  } catch (error) {
    console.error("[/api/generate] error:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: getErrorMessage(error, "Erreur inconnue"),
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});
