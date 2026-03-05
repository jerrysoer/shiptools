"use client";

import { useState } from "react";
import {
  Lock,
  Zap,
  Eye,
  Wrench,
  Hash,
  QrCode,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScanInput from "@/components/ScanInput";
import ScanProgress from "@/components/ScanProgress";
import GradeReveal from "@/components/GradeReveal";
import AuditReport from "@/components/AuditReport";
import ReportCard from "@/components/ReportCard";
import type { AuditResult, ScanError } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

export default function HomePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanDomain, setScanDomain] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(url: string) {
    setIsScanning(true);
    setResult(null);
    setError(null);

    // Extract domain for display during scan
    try {
      const parsed = new URL(url.includes("://") ? url : `https://${url}`);
      setScanDomain(parsed.hostname);
    } catch {
      setScanDomain(url);
    }

    trackEvent("scan_started", { url });

    try {
      const res = await fetch("/api/audit/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const err = data as ScanError;
        setError(err.error);
        trackEvent("scan_error", { url, code: err.code ?? "unknown" });
        return;
      }

      setResult(data.result);
      trackEvent("scan_completed", {
        domain: data.result.domain,
        grade: data.result.grade,
      });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero — Developer & Privacy Tools */}
        <section className="px-6 pt-16 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-5">
              <Wrench className="w-7 h-7 text-accent" />
            </div>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl mb-4 leading-tight">
              Developer & Privacy Tools
            </h1>
            <p className="text-text-secondary text-lg mb-10 max-w-2xl mx-auto">
              Hash, encrypt, generate, decode, and inspect — 14 tools that run
              entirely in your browser. No data ever leaves your device.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <a
                href="/tools/hash"
                className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Hash className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold">Hash Calculator</h3>
                </div>
                <p className="text-text-tertiary text-sm">
                  MD5, SHA-1, SHA-256, SHA-512 for text and files
                </p>
              </a>

              <a
                href="/tools/qr"
                className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <QrCode className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold">QR Code Generator</h3>
                </div>
                <p className="text-text-tertiary text-sm">
                  URLs, WiFi, vCards, and text — download as PNG or SVG
                </p>
              </a>

              <a
                href="/tools/password"
                className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <KeyRound className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold">Password Generator</h3>
                </div>
                <p className="text-text-tertiary text-sm">
                  Strong passwords and passphrases with strength meter
                </p>
              </a>
            </div>

            <a
              href="/tools"
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm transition-colors"
            >
              See all 14 tools
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Converter CTA — only show when no scan result */}
        {!result && !isScanning && (
          <section className="px-6 pb-16">
            <div className="max-w-4xl mx-auto">
              <div className="border-t border-border pt-12">
                <div className="text-center mb-8">
                  <h2 className="font-heading font-semibold text-2xl mb-2">
                    Convert files without uploading them
                  </h2>
                  <p className="text-text-secondary">
                    Images, documents, and audio — all processed locally in your
                    browser.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <a
                    href="/convert/images"
                    className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Zap className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-heading font-semibold">Images</h3>
                    </div>
                    <p className="text-text-tertiary text-sm">
                      PNG, JPG, WebP, AVIF — resize, compress, convert
                    </p>
                  </a>

                  <a
                    href="/convert/documents"
                    className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Eye className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-heading font-semibold">Documents</h3>
                    </div>
                    <p className="text-text-tertiary text-sm">
                      PDF, DOCX, CSV, TXT — convert between formats
                    </p>
                  </a>

                  <a
                    href="/convert/audio"
                    className="group bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Lock className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-heading font-semibold">Audio</h3>
                    </div>
                    <p className="text-text-tertiary text-sm">
                      MP3, WAV, OGG, AAC — transcode, trim, adjust bitrate
                    </p>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Privacy Audit */}
        {!result && !isScanning && (
          <section className="px-6 pb-16">
            <div className="max-w-4xl mx-auto">
              <div className="border-t border-border pt-12">
                <div className="text-center mb-8">
                  <h2 className="font-heading font-semibold text-2xl mb-2">
                    Privacy Audit
                  </h2>
                  <p className="text-text-secondary max-w-xl mx-auto">
                    Scan any free online tool to see how many cookies, trackers,
                    and ad networks it loads. Get an instant privacy grade.
                  </p>
                </div>

                <div className="max-w-lg mx-auto">
                  <ScanInput onScan={handleScan} isScanning={isScanning} />

                  {error && (
                    <p className="text-grade-f text-sm mt-4 text-center">
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Scan progress */}
        {isScanning && (
          <section className="px-6 pb-12">
            <ScanProgress domain={scanDomain} isActive={isScanning} />
          </section>
        )}

        {/* Results */}
        {result && (
          <section className="px-6 pb-16">
            <div className="max-w-4xl mx-auto">
              <GradeReveal
                grade={result.grade}
                score={result.scores.total}
                domain={result.domain}
              />

              <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8">
                <AuditReport result={result} />
                <div className="lg:sticky lg:top-8 lg:self-start">
                  <ReportCard result={result} />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
