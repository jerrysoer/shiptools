"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";

export interface ToolEntry {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ai?: { tier: string };
}

export interface ToolGroup {
  label: string;
  tools: ToolEntry[];
}

interface ToolAccordionProps {
  groups: ToolGroup[];
  storageKey?: string;
  searchFilter?: string;
}

function AIBadge({ tier }: { tier: string }) {
  const isOllama = tier === "Ollama";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono tracking-wider uppercase leading-none rounded-sm flex-shrink-0 ${
        isOllama
          ? "bg-[var(--color-dept-ai)]/10 text-[var(--color-dept-ai)] border border-dashed border-[var(--color-dept-ai)]/20"
          : "bg-[var(--color-dept-ai)]/10 text-[var(--color-dept-ai)] border border-[var(--color-dept-ai)]/20"
      }`}
    >
      <Sparkles className="w-2.5 h-2.5" />
      <span>AI &middot; {tier}</span>
    </span>
  );
}

function ToolRow({ href, icon: Icon, title, description, ai }: ToolEntry) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 py-3 border-b border-border hover:bg-bg-surface transition-colors -mx-3 px-3"
    >
      <Icon className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors flex-shrink-0" />
      <span className="font-medium text-sm group-hover:text-accent transition-colors min-w-[140px] sm:min-w-[180px]">
        {title}
      </span>
      {ai && <AIBadge tier={ai.tier} />}
      <span className="text-text-secondary text-sm hidden sm:block">
        {description}
      </span>
    </Link>
  );
}

export default function ToolAccordion({
  groups,
  storageKey = "tool-accordion-state",
  searchFilter,
}: ToolAccordionProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  const isSearching = Boolean(searchFilter && searchFilter.trim().length > 0);
  const query = searchFilter?.trim().toLowerCase() ?? "";

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!isSearching) return groups;
    return groups
      .map((group) => ({
        ...group,
        tools: group.tools.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.tools.length > 0);
  }, [groups, query, isSearching]);

  // Load persisted state on mount, default all open
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setOpenSections(JSON.parse(stored));
      } else {
        const allOpen: Record<string, boolean> = {};
        groups.forEach((g) => {
          allOpen[g.label] = true;
        });
        setOpenSections(allOpen);
      }
    } catch {
      const allOpen: Record<string, boolean> = {};
      groups.forEach((g) => {
        allOpen[g.label] = true;
      });
      setOpenSections(allOpen);
    }
    setHydrated(true);
  }, [groups, storageKey]);

  // Persist state changes (only when not searching)
  useEffect(() => {
    if (hydrated && !isSearching) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(openSections));
      } catch {
        // Ignore storage errors
      }
    }
  }, [openSections, storageKey, hydrated, isSearching]);

  const toggleSection = useCallback((label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  return (
    <div className="space-y-2">
      {filteredGroups.map((group) => {
        // Force-open all groups during search; otherwise use persisted state
        const isOpen = isSearching
          ? true
          : hydrated
            ? (openSections[group.label] ?? true)
            : true;

        return (
          <div key={group.label}>
            <button
              onClick={() => toggleSection(group.label)}
              className="w-full flex items-center gap-3 py-3 group cursor-pointer"
            >
              <ChevronDown
                className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${
                  isOpen ? "" : "-rotate-90"
                }`}
              />
              <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
                {group.label} &middot; {group.tools.length} tools
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-200 ease-in-out"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
              }}
            >
              <div className="overflow-hidden">
                <div className="pb-6">
                  {group.tools.map((tool) => (
                    <ToolRow key={tool.href} {...tool} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
