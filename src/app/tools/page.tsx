"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import EditorialRule from "@/components/EditorialRule";
import ToolAccordion from "@/components/ToolAccordion";
import TabAIBar from "@/components/TabAIBar";
import { CODE_GROUPS, CODE_TOOL_COUNT } from "@/data/tool-hub";

const CODE_AI_COUNT = CODE_GROUPS.reduce(
  (sum, g) => sum + g.tools.filter((t) => t.ai).length,
  0,
);

export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const { isReady, selectedSlug } = useLocalAI();

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
            Code &middot; {CODE_TOOL_COUNT} tools ({CODE_AI_COUNT} AI-powered)
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">
          Code & Development
        </h1>
        <p className="text-text-secondary max-w-xl">
          Review, generate, format, and ship — AI code tools and developer
          utilities running in your browser.
        </p>
      </div>

      {/* Per-tab AI context bar */}
      <TabAIBar groups={CODE_GROUPS} />

      {/* Search */}
      <div className="sticky top-0 z-10 bg-bg-primary pb-3 pt-1 -mx-1 px-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-bg-surface border border-border placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
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

      {/* Tool Accordion */}
      <ToolAccordion
        groups={CODE_GROUPS}
        searchFilter={query}
        storageKey="code-hub-state"
        activeSlug={selectedSlug}
        isReady={isReady}
      />

      {/* Footer note */}
      <p className="text-text-tertiary text-xs mt-10">
        AI-powered tools run locally in your browser using WebGPU or connect to
        Ollama. No data is sent to any server.
      </p>
    </div>
  );
}
