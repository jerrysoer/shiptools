"use client";

import type { AuditResult } from "@/lib/types";
import { GRADE_TEXT_CLASSES, GRADE_COLORS } from "@/lib/constants";

interface ComparisonReportProps {
  resultA: AuditResult;
  resultB: AuditResult;
}

function ComparisonRow({
  label,
  valueA,
  valueB,
  lowerIsBetter = true,
}: {
  label: string;
  valueA: number;
  valueB: number;
  lowerIsBetter?: boolean;
}) {
  const aWins = lowerIsBetter ? valueA < valueB : valueA > valueB;
  const bWins = lowerIsBetter ? valueB < valueA : valueB > valueA;
  const tie = valueA === valueB;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center py-2 border-b border-border/50">
      <span
        className={`text-right font-mono text-sm ${aWins ? "text-grade-a font-bold" : tie ? "text-text-secondary" : "text-text-tertiary"}`}
      >
        {valueA}
      </span>
      <span className="text-text-tertiary text-xs text-center min-w-[120px]">
        {label}
      </span>
      <span
        className={`text-left font-mono text-sm ${bWins ? "text-grade-a font-bold" : tie ? "text-text-secondary" : "text-text-tertiary"}`}
      >
        {valueB}
      </span>
    </div>
  );
}

export default function ComparisonReport({ resultA, resultB }: ComparisonReportProps) {
  const { scan: a, scores: scoresA } = resultA;
  const { scan: b, scores: scoresB } = resultB;

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-6">
      {/* Grade header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
        <div className="text-center">
          <p className="text-text-secondary text-sm font-mono mb-2">
            {resultA.domain}
          </p>
          <span
            className={`text-6xl font-heading font-bold ${GRADE_TEXT_CLASSES[resultA.grade]}`}
            style={{ filter: `drop-shadow(0 0 16px ${GRADE_COLORS[resultA.grade]})` }}
          >
            {resultA.grade}
          </span>
          <p className="text-text-tertiary text-sm mt-1 font-mono">
            {scoresA.total}/100
          </p>
        </div>

        <span className="text-text-tertiary text-2xl font-heading">vs</span>

        <div className="text-center">
          <p className="text-text-secondary text-sm font-mono mb-2">
            {resultB.domain}
          </p>
          <span
            className={`text-6xl font-heading font-bold ${GRADE_TEXT_CLASSES[resultB.grade]}`}
            style={{ filter: `drop-shadow(0 0 16px ${GRADE_COLORS[resultB.grade]})` }}
          >
            {resultB.grade}
          </span>
          <p className="text-text-tertiary text-sm mt-1 font-mono">
            {scoresB.total}/100
          </p>
        </div>
      </div>

      {/* Metrics comparison */}
      <div>
        <ComparisonRow
          label="3rd-party cookies"
          valueA={a.cookies.thirdParty}
          valueB={b.cookies.thirdParty}
        />
        <ComparisonRow
          label="3rd-party domains"
          valueA={a.thirdPartyDomains.total}
          valueB={b.thirdPartyDomains.total}
        />
        <ComparisonRow
          label="Ad networks"
          valueA={a.trackers.advertising.length}
          valueB={b.trackers.advertising.length}
        />
        <ComparisonRow
          label="Analytics trackers"
          valueA={a.trackers.analytics.length}
          valueB={b.trackers.analytics.length}
        />
        <ComparisonRow
          label="Session recorders"
          valueA={a.trackers.sessionRecording.length}
          valueB={b.trackers.sessionRecording.length}
        />
        <ComparisonRow
          label="Fingerprinting"
          valueA={a.fingerprinting?.length ?? 0}
          valueB={b.fingerprinting?.length ?? 0}
        />
        <ComparisonRow
          label="Total cookies"
          valueA={a.cookies.total}
          valueB={b.cookies.total}
        />
        <ComparisonRow
          label="Overall score"
          valueA={scoresA.total}
          valueB={scoresB.total}
          lowerIsBetter={false}
        />
      </div>
    </div>
  );
}
