"use client";

import Link from "next/link";
import { Settings2, Sparkles, AlertCircle } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { getModelPack, getTabAICoverage } from "@/lib/ai/registry";
import type { ToolHubGroup } from "@/data/tool-hub";

interface TabAIBarProps {
  groups: ToolHubGroup[];
}

export default function TabAIBar({ groups }: TabAIBarProps) {
  const { isReady, isSupported, provider, selectedSlug } = useLocalAI();

  // Flatten all tools from groups for coverage calculation
  const allTools = groups.flatMap((g) => g.tools);
  const coverage = getTabAICoverage(allTools, selectedSlug);

  // Don't show if no AI tools in this tab
  if (coverage.totalAI === 0) return null;

  const bestPack = coverage.bestSlug ? getModelPack(coverage.bestSlug) : null;

  // Not supported — WebGPU unavailable
  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 mb-8 border border-border">
        <AlertCircle className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        <span className="text-sm text-text-tertiary">
          AI tools require WebGPU · Connect Ollama for local AI
        </span>
      </div>
    );
  }

  // No model loaded
  if (!isReady) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 mb-8 border border-border">
        <Sparkles className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        <span className="text-sm text-text-secondary">
          {coverage.totalAI} AI tools on this tab
        </span>
        {bestPack && (
          <span className="text-sm text-text-tertiary">
            · Recommended: {bestPack.icon} {bestPack.name} (covers{" "}
            {coverage.bestCoverage})
          </span>
        )}
        <Link
          href="/ai/models"
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent transition-colors flex-shrink-0"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Load Model
        </Link>
      </div>
    );
  }

  // Model loaded
  const pack = selectedSlug ? getModelPack(selectedSlug) : null;
  const modelLabel =
    provider === "ollama"
      ? "Ollama"
      : pack
        ? `${pack.icon} ${pack.name}`
        : "AI";

  const ollamaNote =
    coverage.ollamaOnly > 0
      ? `${coverage.ollamaOnly} need${coverage.ollamaOnly === 1 ? "s" : ""} Ollama`
      : null;
  const specializedNote =
    coverage.specializedOnly > 0
      ? `${coverage.specializedOnly} specialized`
      : null;
  const notes = [ollamaNote, specializedNote].filter(Boolean).join(", ");

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 mb-8 border border-border">
      <span className="w-2 h-2 rounded-full bg-grade-a flex-shrink-0" />
      <span className="text-sm text-text-secondary">
        {modelLabel} — {coverage.supported} of {coverage.totalAI} AI tools
        ready
      </span>
      {notes && (
        <span className="text-sm text-text-tertiary">· {notes}</span>
      )}
      {/* Suggest upgrade if a better model exists */}
      {bestPack &&
        coverage.bestCoverage > coverage.supported &&
        provider !== "ollama" && (
          <span className="text-sm text-text-tertiary">
            · Upgrade to {bestPack.icon} {bestPack.name} for{" "}
            {coverage.bestCoverage}
          </span>
        )}
      <Link
        href="/ai/models"
        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent transition-colors flex-shrink-0"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Model Store
      </Link>
    </div>
  );
}
