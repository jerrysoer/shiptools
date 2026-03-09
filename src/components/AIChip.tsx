"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import ModelPicker from "@/components/ai/ModelPicker";

interface AIChipProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const LS_MODEL_CHOSEN_KEY = "ul_ai_model_chosen";

/**
 * Small "Sparkles Local AI" chip for tools that support AI enhancement.
 * Click triggers model load if not ready, then calls onClick.
 * Shows ModelPicker modal on first use if no model has been chosen.
 */
export default function AIChip({ label, onClick, disabled }: AIChipProps) {
  const { isReady, isSupported, status, loadModel } = useLocalAI();
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  if (!isSupported) return null;

  async function handleClick() {
    if (disabled) return;

    // First-time: show model picker if user hasn't chosen yet
    const hasChosen =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(LS_MODEL_CHOSEN_KEY) === "true";

    if (!isReady && !hasChosen) {
      setShowPicker(true);
      return;
    }

    if (!isReady) {
      setLoading(true);
      try {
        await loadModel();
      } catch {
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    onClick();
  }

  function handlePickerClose() {
    setShowPicker(false);
    // After picker closes and model is ready, execute the action
    if (isReady) {
      onClick();
    }
  }

  const isModelLoading = loading || status === "downloading" || status === "loading";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || isModelLoading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isModelLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        <span>{isModelLoading ? "Loading AI..." : label}</span>
      </button>
      <ModelPicker open={showPicker} onClose={handlePickerClose} />
    </>
  );
}
