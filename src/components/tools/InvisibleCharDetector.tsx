"use client";

import { useState, useMemo, useEffect } from "react";
import { Type, Eraser, AlertTriangle, CheckCircle } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";
import {
  detectInvisible,
  cleanText,
  type InvisibleChar,
} from "@/lib/tools/invisible-chars";

const CATEGORY_COLORS: Record<
  InvisibleChar["category"],
  { bg: string; text: string; label: string }
> = {
  "zero-width": { bg: "bg-red-500/20", text: "text-red-400", label: "Zero-Width" },
  bidi: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Bidi Control" },
  formatting: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Formatting" },
  homoglyph: { bg: "bg-orange-500/20", text: "text-orange-400", label: "Homoglyph" },
};

export default function InvisibleCharDetector() {
  useEffect(() => { trackEvent("tool_opened", { tool: "invisible-chars" }); }, []);

  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input) return null;
    const r = detectInvisible(input);
    trackEvent("tool_used", { tool: "invisible-chars" });
    return r;
  }, [input]);

  /** Build a per-character lookup for invisible chars at each string position. */
  const charInfoByIndex = useMemo(() => {
    if (!result || result.total === 0) return null;
    const lookup = new Map<number, InvisibleChar>();
    let matchIdx = 0;
    const chars = [...input];
    for (let i = 0; i < chars.length && matchIdx < result.chars.length; i++) {
      if (chars[i] === result.chars[matchIdx].char) {
        lookup.set(i, result.chars[matchIdx]);
        matchIdx++;
      }
    }
    return lookup;
  }, [input, result]);

  const renderHighlighted = useMemo(() => {
    if (!charInfoByIndex) return null;
    const chars = [...input];
    return chars.map((ch, i) => {
      const info = charInfoByIndex.get(i);
      if (info) {
        const colors = CATEGORY_COLORS[info.category];
        return (
          <span
            key={i}
            className={`${colors.bg} ${colors.text} px-1 rounded text-xs font-mono cursor-help inline-block mx-0.5`}
            title={`${info.name} (${info.code})`}
          >
            {info.code}
          </span>
        );
      }
      return <span key={i}>{ch}</span>;
    });
  }, [input, charInfoByIndex]);

  async function handleCleanCopy() {
    const cleaned = cleanText(input);
    await navigator.clipboard.writeText(cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeCategories = result
    ? (Object.entries(result.counts) as [InvisibleChar["category"], number][]).filter(
        ([, n]) => n > 0
      )
    : [];

  return (
    <div>
      <ToolPageHeader
        icon={Type}
        title="Invisible Character Detector"
        description="Paste text to detect zero-width characters, bidi controls, and homoglyphs. Clean and copy safe text instantly."
      />
      <div className="space-y-4">

      {/* Input */}
      <div className="bg-bg-surface border border-border p-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Paste text to inspect
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste text here to detect invisible characters, homoglyphs, and bidi controls..."
          rows={6}
          className="w-full bg-bg-elevated border border-border px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-y"
        />
      </div>

      {/* Results */}
      {result && input && (
        <>
          {/* Summary */}
          <div className="bg-bg-surface border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              {result.total > 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="font-heading font-semibold">
                    {result.total} invisible character{result.total !== 1 ? "s" : ""}{" "}
                    found
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-grade-a" />
                  <span className="font-heading font-semibold text-grade-a">
                    No invisible characters found
                  </span>
                </>
              )}
            </div>

            {activeCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeCategories.map(([cat, count]) => {
                  const colors = CATEGORY_COLORS[cat];
                  return (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {colors.label}: {count}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Highlighted Output */}
          {result.total > 0 && (
            <div className="bg-bg-surface border border-border p-4">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Highlighted Text
              </h3>
              <div className="bg-bg-elevated border border-border p-4 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap">
                {renderHighlighted}
              </div>
            </div>
          )}

          {/* Character Table */}
          {result.total > 0 && (
            <div className="bg-bg-surface border border-border p-4">
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Detected Characters
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-tertiary text-xs border-b border-border">
                      <th className="text-left py-2 pr-4">Code</th>
                      <th className="text-left py-2 pr-4">Name</th>
                      <th className="text-left py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.chars.map((c, i) => {
                      const colors = CATEGORY_COLORS[c.category];
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-accent">{c.code}</td>
                          <td className="py-2 pr-4 text-text-primary">{c.name}</td>
                          <td className="py-2">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}
                            >
                              {colors.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clean & Copy */}
          {result.total > 0 && (
            <button
              onClick={handleCleanCopy}
              className="flex items-center gap-2 bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Eraser className="w-4 h-4" />
                  Clean & Copy
                </>
              )}
            </button>
          )}
        </>
      )}
      </div>
    </div>
  );
}
