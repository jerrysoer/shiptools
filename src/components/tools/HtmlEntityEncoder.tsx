"use client";

import { useState, useEffect, useCallback } from "react";
import { Code, Copy, Check, ArrowRightLeft } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Named entity maps ───────────────────────── */

const CHAR_TO_ENTITY: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "\u00A0": "&nbsp;",
  "\u00A9": "&copy;",
  "\u00AE": "&reg;",
  "\u2122": "&trade;",
  "\u2013": "&ndash;",
  "\u2014": "&mdash;",
  "\u2018": "&lsquo;",
  "\u2019": "&rsquo;",
  "\u201C": "&ldquo;",
  "\u201D": "&rdquo;",
  "\u2026": "&hellip;",
  "\u00B0": "&deg;",
  "\u00B1": "&plusmn;",
  "\u00D7": "&times;",
  "\u00F7": "&divide;",
};

const ENTITY_TO_CHAR: Record<string, string> = {};
for (const [char, entity] of Object.entries(CHAR_TO_ENTITY)) {
  ENTITY_TO_CHAR[entity] = char;
}

/* ── Encode / Decode ─────────────────────────── */

function encodeHtmlEntities(text: string): string {
  let result = "";
  for (const char of text) {
    if (CHAR_TO_ENTITY[char]) {
      result += CHAR_TO_ENTITY[char];
    } else {
      const code = char.codePointAt(0)!;
      // Encode non-ASCII characters as numeric entities
      if (code > 127) {
        result += `&#${code};`;
      } else {
        result += char;
      }
    }
  }
  return result;
}

function decodeHtmlEntities(text: string): string {
  // First decode named entities
  let result = text;
  for (const [entity, char] of Object.entries(ENTITY_TO_CHAR)) {
    result = result.replaceAll(entity, char);
  }
  // Then decode numeric entities (decimal)
  result = result.replace(/&#(\d+);/g, (_, code) => {
    const num = parseInt(code, 10);
    return String.fromCodePoint(num);
  });
  // Then decode hex entities
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const num = parseInt(hex, 16);
    return String.fromCodePoint(num);
  });
  return result;
}

/* ── Component ───────────────────────────────── */

export default function HtmlEntityEncoder() {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "html-entities" });
  }, []);

  const handleLeftChange = useCallback((text: string) => {
    setLeftText(text);
    setRightText(encodeHtmlEntities(text));
    trackEvent("tool_used", { tool: "html-entities" });
  }, []);

  const handleRightChange = useCallback((text: string) => {
    setRightText(text);
    setLeftText(decodeHtmlEntities(text));
  }, []);

  const handleSwap = useCallback(() => {
    setLeftText(rightText);
    setRightText(leftText);
  }, [leftText, rightText]);

  const copyValue = useCallback(async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyValue(value, field)}
      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
    >
      {copiedField === field ? (
        <>
          <Check className="w-3.5 h-3.5 text-grade-a" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </button>
  );

  return (
    <div>
      <ToolPageHeader
        icon={Code}
        title="HTML Entity Encoder / Decoder"
        description="Encode special characters to HTML entities and decode entities back. Supports named entities (&amp;amp;) and numeric (&#38;#38;)."
      />

      <div className="space-y-4">
        {/* Dual textarea layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Plain text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Plain Text</label>
              {leftText && <CopyBtn value={leftText} field="plain" />}
            </div>
            <textarea
              value={leftText}
              onChange={(e) => handleLeftChange(e.target.value)}
              placeholder="Type or paste text to encode..."
              rows={10}
              className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y"
            />
          </div>

          {/* Right: Encoded */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">HTML Entities</label>
              {rightText && <CopyBtn value={rightText} field="entities" />}
            </div>
            <textarea
              value={rightText}
              onChange={(e) => handleRightChange(e.target.value)}
              placeholder="Type or paste HTML entities to decode..."
              rows={10}
              className="w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y"
            />
          </div>
        </div>

        {/* Swap button */}
        {(leftText || rightText) && (
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="text-text-tertiary hover:text-accent transition-colors p-1"
              title="Swap input and output"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick reference */}
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <h2 className="font-heading font-semibold text-sm mb-3">Common Entities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { char: "&", entity: "&amp;" },
              { char: "<", entity: "&lt;" },
              { char: ">", entity: "&gt;" },
              { char: '"', entity: "&quot;" },
              { char: "\u00A9", entity: "&copy;" },
              { char: "\u00AE", entity: "&reg;" },
              { char: "\u2122", entity: "&trade;" },
              { char: "\u2014", entity: "&mdash;" },
              { char: "\u00B0", entity: "&deg;" },
              { char: "\u00D7", entity: "&times;" },
              { char: "\u00F7", entity: "&divide;" },
              { char: "\u2026", entity: "&hellip;" },
            ].map(({ char, entity }) => (
              <button
                key={entity}
                onClick={() => handleLeftChange(leftText + char)}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-elevated transition-colors text-left"
              >
                <span className="font-mono text-accent">{char}</span>
                <span className="font-mono text-text-tertiary">{entity}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
