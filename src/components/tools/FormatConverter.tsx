"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";
import yaml from "js-yaml";
import * as TOML from "smol-toml";

/* -- Types ---------------------------------------- */

type Format = "json" | "yaml" | "toml" | "auto";

/* -- Helpers -------------------------------------- */

function detectFormat(input: string): Format | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try JSON first
  try {
    JSON.parse(trimmed);
    return "json";
  } catch {
    // not JSON
  }

  // Try TOML (TOML is more restrictive than YAML, try it before YAML)
  try {
    const result = TOML.parse(trimmed);
    if (result && typeof result === "object" && Object.keys(result).length > 0) {
      return "toml";
    }
  } catch {
    // not TOML
  }

  // Try YAML
  try {
    const result = yaml.load(trimmed);
    if (result && typeof result === "object") {
      return "yaml";
    }
  } catch {
    // not YAML
  }

  return null;
}

function parseInput(input: string, format: Format): { data: unknown; detectedFormat: Format | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { data: null, detectedFormat: null, error: null };

  if (format === "auto") {
    const detected = detectFormat(trimmed);
    if (!detected) return { data: null, detectedFormat: null, error: "Could not auto-detect format. Please select the input format manually." };
    return parseInput(trimmed, detected);
  }

  try {
    switch (format) {
      case "json": {
        const data = JSON.parse(trimmed);
        return { data, detectedFormat: "json", error: null };
      }
      case "yaml": {
        const data = yaml.load(trimmed);
        return { data, detectedFormat: "yaml", error: null };
      }
      case "toml": {
        const data = TOML.parse(trimmed);
        return { data, detectedFormat: "toml", error: null };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse error";
    return { data: null, detectedFormat: format, error: message };
  }
}

function convertTo(data: unknown, format: Format): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "yaml":
      return yaml.dump(data, { indent: 2, lineWidth: 120, noRefs: true });
    case "toml":
      return TOML.stringify(data as Record<string, unknown>);
    default:
      return "";
  }
}

const FORMAT_OPTIONS: { value: Format; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
];

const OUTPUT_OPTIONS: { value: Format; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
];

const SAMPLE_JSON = `{
  "name": "uploadless",
  "version": "1.0.0",
  "description": "Local-first developer tools",
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}`;

/* -- Component ------------------------------------ */

export default function FormatConverter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [inputFormat, setInputFormat] = useState<Format>("auto");
  const [outputFormat, setOutputFormat] = useState<Format>("yaml");
  const [error, setError] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<Format | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "format_converter" });
  }, []);

  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    const { data, detectedFormat: detected, error: parseError } = parseInput(input, inputFormat);

    if (parseError) {
      setError(parseError);
      setOutput("");
      setDetectedFormat(detected);
      return;
    }

    if (data === null || data === undefined) {
      setError("Input is empty or invalid.");
      setOutput("");
      return;
    }

    try {
      const result = convertTo(data, outputFormat);
      setOutput(result);
      setError(null);
      setDetectedFormat(detected);
      trackEvent("tool_used", { tool: "format_converter", action: "convert", from: detected || inputFormat, to: outputFormat });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Conversion error";
      setError(`Conversion to ${outputFormat.toUpperCase()} failed: ${message}`);
      setOutput("");
    }
  }, [input, inputFormat, outputFormat]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const loadSample = useCallback(() => {
    setInput(SAMPLE_JSON);
    setInputFormat("auto");
    setError(null);
  }, []);

  return (
    <div>
      <ToolPageHeader
        icon={ArrowLeftRight}
        title="JSON / YAML / TOML Converter"
        description="Convert between JSON, YAML, and TOML formats. Auto-detects input format or select manually."
      />

      {/* Format selectors */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
            Input Format
          </label>
          <select
            value={inputFormat}
            onChange={(e) => setInputFormat(e.target.value as Format)}
            className="w-full bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
            Output Format
          </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as Format)}
            className="w-full bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {OUTPUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Detected format badge */}
      {detectedFormat && inputFormat === "auto" && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium">
            Detected: {detectedFormat.toUpperCase()}
          </span>
        </div>
      )}

      {/* Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs text-text-tertiary font-medium uppercase tracking-wider">
            Input
          </label>
          <button
            onClick={loadSample}
            className="text-xs text-text-tertiary hover:text-accent transition-colors"
          >
            Load sample
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JSON, YAML, or TOML here..."
          rows={10}
          className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
          spellCheck={false}
        />
      </div>

      {/* Convert button */}
      <button
        onClick={handleConvert}
        disabled={!input.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        <ArrowLeftRight className="w-4 h-4" />
        Convert
      </button>

      {/* Error */}
      {error && (
        <div className="bg-grade-f/10 border border-grade-f/20 px-4 py-3 mb-4">
          <p className="text-sm text-grade-f">{error}</p>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-text-tertiary font-medium uppercase tracking-wider">
              Output ({outputFormat.toUpperCase()})
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
            value={output}
            readOnly
            rows={10}
            className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono resize-y"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
