"use client";

import { useState, useEffect, useMemo } from "react";
import { GitCompare, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

// ── LCS-based line diff ────────────────────────────────
type DiffLine = {
  type: "added" | "removed" | "unchanged";
  text: string;
  lineNumOld?: number;
  lineNumNew?: number;
};

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({
        type: "unchanged",
        text: oldLines[i - 1],
        lineNumOld: i,
        lineNumNew: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", text: newLines[j - 1], lineNumNew: j });
      j--;
    } else {
      result.push({ type: "removed", text: oldLines[i - 1], lineNumOld: i });
      i--;
    }
  }

  return result.reverse();
}

export default function TextDiff() {
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [diffResult, setDiffResult] = useState<DiffLine[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "diff" });
  }, []);

  const stats = useMemo(() => {
    if (!diffResult) return null;
    const added = diffResult.filter((d) => d.type === "added").length;
    const removed = diffResult.filter((d) => d.type === "removed").length;
    const unchanged = diffResult.filter((d) => d.type === "unchanged").length;
    return { added, removed, unchanged };
  }, [diffResult]);

  const handleCompare = () => {
    const result = computeDiff(oldText, newText);
    setDiffResult(result);
    trackEvent("tool_used", { tool: "diff" });
  };

  const handleCopyDiff = async () => {
    if (!diffResult) return;
    const text = diffResult
      .map((d) => {
        const prefix =
          d.type === "added" ? "+ " : d.type === "removed" ? "- " : "  ";
        return prefix + d.text;
      })
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <ToolPageHeader
        icon={GitCompare}
        title="Text Diff / Compare"
        description="Compare two text blocks side by side. Additions and deletions are highlighted."
      />

      {/* Input textareas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Original
          </label>
          <textarea
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder="Paste original text..."
            className="w-full h-48 bg-transparent text-sm font-mono resize-none outline-none placeholder:text-text-tertiary"
          />
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Modified
          </label>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste modified text..."
            className="w-full h-48 bg-transparent text-sm font-mono resize-none outline-none placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Compare button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleCompare}
          disabled={!oldText && !newText}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-fg font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GitCompare className="w-4 h-4" />
          Compare
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/40" />
            <span className="text-text-secondary">
              {stats.added} added
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/40" />
            <span className="text-text-secondary">
              {stats.removed} removed
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-bg-elevated border border-border" />
            <span className="text-text-secondary">
              {stats.unchanged} unchanged
            </span>
          </span>
        </div>
      )}

      {/* Diff output */}
      {diffResult && (
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">
              Diff Output
            </span>
            <button
              onClick={handleCopyDiff}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-accent text-accent-fg hover:bg-accent/90 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <tbody>
                {diffResult.map((line, idx) => (
                  <tr
                    key={idx}
                    className={
                      line.type === "added"
                        ? "bg-green-500/10"
                        : line.type === "removed"
                        ? "bg-red-500/10"
                        : ""
                    }
                  >
                    <td className="px-3 py-0.5 text-text-tertiary text-right select-none w-10 border-r border-border">
                      {line.lineNumOld ?? ""}
                    </td>
                    <td className="px-3 py-0.5 text-text-tertiary text-right select-none w-10 border-r border-border">
                      {line.lineNumNew ?? ""}
                    </td>
                    <td className="px-2 py-0.5 select-none w-6 text-center">
                      <span
                        className={
                          line.type === "added"
                            ? "text-green-500"
                            : line.type === "removed"
                            ? "text-red-500"
                            : "text-text-tertiary"
                        }
                      >
                        {line.type === "added"
                          ? "+"
                          : line.type === "removed"
                          ? "-"
                          : " "}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 whitespace-pre">
                      {line.text || " "}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
