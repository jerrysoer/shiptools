"use client";

import { useState, FormEvent } from "react";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeftRight } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import ComparisonReport from "@/components/ComparisonReport";
import type { AuditResult, ScanResponse, ScanError } from "@/lib/types";

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    return new URL(url).href;
  } catch {
    return "";
  }
}

export default function ComparePage() {
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<[AuditResult, AuditResult] | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalA = normalizeUrl(urlA);
    const normalB = normalizeUrl(urlB);

    if (!normalA || !normalB) {
      setError("Please enter two valid URLs.");
      return;
    }

    setError(null);
    setIsScanning(true);
    setResults(null);

    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/audit/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalA }),
        }),
        fetch("/api/audit/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalB }),
        }),
      ]);

      const dataA: ScanResponse | ScanError = await resA.json();
      const dataB: ScanResponse | ScanError = await resB.json();

      if (!dataA.success) {
        setError(`Site A: ${dataA.error}`);
        return;
      }
      if (!dataB.success) {
        setError(`Site B: ${dataB.error}`);
        return;
      }

      setResults([dataA.result, dataB.result]);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div>
      <ToolPageHeader
        icon={ArrowLeftRight}
        title="Compare Privacy"
        description="Compare two websites side-by-side. See which one respects your privacy more."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Site A
            </label>
            <input
              type="text"
              value={urlA}
              onChange={(e) => { setUrlA(e.target.value); setError(null); }}
              placeholder="e.g. canva.com"
              disabled={isScanning}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Site B
            </label>
            <input
              type="text"
              value={urlB}
              onChange={(e) => { setUrlB(e.target.value); setError(null); }}
              placeholder="e.g. figma.com"
              disabled={isScanning}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!urlA.trim() || !urlB.trim() || isScanning}
          className="w-full px-6 py-3 bg-accent hover:bg-accent/90 text-accent-fg rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning both sites…
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Compare
            </>
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-grade-f/5 border border-grade-f/20 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
            <span className="text-text-secondary">{error}</span>
          </div>
        )}
      </form>

      {results && (
        <div className="mt-8">
          <ComparisonReport resultA={results[0]} resultB={results[1]} />
        </div>
      )}
    </div>
  );
}
