import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditorialRule from "@/components/EditorialRule";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why we built Uploadless — privacy-first browser tools that never upload your files.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-bg-primary px-6 pt-12 pb-10 sm:pt-20 sm:pb-16">
          <div className="max-w-6xl mx-auto">
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
              About
            </p>
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-text-primary mb-6 max-w-4xl">
              We built the tools we wished existed.
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl leading-relaxed">
              Every day, millions of people upload sensitive files to free online
              tools — trusting strangers with their data because there&apos;s no
              alternative. We built one.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="bg-bg-surface px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <EditorialRule className="mb-8" />
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
              The Problem
            </p>
            <h2 className="font-heading font-semibold text-3xl sm:text-4xl text-text-primary mb-6 max-w-3xl">
              Free tools aren&apos;t free.
            </h2>
            <div className="max-w-2xl space-y-4">
              <p className="text-text-secondary leading-relaxed">
                We analyzed one of the most popular online PDF tools. What we
                found:{" "}
                <strong className="text-text-primary">637 cookies</strong> set
                on a single visit.{" "}
                <strong className="text-text-primary">
                  221 third-party domains
                </strong>{" "}
                contacted. Session recording software watching every click. Your
                files processed on someone else&apos;s server.
              </p>
              <p className="text-text-secondary leading-relaxed">
                This isn&apos;t an outlier — it&apos;s the industry standard.
                The &ldquo;free&rdquo; model depends on harvesting your data. We
                think there&apos;s a better way.
              </p>
            </div>
          </div>
        </section>

        {/* How Uploadless Works */}
        <section className="bg-bg-primary px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <EditorialRule className="mb-8" />
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
              How It Works
            </p>
            <h2 className="font-heading font-semibold text-3xl sm:text-4xl text-text-primary mb-8 sm:mb-12 max-w-3xl">
              Three principles, zero compromise.
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-bg-surface p-6 sm:p-8">
                <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-3">
                  Local-first
                </p>
                <p className="text-text-secondary leading-relaxed">
                  Your files never leave your device. Every conversion, every
                  edit, every transformation happens right in your browser using
                  WebAssembly and modern web APIs.
                </p>
              </div>
              <div className="bg-bg-surface p-6 sm:p-8">
                <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-3">
                  Transparent
                </p>
                <p className="text-text-secondary leading-relaxed">
                  Our analytics are open source. We track page views and tool
                  usage — that&apos;s it. No cookies, no fingerprinting, no
                  personal data. Check our{" "}
                  <Link
                    href="/transparency"
                    className="underline text-text-primary hover:text-text-secondary transition-colors"
                  >
                    transparency page
                  </Link>{" "}
                  to see exactly what we collect.
                </p>
              </div>
              <div className="bg-bg-surface p-6 sm:p-8">
                <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-3">
                  Open Source
                </p>
                <p className="text-text-secondary leading-relaxed">
                  Every line of code is on GitHub. Audit it, fork it, improve
                  it. Privacy claims are only as strong as the code behind them.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Privacy Auditor */}
        <section className="bg-bg-surface px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <EditorialRule className="mb-8" />
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
              The Exception
            </p>
            <h2 className="font-heading font-semibold text-3xl sm:text-4xl text-text-primary mb-6 max-w-3xl">
              One tool that needs a server.
            </h2>
            <div className="max-w-2xl space-y-4">
              <p className="text-text-secondary leading-relaxed">
                The Privacy Auditor is the only tool that doesn&apos;t run
                locally. It uses a server-side headless browser to visit websites
                and analyze their tracking behavior — something that&apos;s
                impossible from a client-side context.
              </p>
              <p className="text-text-secondary leading-relaxed">
                It loads the target page in Puppeteer, waits for all resources,
                then counts cookies, third-party domains, and known trackers.
                The result is a privacy grade from A to F, with a detailed
                breakdown you can share.
              </p>
              <p className="text-text-secondary leading-relaxed">
                Even here, we minimize data collection: your IP is hashed and
                discarded, scan results are cached for 24 hours, and no account
                is required.
              </p>
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="bg-bg-primary px-6 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <EditorialRule className="mb-8" />
            <p className="font-mono text-xs tracking-widest uppercase text-text-tertiary mb-4">
              Open Source
            </p>
            <h2 className="font-heading font-semibold text-3xl sm:text-4xl text-text-primary mb-6 max-w-3xl">
              MIT licensed. Always.
            </h2>
            <div className="max-w-2xl space-y-4">
              <p className="text-text-secondary leading-relaxed">
                Privacy claims without transparency are just marketing.
                That&apos;s why Uploadless is fully open source under the MIT
                license. Read the code, verify our claims, or build on top of
                it.
              </p>
              <p>
                <a
                  href="https://github.com/jerrysoer/uploadless"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-text-primary hover:text-text-secondary transition-colors"
                >
                  View on GitHub
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Footer CTAs */}
        <section className="bg-bg-surface px-6 py-16 sm:py-24">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/audit"
              className="bg-text-primary text-bg-primary px-6 py-3 font-mono text-sm tracking-wider uppercase hover:opacity-90 transition-opacity text-center"
            >
              Try the Privacy Auditor &rarr;
            </Link>
            <Link
              href="/tools"
              className="border border-text-primary text-text-primary px-6 py-3 font-mono text-sm tracking-wider uppercase hover:bg-bg-elevated transition-colors text-center"
            >
              Browse all tools &rarr;
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
