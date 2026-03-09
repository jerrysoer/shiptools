"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FileCheck, Upload } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* -- Types ---------------------------------------- */

type Severity = "valid" | "warning" | "error";

interface EnvIssue {
  line: number;
  key: string;
  value: string;
  severity: Severity;
  message: string;
}

interface EnvEntry {
  line: number;
  key: string;
  value: string;
  raw: string;
  issues: EnvIssue[];
}

/* -- Parser / Validator logic --------------------- */

const SECRET_PATTERNS = [
  /SECRET/i,
  /KEY/i,
  /TOKEN/i,
  /PASSWORD/i,
  /PASS/i,
  /CREDENTIAL/i,
  /AUTH/i,
  /API_KEY/i,
  /PRIVATE/i,
];

function validateEnv(content: string): { entries: EnvEntry[]; summary: { valid: number; warnings: number; errors: number } } {
  const lines = content.split("\n");
  const entries: EnvEntry[] = [];
  const seenKeys = new Map<string, number>(); // key -> first line number
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const lineNum = i + 1;
    const trimmed = raw.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    const issues: EnvIssue[] = [];

    // Check for valid KEY=VALUE format
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      issues.push({
        line: lineNum,
        key: trimmed,
        value: "",
        severity: "error",
        message: "Missing '=' sign. Expected KEY=VALUE format.",
      });
      errorCount++;
      entries.push({ line: lineNum, key: trimmed, value: "", raw, issues });
      continue;
    }

    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1);

    // Validate key format
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      issues.push({
        line: lineNum,
        key,
        value,
        severity: "error",
        message: "Invalid key name. Keys must start with a letter or underscore and contain only alphanumeric characters and underscores.",
      });
      errorCount++;
    }

    // Check for missing value
    if (value.trim() === "") {
      issues.push({
        line: lineNum,
        key,
        value,
        severity: "warning",
        message: "Empty value. This variable has no value assigned.",
      });
      warningCount++;
    }

    // Check for duplicate keys
    if (seenKeys.has(key)) {
      issues.push({
        line: lineNum,
        key,
        value,
        severity: "error",
        message: `Duplicate key. First defined on line ${seenKeys.get(key)}.`,
      });
      errorCount++;
    } else {
      seenKeys.set(key, lineNum);
    }

    // Check for unquoted values with spaces
    if (value.includes(" ") && !value.startsWith('"') && !value.startsWith("'")) {
      issues.push({
        line: lineNum,
        key,
        value,
        severity: "warning",
        message: "Value contains spaces but is not quoted. Some parsers may truncate at the first space.",
      });
      warningCount++;
    }

    // Check for potential secrets
    const isSecret = SECRET_PATTERNS.some((pattern) => pattern.test(key));
    if (isSecret && value.trim()) {
      issues.push({
        line: lineNum,
        key,
        value,
        severity: "warning",
        message: "Potential secret detected. Ensure this file is in .gitignore.",
      });
      warningCount++;
    }

    // Check for trailing whitespace in value
    if (value !== value.trimEnd() && !value.startsWith('"') && !value.startsWith("'")) {
      issues.push({
        line: lineNum,
        key,
        value,
        severity: "warning",
        message: "Value has trailing whitespace which may cause unexpected behavior.",
      });
      warningCount++;
    }

    if (issues.length === 0) {
      validCount++;
    }

    entries.push({ line: lineNum, key, value, raw, issues });
  }

  return { entries, summary: { valid: validCount, warnings: warningCount, errors: errorCount } };
}

/* -- Sample --------------------------------------- */

const SAMPLE_ENV = `# Database
DATABASE_URL=postgresql://localhost:5432/mydb
DB_PASSWORD=super_secret_123

# API Keys
API_KEY=sk-1234567890
NEXT_PUBLIC_APP_URL=https://example.com
SECRET_TOKEN=

# Problematic entries
INVALID KEY=value
APP_NAME=My Cool App
DUPLICATE_KEY=first
DUPLICATE_KEY=second
TRAILING_SPACE=hello   `;

/* -- Component ------------------------------------ */

