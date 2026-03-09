"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import EditorialRule from "@/components/EditorialRule";
import ToolAccordion from "@/components/ToolAccordion";
import TabAIBar from "@/components/TabAIBar";
import { MEDIA_GROUPS, MEDIA_TOOL_COUNT } from "@/data/tool-hub";

export default function MediaPage() {
  const [query, setQuery] = useState("");
  const { isReady, selectedSlug } = useLocalAI();

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: "var(--color-dept-record)" }}
          />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            Media &middot; {MEDIA_TOOL_COUNT} tools
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">Media & Files</h1>
        <p className="text-text-secondary max-w-xl">
          Record, convert, and create — images, audio, video, and documents
          processed entirely in your browser using WebAssembly.
        </p>
      </div>

      {/* Per-tab AI context bar (auto-hides if 0 AI tools) */}
      <TabAIBar groups={MEDIA_GROUPS} />

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
        groups={MEDIA_GROUPS}
        searchFilter={query}
        storageKey="media-hub-state"
        activeSlug={selectedSlug}
        isReady={isReady}
      />

      {/* Footer note */}
      <p className="text-text-tertiary text-xs mt-10">
        All media processing runs locally using WebAssembly. Your files never
        leave your device.
      </p>
    </div>
  );
}
