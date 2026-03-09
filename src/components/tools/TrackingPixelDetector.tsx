"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Unplug,
  Search,
  Eye,
  Link2,
  Radio,
  Globe,
  AlertTriangle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { classifyDomain } from "@/lib/scanner/trackers";
import { trackEvent } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "high" | "medium" | "low";
type FindingCategory =
  | "tracking-pixel"
  | "known-tracker"
  | "utm-link"
  | "prefetch-beacon";

interface Finding {
  category: FindingCategory;
  label: string;
  detail: string;
  severity: Severity;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  FindingCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "tracking-pixel": { label: "Tracking Pixels", icon: Eye },
  "known-tracker": { label: "Known Trackers", icon: Globe },
  "utm-link": { label: "UTM Links", icon: Link2 },
  "prefetch-beacon": { label: "Prefetch Beacons", icon: Radio },
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  high: "bg-grade-f/10 text-grade-f",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-blue-500/10 text-blue-500",
};

// ---------------------------------------------------------------------------
// UTM parameter list
// ---------------------------------------------------------------------------

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
];

// ---------------------------------------------------------------------------
// Analysis engine
// ---------------------------------------------------------------------------

function analyzeHtml(html: string): Finding[] {
  const findings: Finding[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 1. Tracking pixels — <img> with 1x1 dimensions or hidden via CSS
  const images = doc.querySelectorAll("img");
  for (const img of images) {
    const src = img.getAttribute("src") || "";
    const width = img.getAttribute("width");
    const height = img.getAttribute("height");
    const style = img.getAttribute("style") || "";

    const isTiny =
      (width !== null && (width === "1" || width === "0")) ||
      (height !== null && (height === "1" || height === "0"));
    const isHidden =
      /display\s*:\s*none/i.test(style) ||
      /visibility\s*:\s*hidden/i.test(style) ||
      /opacity\s*:\s*0\b/i.test(style);

    if (isTiny || isHidden) {
      const reason = isTiny
        ? `${width || "?"}x${height || "?"} pixel`
        : "hidden via CSS";
      findings.push({
        category: "tracking-pixel",
        label: domainFromUrl(src) || "inline pixel",
        detail: `${reason} — ${truncate(src, 100)}`,
        severity: "high",
      });
    }
  }

  // 2. Known tracker domains — all elements with src/href pointing to tracker domains
  const urlAttrs = doc.querySelectorAll("[src], [href]");
  const seenTrackerDomains = new Set<string>();

  for (const el of urlAttrs) {
    const url = el.getAttribute("src") || el.getAttribute("href") || "";
    const domain = domainFromUrl(url);
    if (!domain || seenTrackerDomains.has(domain)) continue;

    const match = classifyDomain(domain);
    if (match) {
      seenTrackerDomains.add(domain);
      findings.push({
        category: "known-tracker",
        label: match.name,
        detail: `${match.category} — ${domain}`,
        severity: match.category === "advertising" ? "high" : "medium",
      });
    }
  }

  // Also scan raw HTML for tracker domains in plain-text URLs
  const urlMatches = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const rawUrl of urlMatches) {
    const domain = domainFromUrl(rawUrl);
    if (!domain || seenTrackerDomains.has(domain)) continue;

    const match = classifyDomain(domain);
    if (match) {
      seenTrackerDomains.add(domain);
      findings.push({
        category: "known-tracker",
        label: match.name,
        detail: `${match.category} — ${domain}`,
        severity: match.category === "advertising" ? "high" : "medium",
      });
    }
  }

  // 3. UTM parameters in links
  const links = doc.querySelectorAll("a[href]");
  for (const link of links) {
    const href = link.getAttribute("href") || "";
    try {
      const url = new URL(href, "https://placeholder.local");
      const foundParams = UTM_PARAMS.filter((p) => url.searchParams.has(p));
      if (foundParams.length > 0) {
        findings.push({
          category: "utm-link",
          label: domainFromUrl(href) || "link",
          detail: `${foundParams.join(", ")} — ${truncate(href, 100)}`,
          severity: "low",
        });
      }
    } catch {
      // malformed URL — skip
    }
  }

  // 4. Prefetch beacons — <link rel="prefetch|preconnect|preload"> pointing to tracker domains
  const prefetches = doc.querySelectorAll(
    'link[rel="prefetch"], link[rel="preconnect"], link[rel="preload"], link[rel="dns-prefetch"]'
  );
  for (const pf of prefetches) {
    const href = pf.getAttribute("href") || "";
    const domain = domainFromUrl(href);
    const rel = pf.getAttribute("rel") || "prefetch";
    if (domain) {
      const match = classifyDomain(domain);
      findings.push({
        category: "prefetch-beacon",
        label: match?.name || domain,
        detail: `rel="${rel}" — ${truncate(href, 100)}`,
        severity: match ? "medium" : "low",
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    // Try extracting domain from partial URL
    const match = url.match(
      /(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    );
    return match ? match[1].toLowerCase() : null;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

// ---------------------------------------------------------------------------
// Sample HTML for quick testing
// ---------------------------------------------------------------------------

const SAMPLE_HTML = `<html>
<head>
  <link rel="prefetch" href="https://www.google-analytics.com/analytics.js" />
  <link rel="preconnect" href="https://connect.facebook.net" />
</head>
<body>
  <p>Thank you for your purchase!</p>
  <img src="https://www.google-analytics.com/collect?v=1&tid=UA-12345" width="1" height="1" />
  <img src="https://www.facebook.com/tr?id=123456&ev=Purchase" style="display:none" />
  <img src="https://pixel.hotjar.com/pixel.gif" width="0" height="0" />
  <a href="https://example.com/sale?utm_source=email&utm_medium=promo&utm_campaign=spring2025">Shop Now</a>
  <a href="https://example.com/blog?utm_source=newsletter&utm_content=header">Read More</a>
  <img src="https://company.com/logo.png" width="200" height="60" alt="Logo" />
</body>
</html>`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrackingPixelDetector() {
  useEffect(() => { trackEvent("tool_opened", { tool: "tracking-pixels" }); }, []);

  const [html, setHtml] = useState("");
  const [findings, setFindings] = useState<Finding[] | null>(null);

  const handleScan = useCallback(() => {
    if (!html.trim()) return;
    setFindings(analyzeHtml(html));
    trackEvent("tool_used", { tool: "tracking-pixels" });
  }, [html]);

  const handleClear = useCallback(() => {
    setHtml("");
    setFindings(null);
  }, []);

  const handleLoadSample = useCallback(() => {
    setHtml(SAMPLE_HTML);
    setFindings(null);
  }, []);

  // Group findings by category
  const grouped = findings
    ? (Object.keys(CATEGORY_META) as FindingCategory[]).reduce(
        (acc, cat) => {
          acc[cat] = findings.filter((f) => f.category === cat);
          return acc;
        },
        {} as Record<FindingCategory, Finding[]>
      )
    : null;

  const totalFindings = findings?.length ?? 0;

  return (
    <div className="space-y-6">
      <ToolPageHeader
        icon={Unplug}
        title="Tracking Pixel Detector"
        description="Paste email HTML to detect hidden tracking pixels, known trackers, UTM parameters, and prefetch beacons."
      />

      {/* Input */}
      <div className="bg-bg-surface border border-border p-5 space-y-4">
        <label className="block text-sm font-medium text-text-secondary">
          Email HTML source
        </label>
        <textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value);
            if (findings) setFindings(null);
          }}
          placeholder="Paste the raw HTML source of an email here..."
          className="w-full h-48 bg-bg-elevated border border-border p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary resize-y focus:outline-none focus:ring-2 focus:ring-accent/40"
          spellCheck={false}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleScan}
            disabled={!html.trim()}
            className="bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            Scan
          </button>
          {html && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-border text-text-secondary hover:text-text-primary hover:border-border-hover text-sm transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
          {!html && (
            <button
              onClick={handleLoadSample}
              className="px-4 py-2 border border-border text-text-secondary hover:text-text-primary hover:border-border-hover text-sm transition-colors"
            >
              Load sample
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {findings !== null && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="bg-bg-surface border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              {totalFindings > 0 ? (
                <AlertTriangle className="w-5 h-5 text-grade-f" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-grade-a" />
              )}
              <h2 className="font-heading font-semibold text-lg">
                {totalFindings === 0
                  ? "No trackers found"
                  : `${totalFindings} finding${totalFindings === 1 ? "" : "s"} detected`}
              </h2>
            </div>

            {totalFindings > 0 && grouped && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(CATEGORY_META) as FindingCategory[]).map(
                  (cat) => {
                    const meta = CATEGORY_META[cat];
                    const Icon = meta.icon;
                    const count = grouped[cat].length;
                    return (
                      <div
                        key={cat}
                        className="bg-bg-elevated p-3 text-center"
                      >
                        <Icon className="w-4 h-4 text-text-tertiary mx-auto mb-1" />
                        <p className="text-xl font-mono font-bold text-text-primary">
                          {count}
                        </p>
                        <p className="text-text-tertiary text-xs">
                          {meta.label}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Findings table per category */}
          {grouped &&
            (Object.keys(CATEGORY_META) as FindingCategory[]).map((cat) => {
              const items = grouped[cat];
              if (items.length === 0) return null;
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;

              return (
                <div
                  key={cat}
                  className="bg-bg-surface border border-border overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                    <Icon className="w-4 h-4 text-accent" />
                    <h3 className="font-heading font-semibold text-sm">
                      {meta.label}
                    </h3>
                    <span className="ml-auto text-text-tertiary text-xs font-mono">
                      {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((f, i) => (
                      <div
                        key={`${cat}-${i}`}
                        className="px-5 py-3 flex items-start gap-3"
                      >
                        <span
                          className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${SEVERITY_CLASSES[f.severity]}`}
                        >
                          {f.severity}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-text-primary">
                            {f.label}
                          </p>
                          <p className="text-text-tertiary text-xs font-mono break-all mt-0.5">
                            {f.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
