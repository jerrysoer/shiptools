"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GradeReveal from "@/components/GradeReveal";
import AuditReport from "@/components/AuditReport";
import ReportCard from "@/components/ReportCard";
import type { AuditResult } from "@/lib/types";

interface AuditPageClientProps {
  audit: AuditResult | null;
  slug: string;
}

export default function AuditPageClient({ audit, slug }: AuditPageClientProps) {
  const displayDomain = slug.replace(/-/g, ".");

  if (!audit) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center px-6">
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
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <GradeReveal
            grade={audit.grade}
            score={audit.scores.total}
            domain={audit.domain}
          />

          <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8">
            <AuditReport result={audit} />
            <div className="lg:sticky lg:top-8 lg:self-start">
              <ReportCard result={audit} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
