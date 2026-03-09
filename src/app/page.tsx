import { ArrowRight, ShieldCheck, EyeOff, Lock } from "lucide-react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditorialRule from "@/components/EditorialRule";
import FeaturedToolCard from "@/components/FeaturedToolCard";
import DepartmentCard from "@/components/DepartmentCard";

export const metadata: Metadata = {
  title: 'Uploadless — Privacy-First Browser Tools',
  description: 'Privacy-first browser tools that never upload your files. Convert, sign, audit, and build — everything runs locally in your browser.',
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero — editorial, left-aligned */}
        <section className="px-6 pt-12 pb-10 sm:pt-20 sm:pb-16">
          <div className="max-w-6xl mx-auto">
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
              Local-first productivity suite
            </p>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-4 sm:mb-6 max-w-4xl">
              Tools that never
              <br />
              leave your browser
            </h1>
            <p className="text-text-secondary text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-8 sm:mb-10">
              Hash, encrypt, convert, record, sign, and build — powered by
              WebAssembly and local AI. No uploads, no accounts, no tracking.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <a
                href="/tools"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-fg font-medium transition-colors hover:bg-accent-hover w-full sm:w-auto"
              >
                Browse all tools
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/transparency"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-text-primary font-medium transition-colors hover:bg-bg-surface w-full sm:w-auto"
              >
                See What We Track
              </a>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <EditorialRule />
        </div>

        {/* The Feature — Asymmetric layout */}
        <section className="px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-6">
              Featured
            </p>
            <div className="grid lg:grid-cols-2 gap-4">
              <FeaturedToolCard
                href="/sign"
                title="Sign PDFs without uploading them"
                description="Add signatures, fill form fields, and insert dates — all processed in your browser."
                deptColor="var(--color-dept-convert)"
                deptName="Media"
                size="large"
              />
              <FeaturedToolCard
                href="/audit"
                title="Scan any website for trackers"
                description="Enter a URL to audit its privacy. Get an A–F grade for trackers, cookies, and data collection — powered by headless browser scanning."
                deptColor="var(--color-dept-privacy)"
                deptName="Protect"
                size="large"
              />
              <FeaturedToolCard
                href="/ai/summarize"
                title="AI Text Summarizer"
                description="Paste long text, get a concise summary — powered by a model running entirely in your browser."
                deptColor="var(--color-dept-ai)"
                deptName="Write"
                size="small"
              />
              <FeaturedToolCard
                href="/record/screen"
                title="Screen Recorder"
                description="Capture your screen with webcam overlay and audio. Export as WebM or MP4."
                deptColor="var(--color-dept-record)"
                deptName="Media"
                size="small"
              />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <EditorialRule />
        </div>

        {/* Departments — 4 cards matching tab structure */}
        <section className="px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-2">
              Departments
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold mb-6 sm:mb-10">
              Organized by purpose
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <DepartmentCard
                number="01"
                name="Write"
                toolCount={19}
                description="AI-powered writing, document analysis, structured extraction, and text utilities."
                href="/write"
                deptColor="var(--color-dept-ai)"
              />
              <DepartmentCard
                number="02"
                name="Code"
                toolCount={29}
                description="AI code review, generation, formatting, encoding, and DevOps utilities."
                href="/tools"
                deptColor="var(--color-dept-dev)"
              />
              <DepartmentCard
                number="03"
                name="Media"
                toolCount={15}
                description="Record, convert, and create — images, audio, video, documents, and design assets."
                href="/media"
                deptColor="var(--color-dept-record)"
              />
              <DepartmentCard
                number="04"
                name="Protect"
                toolCount={12}
                description="Encrypt files, decode JWTs, strip metadata, detect tracking, and audit privacy."
                href="/protect"
                deptColor="var(--color-dept-privacy)"
              />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <EditorialRule />
        </div>

        {/* The Promise */}
        <section className="px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold mb-8 sm:mb-12 max-w-2xl">
              Your data never leaves your device. That&apos;s the entire point.
            </h2>

            <div className="grid sm:grid-cols-3 gap-6 sm:gap-12">
              <div>
                <div className="w-12 h-12 flex items-center justify-center bg-accent/10 mb-3">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">No Uploads</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Your files never leave your device. All processing runs
                  locally in WebAssembly.
                </p>
              </div>

              <div>
                <div className="w-12 h-12 flex items-center justify-center bg-accent/10 mb-3">
                  <EyeOff className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">No Tracking</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  No third-party scripts, no ad networks, no fingerprinting.
                  Privacy-respecting analytics only.
                </p>
              </div>

              <div>
                <div className="w-12 h-12 flex items-center justify-center bg-accent/10 mb-3">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">No Accounts</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  No sign-ups, no logins, no personal data collected. Just open
                  and use.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
