"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Scan,
  Monitor,
  Cpu,
  Globe,
  Palette,
  Box,
  Type,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Types ───────────────────────────────────────────── */

interface Signal {
  label: string;
  value: string;
  uniqueness: "low" | "medium" | "high";
}

interface FingerprintSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  signals: Signal[];
}

interface FingerprintResult {
  compositeHash: string;
  sections: FingerprintSection[];
}

/* ── Helpers ─────────────────────────────────────────── */

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function uniquenessTag(u: Signal["uniqueness"]) {
  const map = {
    low: { label: "Low", cls: "bg-grade-a/15 text-grade-a" },
    medium: { label: "Med", cls: "bg-grade-c/15 text-grade-c" },
    high: { label: "High", cls: "bg-grade-f/15 text-grade-f" },
  };
  const { label, cls } = map[u];
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

/* ── Font Probe ──────────────────────────────────────── */

const TEST_FONTS = [
  "Arial",
  "Verdana",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
  "Palatino Linotype",
  "Lucida Console",
  "Tahoma",
  "Century Gothic",
  "Garamond",
  "Bookman Old Style",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Franklin Gothic Medium",
  "Segoe UI",
  "Cambria",
  "Calibri",
  "Menlo",
  "Monaco",
  "SF Pro Display",
  "Fira Code",
  "Roboto",
  "Open Sans",
  "Noto Sans",
];

function probeAvailableFonts(): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const testStr = "mmmmmmmmmmlli";
  const baseFonts = ["monospace", "sans-serif", "serif"] as const;
  const baseWidths = new Map<string, number>();

  for (const base of baseFonts) {
    ctx.font = `72px ${base}`;
    baseWidths.set(base, ctx.measureText(testStr).width);
  }

  const available: string[] = [];
  for (const font of TEST_FONTS) {
    for (const base of baseFonts) {
      ctx.font = `72px '${font}', ${base}`;
      const w = ctx.measureText(testStr).width;
      if (w !== baseWidths.get(base)) {
        available.push(font);
        break;
      }
    }
  }
  return available;
}

/* ── Canvas Fingerprint ──────────────────────────────── */

function getCanvasFingerprint(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 50;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "unavailable";

  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("ShipLocal,\ud83d\ude03", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("ShipLocal,\ud83d\ude03", 4, 17);

  return canvas.toDataURL();
}

/* ── WebGL Info ───────────────────────────────────────── */

function getWebGLInfo(): { renderer: string; vendor: string; version: string } {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl)
    return { renderer: "unavailable", vendor: "unavailable", version: "unavailable" };

  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    renderer: ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : "masked",
    vendor: ext
      ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
      : "masked",
    version: gl.getParameter(gl.VERSION),
  };
}

/* ── Collect All Signals ─────────────────────────────── */

