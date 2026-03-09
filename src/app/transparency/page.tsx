import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck, ExternalLink } from "lucide-react";
import TransparencyClient from "./TransparencyClient";

export const metadata: Metadata = {
  title: "Transparency — Uploadless",
  description:
    "See exactly what Uploadless tracks, how it compares to typical tools, and audit our analytics source code.",
};

const EVENTS = [
  {
    event: "page_view",
    description: "Page navigation",
    example: '{ path: "/tools/hash" }',
    when: "Every page load",
  },
  {
    event: "tool_opened",
    description: "Tool page visited",
    example: '{ tool: "hash" }',
    when: "Tool component mounts",
  },
  {
    event: "tool_used",
    description: "Tool action performed",
    example: '{ tool: "hash", mode: "text" }',
    when: "User completes action",
  },
  {
    event: "scan_initiated",
    description: "Privacy audit started",
    example: '{ domain: "example.com" }',
    when: "Scan request sent",
  },
  {
    event: "scan_completed",
    description: "Privacy audit finished",
    example: '{ domain: "example.com", grade: "B" }',
    when: "Scan results ready",
  },
  {
    event: "report_shared",
    description: "Report downloaded/shared",
    example: '{ method: "download" }',
    when: "Download/copy link",
  },
  {
    event: "telemetry_opted_out",
    description: "User opted out",
    example: "{}",
    when: "Opt-out button clicked",
  },
  {
    event: "ai_model_loaded",
    description: "AI model downloaded",
    example: '{ model: "..." }',
    when: "Model ready",
  },
  {
    event: "ai_tool_used",
    description: "AI feature used",
    example: '{ tool: "ai_summarizer" }',
    when: "AI action completed",
  },
  {
    event: "ai_model_deleted",
    description: "AI model removed",
    example: "{}",
    when: "Model deleted",
  },
];

const NOT_TRACKED = [
  "File names or contents",
  "IP addresses (hashed only)",
  "User agent strings",
  "Cross-session identity",
  "Keystroke patterns",
  "Clipboard contents",
  "Uploaded file data",
];

const COMPARISON = [
  {
    feature: "Cookies set",
    us: "0",
    them: "5-15",
  },
  {
    feature: "Third-party domains",
    us: "0",
    them: "10-30",
  },
  {
    feature: "IP address stored",
    us: "Hashed only",
    them: "Full IP logged",
  },
  {
    feature: "Session recording",
    us: "None",
    them: "Often present",
  },
  {
    feature: "Ad networks",
    us: "None",
    them: "2-5 networks",
  },
  {
    feature: "File contents accessible",
    us: "Never leaves browser",
    them: "Often uploaded",
  },
  {
    feature: "Opt-out available",
    us: "Yes, one click",
    them: "Rarely",
  },
  {
    feature: "Analytics source code",
    us: "Open source",
    them: "Proprietary",
  },
];

export default function TransparencyPage() {
  return (
    <>
      <Header />
      {/* Hero — editorial, left-aligned */}
      <section className="bg-bg-primary px-6 pt-12 pb-10 sm:pt-20 sm:pb-16">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
            Transparency
          </p>
          <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-text-primary mb-6 max-w-4xl">
            We believe you should know exactly what any tool does with your data.
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl leading-relaxed">
            Here is everything Uploadless tracks — and everything it
            intentionally does not.
          </p>
        </div>
      </section>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-12">
            {/* Section 1: What We Track */}
            <section>
              <h2 className="font-heading font-semibold text-2xl mb-4">
                What We Track
              </h2>
              <p className="text-text-secondary mb-4">
                Uploadless fires 10 analytics events. Each one is listed below
                with its exact payload shape.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-4 font-medium text-text-secondary">
                        Event
                      </th>
                      <th className="py-2 pr-4 font-medium text-text-secondary">
                        Description
                      </th>
                      <th className="py-2 pr-4 font-medium text-text-secondary">
                        Example Properties
                      </th>
                      <th className="py-2 font-medium text-text-secondary">
                        When Fired
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {EVENTS.map((e) => (
                      <tr key={e.event}>
                        <td className="py-2.5 pr-4">
                          <code className="text-xs bg-bg-surface px-1.5 py-0.5 font-mono">
                            {e.event}
                          </code>
                        </td>
                        <td className="py-2.5 pr-4 text-text-secondary">
                          {e.description}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-text-tertiary">
                          {e.example}
                        </td>
                        <td className="py-2.5 text-text-tertiary text-xs">
                          {e.when}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-bg-surface border border-border p-5">
                <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-grade-a" />
                  Intentionally NOT Tracked
                </h3>
                <ul className="grid sm:grid-cols-2 gap-1.5">
                  {NOT_TRACKED.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-grade-a shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 2: Live Event Log + Public Stats (client components) */}
            <TransparencyClient />

            {/* Section 3: How We Compare */}
            <section>
              <h2 className="font-heading font-semibold text-2xl mb-4">
                How We Compare
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-4 font-medium text-text-secondary">
                        Feature
                      </th>
                      <th className="py-2 pr-4 font-medium text-grade-a">
                        Uploadless
                      </th>
                      <th className="py-2 font-medium text-grade-f">
                        Typical Free Tool
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COMPARISON.map((row) => (
                      <tr key={row.feature}>
                        <td className="py-2.5 pr-4 text-text-secondary">
                          {row.feature}
                        </td>
                        <td className="py-2.5 pr-4 text-grade-a font-medium">
                          {row.us}
                        </td>
                        <td className="py-2.5 text-grade-f">{row.them}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4: Audit Our Analytics */}
            <section>
              <h2 className="font-heading font-semibold text-2xl mb-4">
                Audit Our Analytics
              </h2>
              <p className="text-text-secondary mb-4">
                Every line of our analytics code is open source. Read it, fork
                it, audit it.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href="https://github.com/jerrysoer/uploadless/blob/main/src/lib/analytics.ts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-bg-surface border border-border p-4 hover:border-border-hover transition-colors"
                >
                  <code className="text-xs font-mono text-accent">
                    analytics.ts
                  </code>
                  <ExternalLink className="w-3.5 h-3.5 text-text-tertiary ml-auto" />
                </a>
                <a
                  href="https://github.com/jerrysoer/uploadless/blob/main/src/lib/consent.ts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-bg-surface border border-border p-4 hover:border-border-hover transition-colors"
                >
                  <code className="text-xs font-mono text-accent">
                    consent.ts
                  </code>
                  <ExternalLink className="w-3.5 h-3.5 text-text-tertiary ml-auto" />
                </a>
                <a
                  href="https://github.com/jerrysoer/uploadless/blob/main/src/app/api/analytics/event/route.ts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-bg-surface border border-border p-4 hover:border-border-hover transition-colors"
                >
                  <code className="text-xs font-mono text-accent">
                    api/analytics/event
                  </code>
                  <ExternalLink className="w-3.5 h-3.5 text-text-tertiary ml-auto" />
                </a>
                <a
                  href="https://github.com/jerrysoer/uploadless/blob/main/src/app/api/analytics/aggregate/route.ts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-bg-surface border border-border p-4 hover:border-border-hover transition-colors"
                >
                  <code className="text-xs font-mono text-accent">
                    api/analytics/aggregate
                  </code>
                  <ExternalLink className="w-3.5 h-3.5 text-text-tertiary ml-auto" />
                </a>
              </div>

              <div className="mt-4 text-center">
                <a
                  href="https://github.com/jerrysoer/uploadless/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg font-medium hover:bg-accent-hover transition-colors text-sm"
                >
                  Found something? Open an issue
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
