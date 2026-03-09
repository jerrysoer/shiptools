"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Braces, Copy, Check, ChevronRight, ChevronDown, Minimize2, TreePine, FileSpreadsheet, FileText } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { highlightJson } from "@/lib/tools/json-highlight";
import AIChip from "@/components/AIChip";
import AIStreamOutput from "@/components/AIStreamOutput";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { trackEvent } from "@/lib/analytics";

type ViewMode = "formatted" | "tree";
type IndentSize = 2 | 4;

interface ParseResult {
  valid: boolean;
  data: unknown;
  error: string;
  errorLine?: number;
  errorColumn?: number;
}

function parseJson(input: string): ParseResult {
  if (!input.trim()) {
    return { valid: false, data: null, error: "", errorLine: undefined, errorColumn: undefined };
  }
  try {
    const data = JSON.parse(input);
    return { valid: true, data, error: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    // Try to extract position from error message (e.g. "at position 42")
    const posMatch = message.match(/position\s+(\d+)/i);
    let errorLine: number | undefined;
    let errorColumn: number | undefined;
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = input.slice(0, pos);
      const lines = before.split("\n");
      errorLine = lines.length;
      errorColumn = lines[lines.length - 1].length + 1;
    }
    return { valid: false, data: null, error: message, errorLine, errorColumn };
  }
}

/** Recursive tree node component */
function TreeNode({ label, value, depth }: { label: string | null; value: unknown; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null) {
    return (
      <div className="flex items-baseline gap-1" style={{ paddingLeft: depth * 16 }}>
        {label !== null && <span className="text-accent">{`"${label}"`}:</span>}
        <span className="text-text-tertiary">null</span>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="flex items-baseline gap-1" style={{ paddingLeft: depth * 16 }}>
        {label !== null && <span className="text-accent">{`"${label}"`}:</span>}
        <span className="text-purple-400">{String(value)}</span>
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div className="flex items-baseline gap-1" style={{ paddingLeft: depth * 16 }}>
        {label !== null && <span className="text-accent">{`"${label}"`}:</span>}
        <span className="text-amber-400">{String(value)}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div className="flex items-baseline gap-1" style={{ paddingLeft: depth * 16 }}>
        {label !== null && <span className="text-accent">{`"${label}"`}:</span>}
        <span className="text-grade-a">&quot;{value}&quot;</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:bg-bg-hover rounded px-1 -ml-1 transition-colors"
          style={{ paddingLeft: depth * 16 }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          )}
          {label !== null && <span className="text-accent">{`"${label}"`}:</span>}
          <span className="text-text-tertiary">
            [{expanded ? "" : `${value.length} items`}
          </span>
          {!expanded && <span className="text-text-tertiary">]</span>}
        </button>
        {expanded && (
          <>
            {value.map((item, i) => (
              <TreeNode key={i} label={null} value={item} depth={depth + 1} />
            ))}
            <div className="text-text-tertiary" style={{ paddingLeft: depth * 16 }}>]</div>
          </>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:bg-bg-hover rounded px-1 -ml-1 transition-colors"
          style={{ paddingLeft: depth * 16 }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
          )}
          {label !== null && <span className="text-accent">{`"${label}"`}:</span>}
          <span className="text-text-tertiary">
            {"{"}{expanded ? "" : `${entries.length} keys`}
          </span>
          {!expanded && <span className="text-text-tertiary">{"}"}</span>}
        </button>
        {expanded && (
          <>
            {entries.map(([key, val]) => (
              <TreeNode key={key} label={key} value={val} depth={depth + 1} />
            ))}
            <div className="text-text-tertiary" style={{ paddingLeft: depth * 16 }}>{"}"}</div>
          </>
        )}
      </div>
    );
  }

  return null;
}