async function collectFingerprint(): Promise<FingerprintResult> {
  // Canvas
  const canvasDataUrl = getCanvasFingerprint();
  const canvasHash = await sha256(canvasDataUrl);

  // WebGL
  const webgl = getWebGLInfo();

  // Screen
  const screen = window.screen;
  const pixelRatio = window.devicePixelRatio;

  // Fonts
  const fonts = probeAvailableFonts();
  const fontsHash = await sha256(fonts.join(","));

  // Navigator
  const nav = navigator;
  const plugins = Array.from(nav.plugins || [])
    .map((p) => p.name)
    .join(", ");

  const sections: FingerprintSection[] = [
    {
      id: "canvas",
      title: "Canvas",
      icon: Palette,
      signals: [
        {
          label: "Canvas Hash",
          value: canvasHash.slice(0, 16) + "...",
          uniqueness: "high",
        },
      ],
    },
    {
      id: "webgl",
      title: "WebGL",
      icon: Box,
      signals: [
        { label: "Renderer", value: webgl.renderer, uniqueness: "high" },
        { label: "Vendor", value: webgl.vendor, uniqueness: "medium" },
        { label: "Version", value: webgl.version, uniqueness: "low" },
      ],
    },
    {
      id: "screen",
      title: "Screen",
      icon: Monitor,
      signals: [
        {
          label: "Resolution",
          value: `${screen.width} x ${screen.height}`,
          uniqueness: "medium",
        },
        {
          label: "Color Depth",
          value: `${screen.colorDepth}-bit`,
          uniqueness: "low",
        },
        {
          label: "Pixel Ratio",
          value: `${pixelRatio}`,
          uniqueness: "medium",
        },
        {
          label: "Available Size",
          value: `${screen.availWidth} x ${screen.availHeight}`,
          uniqueness: "medium",
        },
      ],
    },
    {
      id: "browser",
      title: "Browser",
      icon: Globe,
      signals: [
        {
          label: "User Agent",
          value: nav.userAgent,
          uniqueness: "high",
        },
        {
          label: "Language",
          value: nav.language,
          uniqueness: "medium",
        },
        {
          label: "Languages",
          value: (nav.languages || []).join(", "),
          uniqueness: "high",
        },
        {
          label: "Platform",
          value: nav.platform,
          uniqueness: "medium",
        },
        {
          label: "Timezone",
          value: Intl.DateTimeFormat().resolvedOptions().timeZone,
          uniqueness: "medium",
        },
        {
          label: "Do Not Track",
          value: nav.doNotTrack ?? "unset",
          uniqueness: "low",
        },
        {
          label: "Cookies Enabled",
          value: nav.cookieEnabled ? "Yes" : "No",
          uniqueness: "low",
        },
        {
          label: "Plugins",
          value: plugins || "none",
          uniqueness: "medium",
        },
      ],
    },
    {
      id: "hardware",
      title: "Hardware",
      icon: Cpu,
      signals: [
        {
          label: "CPU Cores",
          value: `${nav.hardwareConcurrency ?? "unknown"}`,
          uniqueness: "medium",
        },
        {
          label: "Device Memory",
          value: `${(nav as unknown as Record<string, unknown>).deviceMemory ?? "unknown"} GB`,
          uniqueness: "medium",
        },
        {
          label: "Max Touch Points",
          value: `${nav.maxTouchPoints}`,
          uniqueness: "medium",
        },
      ],
    },
    {
      id: "fonts",
      title: "Fonts",
      icon: Type,
      signals: [
        {
          label: "Detected Fonts",
          value: `${fonts.length} of ${TEST_FONTS.length}`,
          uniqueness: "high",
        },
        {
          label: "Font Hash",
          value: fontsHash.slice(0, 16) + "...",
          uniqueness: "high",
        },
        {
          label: "Font List",
          value: fonts.join(", ") || "none detected",
          uniqueness: "high",
        },
      ],
    },
  ];

  // Composite hash from all high-uniqueness signals
  const allValues = sections
    .flatMap((s) => s.signals)
    .map((s) => s.value)
    .join("|");
  const compositeHash = await sha256(allValues);

  return { compositeHash, sections };
}

/* ── Component ───────────────────────────────────────── */

export default function FingerprintViewer() {
  const [result, setResult] = useState<FingerprintResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const fp = await collectFingerprint();
    setResult(fp);
    setLoading(false);
  }, []);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "fingerprint" });
    trackEvent("tool_used", { tool: "fingerprint" });
    run();
  }, [run]);

  const copyHash = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.compositeHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <ToolPageHeader
        icon={Scan}
        title="Browser Fingerprint"
        description="See what signals your browser exposes to websites. These can be combined to identify you without cookies. Nothing leaves your device."
      />

      {/* Composite Hash */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Collecting fingerprint signals...</span>
        </div>
      ) : result ? (
        <>
          <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
            <div className="text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
              Composite Fingerprint (SHA-256)
            </div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-accent break-all flex-1">
                {result.compositeHash}
              </code>
              <button
                onClick={copyHash}
                className="p-2 rounded-lg bg-bg-elevated border border-border hover:border-border-hover transition-colors shrink-0"
                title="Copy hash"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-grade-a" />
                ) : (
                  <Copy className="w-4 h-4 text-text-tertiary" />
                )}
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-3">
              This hash changes if any signal changes. Sites can use a subset of
              these signals to track you across sessions.
            </p>
          </div>

          {/* Signal Sections */}
          <div className="space-y-4">
            {result.sections.map((section) => {
              const Icon = section.icon;
              return (
                <details
                  key={section.id}
                  className="group bg-bg-surface border border-border rounded-xl"
                  open
                >
                  <summary className="flex items-center gap-3 p-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-heading font-semibold text-sm flex-1">
                      {section.title}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {section.signals.length} signal
                      {section.signals.length !== 1 ? "s" : ""}
                    </span>
                    <svg
                      className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="border-t border-border">
                    {section.signals.map((signal, i) => (
                      <div
                        key={signal.label}
                        className={`flex items-start gap-3 px-4 py-3 ${
                          i < section.signals.length - 1
                            ? "border-b border-border/50"
                            : ""
                        }`}
                      >
                        <span className="text-xs text-text-tertiary w-32 shrink-0 pt-0.5">
                          {signal.label}
                        </span>
                        <span className="font-mono text-xs text-text-secondary break-all flex-1">
                          {signal.value}
                        </span>
                        {uniquenessTag(signal.uniqueness)}
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>

          {/* Rescan button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={run}
              className="bg-accent text-accent-fg px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
            >
              Rescan
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
