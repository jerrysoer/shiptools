"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Fingerprint,
  Copy,
  Check,
  RefreshCw,
  Download,
  ClipboardCopy,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type UuidFormat = "lowercase" | "uppercase" | "no-dashes";

function formatUuid(uuid: string, format: UuidFormat): string {
  switch (format) {
    case "uppercase":
      return uuid.toUpperCase();
    case "no-dashes":
      return uuid.replace(/-/g, "");
    default:
      return uuid;
  }
}

export default function UuidGenerator() {
  useEffect(() => { trackEvent("tool_opened", { tool: "uuid" }); }, []);

  const [count, setCount] = useState(1);
  const [format, setFormat] = useState<UuidFormat>("lowercase");
  const [uuids, setUuids] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = useCallback(() => {
    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      generated.push(crypto.randomUUID());
    }
    setUuids(generated);
    setCopiedIndex(null);
    setCopiedAll(false);
    trackEvent("tool_used", { tool: "uuid" });
  }, [count]);

  // Generate on mount and when count changes
  useEffect(() => {
    generate();
  }, [generate]);

  const formattedUuids = uuids.map((u) => formatUuid(u, format));

  const handleCopyOne = async (index: number) => {
    await navigator.clipboard.writeText(formattedUuids[index]);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(formattedUuids.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedUuids.join("\n")], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids-${uuids.length}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <ToolPageHeader
        icon={Fingerprint}
        title="UUID Generator"
        description="Generate cryptographically secure v4 UUIDs in bulk."
      />

      {/* Controls */}
      <div className="bg-bg-surface border border-border p-6 mb-6">
        {/* Count Slider */}
        <div className="mb-5">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-text-secondary">Count</label>
            <span className="text-sm font-mono text-text-primary">{count}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-text-tertiary mt-1">
            <span>1</span>
            <span>100</span>
          </div>
        </div>

        {/* Format Options */}
        <div>
          <label className="text-sm text-text-secondary block mb-2">
            Format
          </label>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: "lowercase", label: "lowercase" },
                { value: "uppercase", label: "UPPERCASE" },
                { value: "no-dashes", label: "No dashes" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFormat(value)}
                className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
                  format === value
                    ? "bg-accent text-accent-fg border-accent"
                    : "bg-bg-elevated border-border hover:border-border-hover"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-accent-fg px-4 py-2.5 hover:bg-accent/90 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Generate
        </button>
      </div>

      {/* UUID List */}
      {uuids.length > 0 && (
        <div className="bg-bg-surface border border-border overflow-hidden mb-6">
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-border">
            {formattedUuids.map((uuid, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-elevated/50 group"
              >
                <span className="text-xs text-text-tertiary w-8 text-right shrink-0">
                  {i + 1}
                </span>
                <code className="font-mono text-sm flex-1 select-all break-all">
                  {uuid}
                </code>
                <button
                  onClick={() => handleCopyOne(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-bg-elevated shrink-0"
                  title="Copy UUID"
                >
                  {copiedIndex === i ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 p-4 border-t border-border">
            <button
              onClick={handleCopyAll}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 transition-colors text-sm"
            >
              {copiedAll ? (
                <Check className="w-4 h-4" />
              ) : (
                <ClipboardCopy className="w-4 h-4" />
              )}
              {copiedAll ? "Copied All" : "Copy All"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 bg-bg-elevated border border-border px-4 py-2 hover:bg-bg-surface transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Download TXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
