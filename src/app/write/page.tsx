"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLocalAI } from "@/hooks/useLocalAI";
import EditorialRule from "@/components/EditorialRule";
import ToolAccordion from "@/components/ToolAccordion";
import TabAIBar from "@/components/TabAIBar";
import {
  WRITE_GROUPS,
  QUICK_TOOLS,
  WRITE_TOOL_COUNT,
} from "@/data/tool-hub";

const WRITE_AI_COUNT = WRITE_GROUPS.reduce(
  (sum, g) => sum + g.tools.filter((t) => t.ai).length,
  0,
) + QUICK_TOOLS.length;

export default function WritePage() {
  const [query, setQuery] = useState("");
  const { isReady, selectedSlug } = useLocalAI();

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: "var(--color-dept-ai)" }}
          />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            Write &middot; {WRITE_TOOL_COUNT} tools ({WRITE_AI_COUNT} AI-powered)
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">Write & Analyze</h1>
        <p className="text-text-secondary max-w-xl">
          Compose emails, analyze documents, extract data, and process text —
          powered by local AI. Nothing leaves your browser.
        </p>
      </div>

      {/* Per-tab AI context bar */}
      <TabAIBar groups={WRITE_GROUPS} />

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
              className="group flex items-start gap-3 p-4 border border-border hover:bg-bg-surface transition-colors"
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
        groups={WRITE_GROUPS}
        searchFilter={query}
        storageKey="write-hub-state"
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
