import { ArrowRight, ShieldCheck, EyeOff, Lock } from "lucide-react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditorialRule from "@/components/EditorialRule";
import FeaturedToolCard from "@/components/FeaturedToolCard";
import DepartmentCard from "@/components/DepartmentCard";

export const metadata: Metadata = {
  title: "BrowserShip — Local-first productivity suite",
  description:
    "Developer & privacy tools that run entirely in your browser. Hash, encrypt, convert, sign — no uploads, no tracking.",
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-text-primary text-bg-primary font-medium transition-opacity hover:opacity-90 w-full sm:w-auto"
              >
                Browse all tools
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/ai/models"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-text-primary font-medium transition-colors hover:bg-bg-surface w-full sm:w-auto"
              >
                Manage AI Models
              </a>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <EditorialRule />
        </div>

        {/* TODO: Workflow Section — future roadmap (chain tools into pipelines) */}

        {/* The Feature — Asymmetric layout */}
        <section className="px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-6">
              Featured
            </p>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <FeaturedToolCard
                  href="/sign"
                  title="Sign PDFs without uploading them"
                  description="Add signatures, fill form fields, and insert dates — all processed in your browser. No server, no account required. Your documents stay on your device."
                  deptColor="var(--color-dept-convert)"
                  size="large"
                />
              </div>
              <div className="flex flex-col gap-4">
                <FeaturedToolCard
                  href="/ai/summarize"
                  title="AI Text Summarizer"
                  description="Paste long text, get a concise summary — powered by a model running entirely in your browser."
                  deptColor="var(--color-dept-ai)"
                  size="small"
                />
                <FeaturedToolCard
                  href="/record/screen"
                  title="Screen Recorder"
                  description="Capture your screen with webcam overlay and audio. Export as WebM or MP4."
                  deptColor="var(--color-dept-record)"
                  size="small"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          <EditorialRule />
        </div>

        {/* Departments */}
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
                name="All Tools"
                toolCount={62}
                description="Developer, AI, and privacy tools — hash, encode, generate, review code, analyze documents, and more."
                href="/tools"
                deptColor="var(--color-dept-dev)"
              />
              <DepartmentCard
                number="02"
                name="Record & Capture"
                toolCount={3}
                description="Screen recordings, audio capture, and meeting notes — processed on your device."
                href="/record"
                deptColor="var(--color-dept-record)"
              />
              <DepartmentCard
                number="03"
                name="Convert"
                toolCount={8}
                description="Images, documents, audio, and video — all processed locally with WebAssembly. No uploads."
                href="/convert"
                deptColor="var(--color-dept-convert)"
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
                <ShieldCheck className="w-6 h-6 mb-3 text-text-secondary" />
                <h3 className="font-heading font-semibold text-lg mb-2">No Uploads</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Your files never leave your device. All processing runs
                  locally in WebAssembly.
                </p>
              </div>

              <div>
                <EyeOff className="w-6 h-6 mb-3 text-text-secondary" />
                <h3 className="font-heading font-semibold text-lg mb-2">No Tracking</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  No third-party scripts, no ad networks, no fingerprinting.
                  Privacy-respecting analytics only.
                </p>
              </div>

              <div>
                <Lock className="w-6 h-6 mb-3 text-text-secondary" />
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
