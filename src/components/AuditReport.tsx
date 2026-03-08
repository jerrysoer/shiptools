"use client";

import { useState } from "react";
import type { AuditResult, TrackerMatch } from "@/lib/types";
import { GRADE_TEXT_CLASSES, GRADE_LABELS } from "@/lib/constants";
import {
  Cookie,
  Globe,
  Video,
  Megaphone,
  BarChart3,
  Fingerprint,
  Timer,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import AIChip from "@/components/AIChip";
import AIStreamOutput from "@/components/AIStreamOutput";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { trackEvent } from "@/lib/analytics";

function formatCookieDuration(expires: number): string {
  if (expires <= 0) return "Session";
  const now = Date.now() / 1000;
  const diffSec = expires - now;
  if (diffSec <= 0) return "Expired";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h`;
  if (diffSec < 86400 * 365) return `${Math.round(diffSec / 86400)}d`;
  return `${(diffSec / (86400 * 365)).toFixed(1)}y`;
}

interface AuditReportProps {
  result: AuditResult;
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color =
    score >= 75
      ? "bg-grade-a"
      : score >= 50
        ? "bg-grade-c"
        : "bg-grade-f";

  return (
    <div className="flex items-center gap-3">
      <div className="text-text-tertiary w-5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary truncate">{label}</span>
          <span className="text-text-primary font-mono">{score}/100</span>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AuditReport({ result }: AuditReportProps) {
  const { scan, scores, grade } = result;
  const { streamInfer } = useLocalAI();
  const [aiExplanation, setAiExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [showAllCookies, setShowAllCookies] = useState(false);
  const [showAllDomains, setShowAllDomains] = useState(false);
  const [showAllTrackers, setShowAllTrackers] = useState(false);

  const allTrackers = [
    ...scan.trackers.sessionRecording.map((t) => `${t.name} (session recording) - ${t.domain}`),
    ...scan.trackers.advertising.map((t) => `${t.name} (advertising) - ${t.domain}`),
    ...scan.trackers.analytics.map((t) => `${t.name} (analytics) - ${t.domain}`),
  ];

  async function explainTrackers() {
    if (allTrackers.length === 0) return;
    setAiExplanation("");
    setIsExplaining(true);
    try {
      await streamInfer(
        `Trackers found on ${result.domain}:\n${allTrackers.join("\n")}`,
        PROMPTS.auditExplainer,
        (token) => setAiExplanation((prev) => prev + token)
      );
      trackEvent("tool_used", { tool: "ai_audit_explainer" });
    } catch {
      setAiExplanation("Failed to generate explanation. Please try again.");
    } finally {
      setIsExplaining(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Score breakdown */}
      <div className="bg-bg-surface border border-border rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg mb-4">Score Breakdown</h2>
        <div className="space-y-4">
          <ScoreBar
            label={`Third-party cookies (${scan.cookies.thirdParty})`}
            score={scores.thirdPartyCookies}
            icon={<Cookie className="w-4 h-4" />}
          />
          <ScoreBar
            label={`Third-party domains (${scan.thirdPartyDomains.total})`}
            score={scores.thirdPartyDomains}
            icon={<Globe className="w-4 h-4" />}
          />
          <ScoreBar
            label={`Session recording (${scan.trackers.sessionRecording.length} found)`}
            score={scores.sessionRecording}
            icon={<Video className="w-4 h-4" />}
          />
          <ScoreBar
            label={`Ad networks (${scan.trackers.advertising.length} found)`}
            score={scores.adNetworks}
            icon={<Megaphone className="w-4 h-4" />}
          />
          <ScoreBar
            label={`Analytics trackers (${scan.trackers.analytics.length} found)`}
            score={scores.analyticsTrackers}
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <ScoreBar
            label={`Fingerprinting (${scan.fingerprinting?.length ?? 0} technique${(scan.fingerprinting?.length ?? 0) !== 1 ? "s" : ""} detected)`}
            score={scores.fingerprinting}
            icon={<Fingerprint className="w-4 h-4" />}
          />
          <ScoreBar
            label="Cookie duration"
            score={scores.cookieDuration}
            icon={<Timer className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Cookie details */}
      <div className="bg-bg-surface border border-border rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg mb-2">
          Cookies ({scan.cookies.total})
        </h2>
        <p className="text-text-tertiary text-sm mb-4">
          {scan.cookies.firstParty} first-party, {scan.cookies.thirdParty} third-party
        </p>

        {scan.cookies.items.length > 0 && (() => {
          const INITIAL_COUNT = 20;
          const displayedCookies = showAllCookies
            ? scan.cookies.items
            : scan.cookies.items.slice(0, INITIAL_COUNT);
          const hiddenCount = scan.cookies.items.length - INITIAL_COUNT;

          return (
            <div>
              <div className={showAllCookies ? "max-h-96 overflow-y-auto" : ""}>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-text-tertiary border-b border-border">
                      <th className="text-left pb-2 pr-4">Name</th>
                      <th className="text-left pb-2 pr-4">Domain</th>
                      <th className="text-left pb-2 pr-4">Duration</th>
                      <th className="text-left pb-2 pr-4">SameSite</th>
                      <th className="text-left pb-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCookies.map((cookie, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 text-text-secondary truncate max-w-[180px]">
                          {cookie.name}
                        </td>
                        <td className="py-1.5 pr-4 text-text-tertiary truncate max-w-[160px]">
                          {cookie.domain}
                        </td>
                        <td className="py-1.5 pr-4 text-text-tertiary">
                          {formatCookieDuration(cookie.expires)}
                        </td>
                        <td className="py-1.5 pr-4 text-text-tertiary">
                          {cookie.sameSite}
                        </td>
                        <td className="py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              cookie.thirdParty
                                ? "bg-grade-f/10 text-grade-f"
                                : "bg-grade-a/10 text-grade-a"
                            }`}
                          >
                            {cookie.thirdParty ? "3rd party" : "1st party"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hiddenCount > 0 && !showAllCookies && (
                <button
                  onClick={() => setShowAllCookies(true)}
                  className="flex items-center gap-1 mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  Show all {scan.cookies.items.length} cookies
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Third-party domains */}
      {scan.thirdPartyDomains.items.length > 0 && (() => {
        // Build a lookup from domain → tracker info for tooltips
        const domainTrackerMap = new Map<string, TrackerMatch>();
        for (const category of ["analytics", "advertising", "sessionRecording", "social"] as const) {
          for (const t of scan.trackers[category]) {
            const cleanDomain = t.domain.replace(/^inline:/, "");
            domainTrackerMap.set(cleanDomain, t);
          }
        }

        const COLLAPSED_DOMAIN_COUNT = 12;
        const allDomains = scan.thirdPartyDomains.items;
        const displayedDomains = showAllDomains
          ? allDomains
          : allDomains.slice(0, COLLAPSED_DOMAIN_COUNT);
        const hiddenDomainCount = allDomains.length - COLLAPSED_DOMAIN_COUNT;

        return (
          <div className="bg-bg-surface border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">
              Third-Party Domains
              <span className="text-text-tertiary font-normal text-sm ml-2">
                {scan.thirdPartyDomains.total}
              </span>
            </h2>
            <div className={showAllDomains ? "max-h-80 overflow-y-auto" : ""}>
              <div className="flex flex-wrap gap-2">
                {displayedDomains.map((domain) => {
                  const tracker = domainTrackerMap.get(domain);
                  const categoryColors: Record<string, string> = {
                    analytics: "border-grade-c/40",
                    advertising: "border-grade-d/40",
                    "session-recording": "border-grade-f/40",
                    social: "border-grade-b/40",
                  };
                  const borderClass = tracker
                    ? categoryColors[tracker.category] || "border-border"
                    : "border-transparent";

                  return (
                    <span
                      key={domain}
                      title={tracker ? `${tracker.name} (${tracker.category})` : "Unclassified"}
                      className={`inline-flex items-center gap-1 px-2 py-1 bg-bg-elevated rounded text-xs text-text-secondary font-mono border ${borderClass} cursor-default`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {domain}
                    </span>
                  );
                })}
              </div>
            </div>
            {hiddenDomainCount > 0 && (
              <button
                onClick={() => setShowAllDomains((prev) => !prev)}
                className="flex items-center gap-1 mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                {showAllDomains ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show all {allDomains.length} domains
                  </>
                )}
              </button>
            )}
          </div>
        );
      })()}

      {/* Trackers found */}
      {(scan.trackers.analytics.length > 0 ||
        scan.trackers.advertising.length > 0 ||
        scan.trackers.sessionRecording.length > 0) && (() => {
        const COLLAPSED_TRACKER_COUNT = 10;
        const categoryConfig: { key: "sessionRecording" | "advertising" | "analytics"; label: string; colorClass: string }[] = [
          { key: "sessionRecording", label: "recorder", colorClass: "bg-grade-f/10 text-grade-f" },
          { key: "advertising", label: "ads", colorClass: "bg-grade-d/10 text-grade-d" },
          { key: "analytics", label: "analytics", colorClass: "bg-grade-c/10 text-grade-c" },
        ];
        const flatTrackers = categoryConfig.flatMap(({ key, label, colorClass }) =>
          scan.trackers[key].map((t) => ({ ...t, label, colorClass }))
        );
        const displayedTrackers = showAllTrackers
          ? flatTrackers
          : flatTrackers.slice(0, COLLAPSED_TRACKER_COUNT);
        const hiddenTrackerCount = flatTrackers.length - COLLAPSED_TRACKER_COUNT;

        return (
          <div className="bg-bg-surface border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">
              Identified Trackers
              <span className="text-text-tertiary font-normal text-sm ml-2">
                {flatTrackers.length}
              </span>
            </h2>
            <div className={showAllTrackers ? "max-h-80 overflow-y-auto" : ""}>
              <div className="space-y-3">
                {displayedTrackers.map((t) => (
                  <div key={`${t.label}-${t.name}`} className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs ${t.colorClass}`}>
                      {t.label}
                    </span>
                    <span className="text-text-primary">{t.name}</span>
                    <span className="text-text-tertiary font-mono text-xs">{t.domain}</span>
                  </div>
                ))}
              </div>
            </div>
            {hiddenTrackerCount > 0 && (
              <button
                onClick={() => setShowAllTrackers((prev) => !prev)}
                className="flex items-center gap-1 mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                {showAllTrackers ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show all {flatTrackers.length} trackers
                  </>
                )}
              </button>
            )}
          </div>
        );
      })()}

      {/* Fingerprinting techniques */}
      {scan.fingerprinting && scan.fingerprinting.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">
            <Fingerprint className="w-5 h-5 inline-block mr-2 text-grade-f" />
            Fingerprinting Detected
          </h2>
          <p className="text-text-tertiary text-sm mb-3">
            Browser fingerprinting survives cookie clearing, private browsing, and VPNs.
          </p>
          <div className="flex flex-wrap gap-2">
            {scan.fingerprinting.map((technique) => {
              const labels: Record<string, string> = {
                canvas: "Canvas Fingerprinting",
                webgl: "WebGL Fingerprinting",
                audio: "AudioContext Fingerprinting",
              };
              return (
                <span
                  key={technique}
                  className="px-2 py-1 bg-grade-f/10 text-grade-f rounded text-xs font-mono"
                >
                  {labels[technique] ?? technique}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Security headers (informational) */}
      {scan.securityHeaders && (
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">
            <ShieldAlert className="w-5 h-5 inline-block mr-2 text-text-tertiary" />
            Security Headers
          </h2>
          <p className="text-text-tertiary text-xs mb-3">
            Informational — not included in privacy grade
          </p>
          <div className="space-y-2">
            {Object.entries(scan.securityHeaders).map(([header, value]) => (
              <div key={header} className="flex items-center gap-2 text-sm">
                {value ? (
                  <Check className="w-4 h-4 text-grade-a flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-grade-f flex-shrink-0" />
                )}
                <span className="font-mono text-xs text-text-secondary">{header}</span>
                {value && (
                  <span className="text-text-tertiary text-xs truncate max-w-[300px]">
                    {value.length > 60 ? `${value.slice(0, 60)}…` : value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Tracker Explainer */}
      {allTrackers.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-lg">AI Explainer</h2>
            <AIChip
              label="Explain trackers"
              onClick={explainTrackers}
              disabled={isExplaining}
            />
          </div>
          <AIStreamOutput content={aiExplanation} isStreaming={isExplaining} />
          {!aiExplanation && !isExplaining && (
            <p className="text-text-tertiary text-sm">
              Click &ldquo;Explain trackers&rdquo; to get a plain-English explanation of each tracker found.
            </p>
          )}
        </div>
      )}

      {/* Scan meta */}
      <div className="text-center text-text-tertiary text-xs font-mono space-y-1">
        <div>
          Scanned at {new Date(scan.scannedAt).toLocaleString()} · Load time: {scan.loadTimeMs}ms
        </div>
        {scan.consent?.bannerClicked && (
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            <span>
              Cookie consent banner{scan.consent.cmpName ? ` (${scan.consent.cmpName})` : ""} detected and accepted to reveal full tracking profile
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
