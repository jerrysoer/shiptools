"use client";

import { useState } from "react";
import { Search, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import EditorialRule from "@/components/EditorialRule";
import ToolAccordion from "@/components/ToolAccordion";
import { PROTECT_GROUPS, PROTECT_TOOL_COUNT } from "@/data/tool-hub";

export default function ProtectPage() {
  const [query, setQuery] = useState("");

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: "var(--color-dept-privacy)" }}
          />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            Protect &middot; {PROTECT_TOOL_COUNT} tools
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">
          Security & Privacy
        </h1>
        <p className="text-text-secondary max-w-xl">
          Encrypt, inspect, and clean — protect your data with tools that never
          phone home.
        </p>
      </div>

      {/* Privacy Audit hero card */}
      <Link
        href="/audit"
        className="group block p-5 mb-8 border border-border hover:bg-bg-surface transition-colors"
        style={{ borderLeftWidth: "3px", borderLeftColor: "var(--color-dept-privacy)" }}
      >
        <div className="flex items-start gap-4">
          <ShieldCheck
            className="w-6 h-6 flex-shrink-0 mt-0.5"
            style={{ color: "var(--color-dept-privacy)" }}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-lg mb-1 group-hover:text-accent transition-colors">
              Privacy Audit
            </h2>
            <p className="text-text-secondary text-sm">
              Scan any website for trackers, cookies, and data collection
              practices. Get an A–F privacy grade.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-text-tertiary mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

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
        groups={PROTECT_GROUPS}
        searchFilter={query}
        storageKey="protect-hub-state"
      />

      {/* Footer note */}
      <p className="text-text-tertiary text-xs mt-10">
        All security tools run locally in your browser. Your data never leaves
        your device.
      </p>
    </div>
  );
}
