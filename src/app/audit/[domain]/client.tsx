"use client";

import { useState } from "react";
import GradeReveal from "@/components/GradeReveal";
import AuditReport from "@/components/AuditReport";
import ReportCard from "@/components/ReportCard";
import type { AuditResult, ScanResponse, ScanError } from "@/lib/types";
import { exportJSON, exportCSV } from "@/lib/export";
import { Search, RefreshCw, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";

interface AuditPageClientProps {
  audit: AuditResult | null;
  slug: string;
}

export default function AuditPageClient({ audit: initialAudit, slug }: AuditPageClientProps) {
  const displayDomain = slug.replace(/-/g, ".");
  const [audit, setAudit] = useState(initialAudit);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);

  async function handleRescan() {
    setIsRescanning(true);
    setRescanError(null);
    try {
      const res = await fetch("/api/audit/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://${displayDomain}`, force: true }),
      });
      const data: ScanResponse | ScanError = await res.json();
      if (data.success) {
        setAudit(data.result);
      } else {
        setRescanError(data.error);
      }
    } catch {
      setRescanError("Re-scan failed. Please try again.");
    } finally {
      setIsRescanning(false);
    }
  }

  if (!audit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading font-bold text-2xl mb-2">
            No audit found
          </h1>
          <p className="text-text-secondary mb-6">
            No cached audit exists for <span className="font-mono">{displayDomain}</span>.
          </p>
          <a
            href="/audit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-lg text-sm font-medium transition-colors"
          >
            Run a new scan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <GradeReveal
        grade={audit.grade}
        score={audit.scores.total}
        domain={audit.domain}
      />

      <div className="flex items-center justify-center gap-4 mt-2 mb-4">
        <a
          href="/audit"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Scan another site
        </a>
        <button
          onClick={handleRescan}
          disabled={isRescanning}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
        >
          {isRescanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isRescanning ? "Re-scanning..." : "Re-scan"}
        </button>
        <button
          onClick={() => exportJSON(audit)}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <FileJson className="w-3.5 h-3.5" />
          JSON
        </button>
        <button
          onClick={() => exportCSV(audit)}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {rescanError && (
        <p className="text-center text-grade-f text-sm mb-4">{rescanError}</p>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8">
        <AuditReport result={audit} />
        <div className="lg:sticky lg:top-8 lg:self-start">
          <ReportCard result={audit} />
        </div>
      </div>
    </div>
  );
}
