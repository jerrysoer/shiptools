"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";
import { format } from "sql-formatter";

/* -- Types ---------------------------------------- */

type SQLLanguage = "sql" | "postgresql" | "mysql" | "sqlite" | "bigquery";
type IndentSize = 2 | 4;

/* -- Constants ------------------------------------ */

const LANGUAGE_OPTIONS: { value: SQLLanguage; label: string }[] = [
  { value: "sql", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "bigquery", label: "BigQuery" },
];

const SAMPLE_SQL = `select u.id, u.name, u.email, count(o.id) as order_count, sum(o.total) as total_spent from users u left join orders o on u.id = o.user_id where u.created_at >= '2024-01-01' and u.status = 'active' group by u.id, u.name, u.email having count(o.id) > 5 order by total_spent desc limit 50;`;

/* -- Component ------------------------------------ */

export default function SQLFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState<SQLLanguage>("sql");
  const [indentSize, setIndentSize] = useState<IndentSize>(2);
  const [uppercase, setUppercase] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "sql_formatter" });
  }, []);

  const handleFormat = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      const formatted = format(input, {
        language,
        tabWidth: indentSize,
        keywordCase: uppercase ? "upper" : "preserve",
        linesBetweenQueries: 2,
      });
      setOutput(formatted);
      setError(null);
      trackEvent("tool_used", { tool: "sql_formatter", action: "format", language });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Formatting error";
      setError(message);
      setOutput("");
    }
  }, [input, language, indentSize, uppercase]);

  const handleMinify = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      // Collapse whitespace: replace multiple spaces/newlines/tabs with single space
      const minified = input
        .replace(/\s+/g, " ")
        .replace(/\s*([,;()])\s*/g, "$1")
        .replace(/\(\s*/g, "(")
        .replace(/\s*\)/g, ")")
        .trim();
      setOutput(minified);
      setError(null);
      trackEvent("tool_used", { tool: "sql_formatter", action: "minify" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Minification error";
      setError(message);
      setOutput("");
    }
  }, [input]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const loadSample = useCallback(() => {
    setInput(SAMPLE_SQL);
    setError(null);
  }, []);

  return (
    <div>
      <ToolPageHeader
        icon={Database}
        title="SQL Formatter"
        description="Format and beautify SQL queries with customizable indentation, keyword casing, and dialect support."
      />

      {/* Options */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
            Dialect
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SQLLanguage)}
            className="w-full bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
            Indent
          </label>
          <select
            value={indentSize}
            onChange={(e) => setIndentSize(Number(e.target.value) as IndentSize)}
            className="w-full bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-accent"
            />
            <span className="text-sm text-text-secondary">Uppercase keywords</span>
          </label>
        </div>
      </div>

      {/* Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs text-text-tertiary font-medium uppercase tracking-wider">
            Input SQL
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
          placeholder="Paste your SQL query here..."
          rows={8}
          className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
          spellCheck={false}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleFormat}
          disabled={!input.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="w-4 h-4" />
          Format
        </button>
        <button
          onClick={handleMinify}
          disabled={!input.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Minify
        </button>
      </div>

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
              Output
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
            rows={12}
            className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono resize-y"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
