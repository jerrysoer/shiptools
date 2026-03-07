"use client";

import { useState } from "react";
import { Search, ArrowRight, Sparkles, Settings2 } from "lucide-react";
import Link from "next/link";
import { useLocalAI } from "@/hooks/useLocalAI";
import { getModelPack } from "@/lib/ai/registry";
import EditorialRule from "@/components/EditorialRule";
import ToolAccordion from "@/components/ToolAccordion";
import {
  TOOL_HUB_GROUPS,
  QUICK_TOOLS,
  TOTAL_TOOL_COUNT,
  AI_TOOL_COUNT,
} from "@/data/tool-hub";

export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const { isReady, isSupported, provider, model, selectedSlug } = useLocalAI();
  const pack = selectedSlug ? getModelPack(selectedSlug) : null;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: "var(--color-dept-dev)" }}
          />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            All Tools &middot; {TOTAL_TOOL_COUNT} tools ({AI_TOOL_COUNT} AI-powered)
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">Tool Hub</h1>
        <p className="text-text-secondary max-w-xl">
          Developer, AI, and privacy tools — all running in your browser. No
          data leaves your device.
        </p>
      </div>

      {/* Condensed AI status bar */}
      {isSupported && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-8 border border-border rounded-lg">
          {isReady ? (
            <>
              <div className="w-2 h-2 rounded-full bg-grade-a animate-pulse flex-shrink-0" />
              <span className="text-sm text-text-secondary truncate">
                {provider === "ollama"
                  ? `Ollama — ${model?.name}`
                  : pack
                    ? `${pack.icon} ${pack.name}`
                    : model?.name ?? "AI model loaded"}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
              <span className="text-sm text-text-tertiary">
                No AI model loaded
              </span>
            </>
          )}
          <Link
            href="/ai/models"
            className="ml-auto flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent transition-colors flex-shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Model Store
          </Link>
        </div>
      )}

      {/* Quick AI Tools */}
      <section className="mb-8">
        <span className="font-mono text-[10px] tracking-widest uppercase text-text-tertiary mb-3 block">
          Quick AI Tools
        </span>
        <div className="grid sm:grid-cols-2 gap-3">
          {QUICK_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex items-start gap-3 p-4 border border-border rounded-lg hover:bg-bg-surface transition-colors"
            >
              <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-dept-ai)" }}>
                <tool.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <span className="font-medium text-sm group-hover:text-accent transition-colors block">
                  {tool.title}
                </span>
                <span className="text-text-secondary text-xs">
                  {tool.description}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary ml-auto mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>

      {/* Search */}
      <div className="sticky top-0 z-10 bg-bg-primary pb-3 pt-1 -mx-1 px-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-bg-surface border border-border rounded-lg placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Unified Accordion */}
      <ToolAccordion
        groups={TOOL_HUB_GROUPS}
        searchFilter={query}
        storageKey="tool-hub-state"
      />

      {/* Footer note */}
      <p className="text-text-tertiary text-xs mt-10">
        AI-powered tools run locally in your browser using WebGPU or connect to
        Ollama. No data is sent to any server.
      </p>
    </div>
  );
}
