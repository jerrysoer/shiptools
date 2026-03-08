"use client";

import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";

type ScanPhase = "idle" | "launching" | "scanning" | "grading";

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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const PHASE_LABELS: Record<ScanPhase, string> = {
  idle: "",
  launching: "Launching browser\u2026",
  scanning: "Scanning for trackers\u2026",
  grading: "Grading results\u2026",
};

export default function AuditPage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const isScanning = phase !== "idle";
  const normalizedUrl = normalizeUrl(urlInput);
  const domain = normalizedUrl ? extractDomain(normalizedUrl) : "";

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!normalizedUrl) {
        setError("Please enter a valid URL.");
        return;
      }

      setError(null);
      setPhase("launching");

      // Simulate phase progression while scan runs
      const phaseTimer1 = setTimeout(() => setPhase("scanning"), 3000);
      const phaseTimer2 = setTimeout(() => setPhase("grading"), 15000);

      try {
        const res = await fetch("/api/audit/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalizedUrl }),
        });

        const data = await res.json();

        if (data.success) {
          router.push(`/audit/${data.result.id}`);
        } else {
          setError(data.error || "Scan failed. Please try again.");
          setPhase("idle");
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
        setPhase("idle");
      } finally {
        clearTimeout(phaseTimer1);
        clearTimeout(phaseTimer2);
      }
    },
    [normalizedUrl, router],
  );

  return (
    <div>
      <ToolPageHeader
        icon={ShieldCheck}
        title="Privacy Audit"
        description="Enter any website to scan for trackers, cookies, and data collection. Get an A\u2013F privacy grade."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Website URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setError(null);
              }}
              placeholder="e.g. example.com"
              disabled={isScanning}
              className="flex-1 bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!urlInput.trim() || isScanning}
              className="px-6 py-3 bg-accent hover:bg-accent/90 text-accent-fg rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              {isScanning ? "Scanning..." : "Scan"}
            </button>
          </div>
        </div>

        {/* Progress */}
        {isScanning && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span className="text-sm text-text-secondary">
                {PHASE_LABELS[phase]}{" "}
                {domain && (
                  <span className="font-mono text-text-tertiary">{domain}</span>
                )}
              </span>
            </div>
            <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-accent animate-pulse w-full" />
            </div>
            <p className="text-text-tertiary text-xs">
              Scans typically take 10\u201330 seconds.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-grade-f/5 border border-grade-f/20 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
            <div>
              <span className="text-text-secondary">{error}</span>
              {!isScanning && (
                <button
                  type="submit"
                  className="block mt-2 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      <p className="text-text-tertiary text-xs mt-10">
        Scans are performed server-side using a headless browser. Results are cached for 24 hours.
      </p>
    </div>
  );
}
