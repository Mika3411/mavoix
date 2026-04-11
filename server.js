require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAppState() {
  const { data } = await supabase
    .from("app_state")
    .select("credits, donor_wall")
    .eq("id", "global")
    .single();

  return {
    credits: Number(data?.credits || 0),
    donorWall: Array.isArray(data?.donor_wall) ? data.donor_wall : [],
  };
}

async function saveAppState(credits, donorWall) {
  await supabase.from("app_state").upsert({
    id: "global",
    credits,
    donor_wall: donorWall,
    updated_at: new Date().toISOString(),
  });
}

app.post("/api/generate", async (req, res) => {
  try {
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
