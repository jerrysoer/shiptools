"use client";

import { useRef, useCallback, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, Check } from "lucide-react";
import type { AuditResult } from "@/lib/types";
import { GRADE_TEXT_CLASSES, GRADE_LABELS, GRADE_COLORS } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";

interface ReportCardProps {
  result: AuditResult;
}

export default function ReportCard({ result }: ReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-bg-primary")
        .trim();
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: bgColor || "#0F0F0F",
      });
      const link = document.createElement("a");
      link.download = `uploadless-audit-${result.domain}.png`;
      link.href = dataUrl;
      link.click();
      trackEvent("report_shared", { method: "download", domain: result.domain });
    } catch (err) {
      console.error("Failed to generate report card image:", err);
    }
  }, [result.domain]);

  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    const slug = result.domain.replace(/\./g, "-");
    const url = `${window.location.origin}/audit/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent("report_shared", { method: "copy_link", domain: result.domain });
  }, [result.domain]);

  const { grade, scores, scan } = result;

  return (
    <div className="space-y-4">
      {/* Downloadable card */}
      <div
        ref={cardRef}
        className="bg-bg-surface border border-border rounded-xl p-8 max-w-md mx-auto"
      >
        <div className="text-center mb-6">
          <p className="text-text-tertiary text-xs font-mono mb-3">
            PRIVACY AUDIT REPORT
          </p>
          <p className="text-text-primary font-heading font-semibold text-lg mb-4">
            {result.displayUrl}
          </p>

          {/* Grade */}
          <div className="inline-block">
            <span
              className={`text-7xl font-heading font-bold ${GRADE_TEXT_CLASSES[grade]}`}
              style={{ filter: `drop-shadow(0 0 20px ${GRADE_COLORS[grade]})` }}
            >
              {grade}
            </span>
          </div>
          <p className={`text-sm font-medium mt-2 ${GRADE_TEXT_CLASSES[grade]}`}>
            {GRADE_LABELS[grade]} — {scores.total}/100
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-text-primary">
              {scan.cookies.thirdParty}
            </p>
            <p className="text-text-tertiary text-xs">3rd-party cookies</p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-text-primary">
              {scan.thirdPartyDomains.total}
            </p>
            <p className="text-text-tertiary text-xs">3rd-party domains</p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-text-primary">
              {scan.trackers.advertising.length}
            </p>
            <p className="text-text-tertiary text-xs">Ad networks</p>
          </div>
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-2xl font-mono font-bold text-text-primary">
              {scan.trackers.sessionRecording.length}
            </p>
            <p className="text-text-tertiary text-xs">Session recorders</p>
          </div>
        </div>

        <p className="text-text-tertiary text-[10px] font-mono text-center mt-4">
          uploadless.dev · Audited {new Date(scan.scannedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-fg rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-grade-a" /> : <Share2 className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
