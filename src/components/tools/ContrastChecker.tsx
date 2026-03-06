"use client";

import { useState, useMemo, useEffect } from "react";
import { Contrast, ArrowUpDown, CheckCircle, XCircle } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: string, bg: string): number | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;
  const l1 = relativeLuminance(fgRgb);
  const l2 = relativeLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const LEVELS = [
  { label: "AA Normal", threshold: 4.5, desc: "Body text" },
  { label: "AA Large", threshold: 3, desc: "18px+ or 14px+ bold" },
  { label: "AAA Normal", threshold: 7, desc: "Enhanced body text" },
  { label: "AAA Large", threshold: 4.5, desc: "Enhanced large text" },
] as const;

function normalizeHex(value: string): string {
  const cleaned = value.replace(/[^0-9a-fA-F#]/g, "");
  if (cleaned.startsWith("#")) return cleaned.slice(0, 7);
  return "#" + cleaned.slice(0, 6);
}

export default function ContrastChecker() {
  useEffect(() => { trackEvent("tool_opened", { tool: "contrast" }); }, []);

  const [fg, setFg] = useState("#1a1a2e");
  const [bg, setBg] = useState("#ffffff");

  const ratio = useMemo(() => {
    const r = contrastRatio(fg, bg);
    if (r !== null) trackEvent("tool_used", { tool: "contrast" });
    return r;
  }, [fg, bg]);
  const ratioDisplay = ratio ? ratio.toFixed(2) : "--";

  const handleSwap = () => {
    setFg(bg);
    setBg(fg);
  };

  const handleHexInput = (
    value: string,
    setter: (v: string) => void
  ) => {
    setter(normalizeHex(value));
  };

  return (
    <div>
      <ToolPageHeader
        icon={Contrast}
        title="Contrast Checker"
        description="Check WCAG 2.1 color contrast ratios for accessible design."
      />

      {/* Color Inputs */}
      <div className="bg-bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex items-end gap-4">
          {/* Foreground */}
          <div className="flex-1">
            <label className="text-sm text-text-secondary block mb-2">
              Foreground (text)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexToRgb(fg) ? fg : "#000000"}
                onChange={(e) => setFg(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0 bg-transparent"
              />
              <input
                type="text"
                value={fg}
                onChange={(e) => handleHexInput(e.target.value, setFg)}
                maxLength={7}
                className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            className="p-2.5 rounded-lg border border-border hover:bg-bg-elevated transition-colors shrink-0 mb-0.5"
            title="Swap colors"
          >
            <ArrowUpDown className="w-4 h-4 text-text-secondary" />
          </button>

          {/* Background */}
          <div className="flex-1">
            <label className="text-sm text-text-secondary block mb-2">
              Background
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexToRgb(bg) ? bg : "#ffffff"}
                onChange={(e) => setBg(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0 bg-transparent"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => handleHexInput(e.target.value, setBg)}
                maxLength={7}
                className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div
        className="rounded-xl border border-border p-8 mb-6 text-center"
        style={{ backgroundColor: bg }}
      >
        <p style={{ color: fg }} className="text-2xl font-bold mb-1">
          Large Text Preview
        </p>
        <p style={{ color: fg }} className="text-sm">
          Normal body text looks like this on your chosen background.
        </p>
      </div>

      {/* Contrast Ratio Display */}
      <div className="bg-bg-surface border border-border rounded-xl p-6 mb-6 text-center">
        <p className="text-text-secondary text-sm mb-1">Contrast Ratio</p>
        <p className="text-4xl font-bold font-mono">
          {ratioDisplay}
          <span className="text-lg text-text-tertiary">:1</span>
        </p>
      </div>

      {/* WCAG Levels */}
      <div className="bg-bg-surface border border-border rounded-xl divide-y divide-border">
        {LEVELS.map(({ label, threshold, desc }) => {
          const passes = ratio !== null && ratio >= threshold;
          return (
            <div
              key={label}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-text-tertiary ml-2">
                  {threshold}:1 &middot; {desc}
                </span>
              </div>
              {ratio !== null ? (
                passes ? (
                  <div className="flex items-center gap-1.5 text-grade-a text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Pass
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-grade-f text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    Fail
                  </div>
                )
              ) : (
                <span className="text-text-tertiary text-sm">--</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
