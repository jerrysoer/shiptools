"use client";

import { useState, useCallback, useEffect } from "react";
import { ALargeSmall, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type CaseType =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant";

const CASES: { type: CaseType; label: string }[] = [
  { type: "upper", label: "UPPERCASE" },
  { type: "lower", label: "lowercase" },
  { type: "title", label: "Title Case" },
  { type: "sentence", label: "Sentence case" },
  { type: "camel", label: "camelCase" },
  { type: "pascal", label: "PascalCase" },
  { type: "snake", label: "snake_case" },
  { type: "kebab", label: "kebab-case" },
  { type: "constant", label: "CONSTANT_CASE" },
];

function toWords(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function convert(text: string, type: CaseType): string {
  switch (type) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    case "sentence":
      return text
        .toLowerCase()
        .replace(/(^\s*|[.!?]\s+)(\w)/g, (_, sep, c) => sep + c.toUpperCase());
    case "camel": {
      const words = toWords(text);
      return words
        .map((w, i) =>
          i === 0
            ? w.toLowerCase()
            : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join("");
    }
    case "pascal": {
      const words = toWords(text);
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("");
    }
    case "snake": {
      const words = toWords(text);
      return words.map((w) => w.toLowerCase()).join("_");
    }
    case "kebab": {
      const words = toWords(text);
      return words.map((w) => w.toLowerCase()).join("-");
    }
    case "constant": {
      const words = toWords(text);
      return words.map((w) => w.toUpperCase()).join("_");
    }
  }
}

export default function CaseConverter() {
  useEffect(() => { trackEvent("tool_opened", { tool: "case" }); }, []);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [activeCase, setActiveCase] = useState<CaseType | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConvert = useCallback(
    (type: CaseType) => {
      if (!input.trim()) return;
      setOutput(convert(input, type));
      setActiveCase(type);
      trackEvent("tool_used", { tool: "case" });
    },
    [input]
  );

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  return (
    <div>
      <ToolPageHeader
        icon={ALargeSmall}
        title="Case Converter"
        description="Convert text between uppercase, lowercase, camelCase, snake_case, and more."
      />
      <div className="space-y-5">
        {/* Input */}
        <div>
          <label htmlFor="case-input" className="block text-sm font-medium mb-1.5">
            Input
          </label>
          <textarea
            id="case-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or type your text here..."
            rows={5}
            className="w-full bg-bg-surface border border-border px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y"
          />
        </div>

        {/* Conversion buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CASES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleConvert(type)}
              disabled={!input.trim()}
              className={`px-3 py-2 text-xs font-medium transition-colors border ${
                activeCase === type
                  ? "bg-accent text-accent-fg border-accent"
                  : "bg-bg-surface border-border text-text-secondary hover:text-text-primary hover:border-border-hover"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Output */}
        {output && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">
                Output
                {activeCase && (
                  <span className="text-text-tertiary font-normal ml-2">
                    ({CASES.find((c) => c.type === activeCase)?.label})
                  </span>
                )}
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
              >
                {copied ? (
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
            </div>
            <textarea
              readOnly
              value={output}
              rows={5}
              className="w-full bg-bg-surface border border-border px-4 py-3 text-sm font-mono text-text-secondary focus:outline-none resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}