export default function JsonFormatter() {
  useEffect(() => { trackEvent("tool_opened", { tool: "json" }); }, []);

  const [input, setInput] = useState("");
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [viewMode, setViewMode] = useState<ViewMode>("formatted");
  const [copied, setCopied] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const { streamInfer } = useLocalAI();

  const result = useMemo(() => parseJson(input), [input]);

  const formattedJson = useMemo(() => {
    if (!result.valid) return "";
    return JSON.stringify(result.data, null, indentSize);
  }, [result, indentSize]);

  const minifiedJson = useMemo(() => {
    if (!result.valid) return "";
    return JSON.stringify(result.data);
  }, [result]);

  const highlightedHtml = useMemo(() => {
    if (!formattedJson) return "";
    return highlightJson(formattedJson);
  }, [formattedJson]);

  const copyOutput = useCallback(async () => {
    const text = viewMode === "formatted" ? formattedJson : minifiedJson;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [viewMode, formattedJson, minifiedJson]);

  const handleMinify = useCallback(() => {
    if (!result.valid) return;
    setInput(minifiedJson);
    trackEvent("tool_used", { tool: "json", action: "minify" });
  }, [result, minifiedJson]);

  const handleFormat = useCallback(() => {
    if (!result.valid) return;
    setInput(formattedJson);
    trackEvent("tool_used", { tool: "json", action: "format" });
  }, [result, formattedJson]);

  const convertToCSV = useCallback(async () => {
    if (!result.valid) return;
    const data = result.data;
    // CSV only works for arrays of objects
    if (!Array.isArray(data)) return;
    const Papa = (await import("papaparse")).default;
    const csv = Papa.unparse(data as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = "data.csv";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [result]);

  const convertToYAML = useCallback(async () => {
    if (!result.valid) return;
    const yaml = (await import("js-yaml")).default;
    const yamlStr = yaml.dump(result.data, { indent: 2, lineWidth: 120 });
    const blob = new Blob([yamlStr], { type: "text/yaml" });
    const link = document.createElement("a");
    link.download = "data.yaml";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [result]);

  const explainError = useCallback(async () => {
    if (!result.error || !input) return;
    setAiExplanation("");
    setIsExplaining(true);

    // Get surrounding context around the error
    const lines = input.split("\n");
    const errorLine = result.errorLine ?? 1;
    const start = Math.max(0, errorLine - 3);
    const end = Math.min(lines.length, errorLine + 3);
    const context = lines.slice(start, end).join("\n");

    try {
      await streamInfer(
        `JSON error: ${result.error}\n\nContext around error (line ${errorLine}):\n${context}\n\nFull JSON:\n${input.slice(0, 2000)}`,
        PROMPTS.jsonErrorExplainer,
        (token) => setAiExplanation((prev) => prev + token)
      );
      trackEvent("tool_used", { tool: "ai_json_explainer" });
    } catch {
      setAiExplanation("Failed to generate explanation.");
    } finally {
      setIsExplaining(false);
    }
  }, [result, input, streamInfer]);

  const loadSample = () => {
    setInput(
      JSON.stringify(
        {
          name: "Uploadless",
          version: "0.1.0",
          tools: ["JSON Formatter", "QR Generator", "Hash Calculator"],
          config: { theme: "dark", locale: "en-US" },
          active: true,
          count: 42,
          metadata: null,
        },
        null,
        2
      )
    );
  };

  return (
    <div>
      <ToolPageHeader
        icon={Braces}
        title="JSON Formatter"
        description="Format, validate, minify, and convert JSON to CSV or YAML."
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={handleFormat}
          disabled={!result.valid}
          className="bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Format
        </button>
        <button
          onClick={handleMinify}
          disabled={!result.valid}
          className="flex items-center gap-1.5 bg-bg-elevated border border-border px-4 py-2 hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          Minify
        </button>

        {/* Indent toggle */}
        <div className="flex items-center gap-1 bg-bg-surface border border-border p-0.5 ml-auto">
          {([2, 4] as IndentSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setIndentSize(size)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                indentSize === size
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {size}sp
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-bg-surface border border-border p-0.5">
          <button
            onClick={() => setViewMode("formatted")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "formatted"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Braces className="w-3 h-3" />
            Code
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "tree"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <TreePine className="w-3 h-3" />
            Tree
          </button>
        </div>
      </div>

      {/* Dual pane */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Input */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste JSON here... or click "Load sample"'
            spellCheck={false}
            rows={18}
            className={`w-full bg-bg-surface border px-4 py-3 text-sm font-mono resize-none focus:outline-none placeholder:text-text-tertiary ${
              result.error
                ? "border-grade-f focus:border-grade-f"
                : "border-border focus:border-accent"
            }`}
          />
          {!input && (
            <button
              onClick={loadSample}
              className="absolute bottom-4 right-4 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Load sample
            </button>
          )}
          {result.error && (
            <div className="mt-1.5">
              <div className="flex items-center gap-2">
                <p className="text-grade-f text-xs font-mono">
                  {result.error}
                  {result.errorLine && ` (line ${result.errorLine}, col ${result.errorColumn})`}
                </p>
                <AIChip
                  label="Explain error"
                  onClick={explainError}
                  disabled={isExplaining}
                />
              </div>
              <AIStreamOutput
                content={aiExplanation}
                isStreaming={isExplaining}
                className="mt-2"
              />
            </div>
          )}
        </div>

        {/* Output */}
        <div className="relative bg-bg-surface border border-border overflow-hidden">
          {/* Copy button */}
          {result.valid && viewMode === "formatted" && (
            <button
              onClick={copyOutput}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-bg-elevated border border-border hover:border-border-hover transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-grade-a" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-text-tertiary" />
              )}
            </button>
          )}

          {viewMode === "formatted" ? (
            <pre
              className="p-4 text-sm font-mono overflow-auto h-full min-h-[18rem] max-h-[32rem] leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: highlightedHtml || '<span class="text-text-tertiary">Output will appear here</span>',
              }}
            />
          ) : (
            <div className="p-4 text-sm font-mono overflow-auto h-full min-h-[18rem] max-h-[32rem] leading-relaxed">
              {result.valid ? (
                <TreeNode label={null} value={result.data} depth={0} />
              ) : (
                <span className="text-text-tertiary">Parse valid JSON to see the tree view</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Convert row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={convertToCSV}
          disabled={!result.valid || !Array.isArray(result.data)}
          className="flex items-center gap-1.5 bg-bg-elevated border border-border px-4 py-2 hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          title={!Array.isArray(result.data) ? "Requires an array of objects" : ""}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Convert to CSV
        </button>
        <button
          onClick={convertToYAML}
          disabled={!result.valid}
          className="flex items-center gap-1.5 bg-bg-elevated border border-border px-4 py-2 hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <FileText className="w-4 h-4" />
          Convert to YAML
        </button>
      </div>
    </div>
  );
}