export default function EnvValidator() {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "env_validator" });
  }, []);

  const { entries, summary } = useMemo(() => validateEnv(input), [input]);
  const hasInput = input.trim().length > 0;

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setInput(text);
        trackEvent("tool_used", { tool: "env_validator", action: "load_file" });
      }
    };
    reader.readAsText(file);
    // Reset so same file can be loaded again
    e.target.value = "";
  }, []);

  const loadSample = useCallback(() => {
    setInput(SAMPLE_ENV);
    trackEvent("tool_used", { tool: "env_validator", action: "load_sample" });
  }, []);

  const severityColor = (severity: Severity): string => {
    switch (severity) {
      case "valid": return "text-grade-a";
      case "warning": return "text-yellow-500";
      case "error": return "text-grade-f";
    }
  };

  const severityBg = (severity: Severity): string => {
    switch (severity) {
      case "valid": return "bg-grade-a/10 border-grade-a/20";
      case "warning": return "bg-yellow-500/10 border-yellow-500/20";
      case "error": return "bg-grade-f/10 border-grade-f/20";
    }
  };

  return (
    <div>
      <ToolPageHeader
        icon={FileCheck}
        title=".env Validator"
        description="Validate .env files for correct format, duplicate keys, missing values, unquoted spaces, and potential secrets."
      />

      {/* Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs text-text-tertiary font-medium uppercase tracking-wider">
            .env Content
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSample}
              className="text-xs text-text-tertiary hover:text-accent transition-colors"
            >
              Load sample
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Load file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,.env.local,.env.development,.env.production,.env.example,*"
              onChange={handleFileLoad}
              className="hidden"
            />
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your .env file content here or load a file..."
          rows={10}
          className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
          spellCheck={false}
        />
      </div>

      {/* Summary */}
      {hasInput && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-bg-surface border border-border p-4 text-center">
            <div className="text-2xl font-bold text-grade-a">{summary.valid}</div>
            <div className="text-xs text-text-tertiary uppercase tracking-wider mt-1">Valid</div>
          </div>
          <div className="bg-bg-surface border border-border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{summary.warnings}</div>
            <div className="text-xs text-text-tertiary uppercase tracking-wider mt-1">Warnings</div>
          </div>
          <div className="bg-bg-surface border border-border p-4 text-center">
            <div className="text-2xl font-bold text-grade-f">{summary.errors}</div>
            <div className="text-xs text-text-tertiary uppercase tracking-wider mt-1">Errors</div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasInput && entries.length > 0 && (
        <div className="bg-bg-surface border border-border divide-y divide-border">
          {entries.map((entry, idx) => {
            const overallSeverity: Severity = entry.issues.some((i) => i.severity === "error")
              ? "error"
              : entry.issues.some((i) => i.severity === "warning")
              ? "warning"
              : "valid";

            return (
              <div key={idx} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* Line number */}
                  <span className="text-xs text-text-tertiary font-mono mt-0.5 w-6 text-right shrink-0">
                    {entry.line}
                  </span>

                  {/* Status dot */}
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      overallSeverity === "valid"
                        ? "bg-grade-a"
                        : overallSeverity === "warning"
                        ? "bg-yellow-500"
                        : "bg-grade-f"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Key = Value */}
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-text-primary">{entry.key}</span>
                      {entry.value !== undefined && (
                        <>
                          <span className="text-text-tertiary">=</span>
                          <span className="font-mono text-sm text-text-secondary truncate max-w-xs">
                            {entry.value.length > 60 ? `${entry.value.slice(0, 60)}...` : entry.value}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Issues */}
                    {entry.issues.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {entry.issues.map((issue, j) => (
                          <div
                            key={j}
                            className={`inline-block px-2 py-0.5 rounded text-xs border mr-2 ${severityBg(issue.severity)}`}
                          >
                            <span className={severityColor(issue.severity)}>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasInput && (
        <div className="bg-bg-surface border border-border px-4 py-8 text-center">
          <p className="text-sm text-text-tertiary">
            Paste your .env content above or load a file to validate.
          </p>
        </div>
      )}
    </div>
  );
}
