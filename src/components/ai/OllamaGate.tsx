"use client";

import { Server, ExternalLink } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";

interface OllamaGateProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

/**
 * Gating wrapper for Tier 5 (Ollama-only) features.
 * Renders children if Ollama is connected, otherwise shows install instructions.
 */
export default function OllamaGate({
  children,
  fallbackMessage,
}: OllamaGateProps) {
  const { provider } = useLocalAI();

  if (provider === "ollama") {
    return <>{children}</>;
  }

  return (
    <div className="p-6 bg-bg-elevated border border-border text-center space-y-4">
      <Server className="w-8 h-8 text-text-tertiary mx-auto" />
      <div>
        <h3 className="font-heading font-semibold text-sm mb-1">
          Requires Ollama
        </h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          {fallbackMessage ??
            "This feature requires a larger AI model running via Ollama on your machine. In-browser models are too small for this task."}
        </p>
      </div>
      <div className="space-y-2">
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Install Ollama
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <p className="text-text-tertiary text-xs">
          After installing, run{" "}
          <code className="px-1 py-0.5 bg-bg-surface rounded text-xs">
            ollama pull llama3.1
          </code>{" "}
          and refresh this page.
        </p>
        <p className="text-text-tertiary text-xs">
          If Ollama is running but not detected, set{" "}
          <code className="px-1 py-0.5 bg-bg-surface rounded text-xs">
            OLLAMA_ORIGINS=*
          </code>{" "}
          and restart Ollama to fix CORS.
        </p>
      </div>
    </div>
  );
}
