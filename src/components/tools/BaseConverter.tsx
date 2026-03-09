"use client";

import { useState, useEffect, useCallback } from "react";
import { Binary, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Types ───────────────────────────────────── */

type Base = 2 | 8 | 10 | 16;

interface BaseInfo {
  base: Base;
  label: string;
  prefix: string;
  placeholder: string;
  regex: RegExp;
}

const BASES: BaseInfo[] = [
  { base: 2, label: "Binary", prefix: "0b", placeholder: "e.g. 1010", regex: /^[01]+$/ },
  { base: 8, label: "Octal", prefix: "0o", placeholder: "e.g. 777", regex: /^[0-7]+$/ },
  { base: 10, label: "Decimal", prefix: "", placeholder: "e.g. 255", regex: /^[0-9]+$/ },
  { base: 16, label: "Hex", prefix: "0x", placeholder: "e.g. FF", regex: /^[0-9a-fA-F]+$/ },
];

/* ── Helpers ──────────────────────────────────── */

function convertValue(input: string, fromBase: Base): Map<Base, string> | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  const info = BASES.find((b) => b.base === fromBase)!;
  if (!info.regex.test(cleaned)) return null;

  try {
    // Use BigInt for large number support
    let value: bigint;
    if (fromBase === 16) {
      value = BigInt("0x" + cleaned);
    } else if (fromBase === 8) {
      value = BigInt("0o" + cleaned);
    } else if (fromBase === 2) {
      value = BigInt("0b" + cleaned);
    } else {
      value = BigInt(cleaned);
    }

    const results = new Map<Base, string>();
    results.set(2, value.toString(2));
    results.set(8, value.toString(8));
    results.set(10, value.toString(10));
    results.set(16, value.toString(16).toUpperCase());
    return results;
  } catch {
    return null;
  }
}

function formatBinary(bin: string): string {
  // Group binary digits in 4s from the right
  const padded = bin.padStart(Math.ceil(bin.length / 4) * 4, "0");
  return padded.replace(/(.{4})/g, "$1 ").trim();
}

/* ── Component ───────────────────────────────── */

export default function BaseConverter() {
  const [input, setInput] = useState("");
  const [inputBase, setInputBase] = useState<Base>(10);
  const [results, setResults] = useState<Map<Base, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "base-convert" });
  }, []);

  const handleInputChange = useCallback(
    (value: string, base: Base = inputBase) => {
      setInput(value);
      if (!value.trim()) {
        setResults(null);
        setError(null);
        return;
      }

      const info = BASES.find((b) => b.base === base)!;
      if (!info.regex.test(value.trim())) {
        setResults(null);
        setError(`Invalid character for base ${base}`);
        return;
      }

      const converted = convertValue(value, base);
      if (converted) {
        setResults(converted);
        setError(null);
        trackEvent("tool_used", { tool: "base-convert" });
      } else {
        setResults(null);
        setError("Could not convert value");
      }
    },
    [inputBase]
  );

  const handleBaseChange = useCallback(
    (base: Base) => {
      setInputBase(base);
      // Re-validate current input against new base
      if (input.trim()) {
        handleInputChange(input, base);
      }
    },
    [input, handleInputChange]
  );

  const copyValue = useCallback(async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyValue(value, field)}
      className="p-2 bg-bg-elevated border border-border hover:border-border-hover transition-colors shrink-0"
      title={`Copy ${field}`}
    >
      {copiedField === field ? (
        <Check className="w-3.5 h-3.5 text-grade-a" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );

  const currentBaseInfo = BASES.find((b) => b.base === inputBase)!;

  return (
    <div>
      <ToolPageHeader
        icon={Binary}
        title="Number Base Converter"
        description="Convert numbers between binary, octal, decimal, and hexadecimal in real time. Supports large numbers via BigInt."
      />

      {/* Input */}
      <div className="mb-6">
        <label htmlFor="base-input" className="block text-sm font-medium mb-1.5">
          Input
        </label>
        <div className="flex gap-3">
          {/* Base selector */}
          <div className="flex gap-1 p-1 bg-bg-surface border border-border shrink-0">
            {BASES.map((b) => (
              <button
                key={b.base}
                onClick={() => handleBaseChange(b.base)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  inputBase === b.base
                    ? "bg-accent text-accent-fg"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Input field */}
          <input
            id="base-input"
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={currentBaseInfo.placeholder}
            className="flex-1 bg-bg-surface border border-border px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 text-sm text-grade-f bg-grade-f/10 border border-grade-f/20 px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {BASES.map((b) => {
            const value = results.get(b.base) ?? "";
            const displayValue = b.base === 2 ? formatBinary(value) : value;
            const isInput = b.base === inputBase;
            return (
              <div
                key={b.base}
                className={`bg-bg-surface border p-4 ${
                  isInput ? "border-accent/30" : "border-border"
                }`}
              >
                <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
                  {b.label} (base {b.base})
                  {isInput && (
                    <span className="text-accent ml-2 normal-case">(input)</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  {b.prefix && (
                    <span className="text-text-tertiary font-mono text-sm">{b.prefix}</span>
                  )}
                  <span className="flex-1 font-mono text-sm text-text-primary break-all">
                    {displayValue}
                  </span>
                  <CopyBtn value={b.prefix + value} field={b.label} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick values */}
      {!results && (
        <div className="bg-bg-surface border border-border p-5">
          <h2 className="font-heading font-semibold text-sm mb-3">Try These Values</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "255", desc: "Max byte" },
              { label: "256", desc: "One page" },
              { label: "1024", desc: "1 KB" },
              { label: "65535", desc: "Max uint16" },
              { label: "2147483647", desc: "Max int32" },
              { label: "4294967295", desc: "Max uint32" },
            ].map(({ label, desc }) => (
              <button
                key={label}
                onClick={() => {
                  setInputBase(10);
                  handleInputChange(label, 10);
                }}
                className="flex flex-col items-start px-3 py-2 bg-bg-elevated border border-border hover:border-border-hover transition-colors"
              >
                <span className="font-mono text-sm text-text-primary">{label}</span>
                <span className="text-xs text-text-tertiary">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
