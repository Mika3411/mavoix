import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../services/config";
import type { AIUsage } from "../types";

const DEFAULT_AI_USAGE: AIUsage = {
  creditsRemaining: 0,
  globalCreditsRemaining: 0,
  blocked: false,
  donorWall: [],
  euroToCreditsRate: 1000,
  availableSource: "shared",
};

export default function useAI({ currentProfileId, text, mode = "realtime_correction_and_prediction", onBlocked }: { currentProfileId: string; text: string; mode?: string; onBlocked?: () => void; }) {
  const [aiGeneratedText, setAiGeneratedText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiUsage, setAiUsage] = useState<AIUsage>(DEFAULT_AI_USAGE);
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  const [creditsPurchaseLoading, setCreditsPurchaseLoading] = useState("");
  const [creditsMessage, setCreditsMessage] = useState("");

  const refreshAiUsage = useCallback(async (profileId = currentProfileId) => {
    if (!profileId) return;

    try {
      setAiStatusLoading(true);
      const response = await fetch(
        `${API_BASE}/api/ai/status?profileId=${encodeURIComponent(profileId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de récupérer le compteur IA.");
      }

      setAiUsage(data);
    } catch (error) {
      console.error(error);
      setAiError((prev) => prev || "Impossible de récupérer le compteur IA.");
    } finally {
      setAiStatusLoading(false);
    }
  }, [currentProfileId]);

  useEffect(() => {
    refreshAiUsage();
  }, [refreshAiUsage]);

  const generateTextWithAI = useCallback(async () => {
    try {
      if (!text.trim()) {
        setAiError("Écris quelques mots d\'abord.");
        setAiGeneratedText("");
        return "";
      }

      if (aiUsage.blocked) {
        setAiError(
          "Vos essais gratuits du jour sont épuisés. Achetez des crédits pour continuer."
        );
        onBlocked?.();
        return "";
      }

      setAiLoading(true);
      setAiError("");
      setAiGeneratedText("");
      setCreditsMessage("");

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: currentProfileId,
          text,
          keywords: text,
          mode,
          realtime: true,
          task: "correct_and_predict",
          instruction:
            "Corrige les mots déjà écrits, garde le sens voulu, puis propose naturellement la suite la plus probable de la phrase en temps réel.",
        }),
      });

      const data = await response.json();

      if (data.usage) {
        setAiUsage(data.usage);
      }

      if (!response.ok) {
        if (response.status === 403) {
          onBlocked?.();
        }
        throw new Error(data.error || "Erreur pendant la génération.");
      }

      if (data.message) {
        setAiGeneratedText(data.message);
        return data.message;
      } else {
        setAiError("Aucune phrase générée.");
        return "";
      }
    } catch (error) {
      setAiError(error.message || "Erreur pendant la génération.");
      setAiGeneratedText("");
      return "";
    } finally {
      setAiLoading(false);
    }
  }, [aiUsage.blocked, currentProfileId, mode, onBlocked, text]);

  const handleGenerateButtonClick = useCallback(() => {
    if (aiUsage.blocked) {
      onBlocked?.();
      setAiError(
        "Vos essais gratuits du jour sont épuisés. Achetez des crédits pour continuer."
      );
      return;
    }

    return generateTextWithAI();
  }, [aiUsage.blocked, generateTextWithAI, onBlocked]);

  const purchaseCredits = useCallback(async (packId: string) => {
    try {
      setCreditsPurchaseLoading(packId);
      setCreditsMessage("");

      const response = await fetch(`${API_BASE}/api/ai/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: currentProfileId,
          packId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'ajouter les crédits.");
      }

      setAiUsage(data.usage);
      setCreditsMessage(
        `Pack ${data.purchasedPack.credits} crédits ajouté au profil.`
      );
    } catch (error) {
      setCreditsMessage(error.message || "Impossible d'ajouter les crédits.");
    } finally {
      setCreditsPurchaseLoading("");
    }
  }, [currentProfileId]);

  return {
    aiGeneratedText,
    setAiGeneratedText,
    aiLoading,
    aiError,
    setAiError,
    aiUsage,
    setAiUsage,
    aiStatusLoading,
    refreshAiUsage,
    creditsPurchaseLoading,
    creditsMessage,
    setCreditsMessage,
    generateTextWithAI,
    handleGenerateButtonClick,
    purchaseCredits,
  };
}
