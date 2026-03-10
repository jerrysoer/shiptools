import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  turbopack: {
    root: ".",
  },

  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/analytics",
        permanent: false,
      },
      // ── Merged tools ──────────────────────────────────────────────
      { source: "/ai/tech-writing", destination: "/ai/writer", permanent: true },
      { source: "/ai/full-review", destination: "/tools", permanent: true },
      { source: "/ai/code-review", destination: "/tools", permanent: true },
      { source: "/ai/commit-msg", destination: "/ai/git-writer", permanent: true },
      { source: "/ai/pr-desc", destination: "/ai/git-writer", permanent: true },
      { source: "/tools/json", destination: "/tools/data-formatter", permanent: true },
      { source: "/tools/format-convert", destination: "/tools/data-formatter", permanent: true },
      { source: "/tools/units", destination: "/tools/numbers", permanent: true },
      { source: "/tools/tracking-pixels", destination: "/tools/email-inspector", permanent: true },
      { source: "/tools/email-headers", destination: "/tools/email-inspector", permanent: true },
      { source: "/tools/clipboard", destination: "/tools/text-cleaner", permanent: true },
      { source: "/tools/invisible-chars", destination: "/tools/text-cleaner", permanent: true },
      { source: "/convert/pdf-tools", destination: "/tools/pdf", permanent: true },
      { source: "/sign", destination: "/tools/pdf", permanent: true },
      // ── Cut tools — Write ─────────────────────────────────────────
      { source: "/tools/text", destination: "/write", permanent: true },
      { source: "/tools/wordcount", destination: "/write", permanent: true },
      { source: "/tools/case", destination: "/write", permanent: true },
      { source: "/tools/lorem", destination: "/write", permanent: true },
      // ── Cut tools — Code ──────────────────────────────────────────
      { source: "/ai/readme-gen", destination: "/tools", permanent: true },
      { source: "/ai/sql-gen", destination: "/tools", permanent: true },
      { source: "/ai/test-gen", destination: "/tools", permanent: true },
      { source: "/tools/code-screenshot", destination: "/tools", permanent: true },
      { source: "/tools/og-preview", destination: "/tools", permanent: true },
      { source: "/tools/csp", destination: "/tools", permanent: true },
      { source: "/tools/chmod", destination: "/tools", permanent: true },
      { source: "/tools/ip-calc", destination: "/tools", permanent: true },
      { source: "/tools/useragent", destination: "/tools", permanent: true },
      { source: "/tools/robots", destination: "/tools", permanent: true },
      // ── Cut tools — Media ─────────────────────────────────────────
      { source: "/convert/scan", destination: "/media", permanent: true },
      // ── Cut tools — Protect ───────────────────────────────────────
      { source: "/tools/fingerprint", destination: "/protect", permanent: true },
      { source: "/tools/file-signature", destination: "/protect", permanent: true },
    ];
  },

  async headers() {
    const coopCoepHeaders = [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
    ];
    return [
      {
        // COOP/COEP required for SharedArrayBuffer (ffmpeg.wasm, Whisper)
        // These headers break third-party resources, so keep them scoped
        source: "/convert/:path*",
        headers: coopCoepHeaders,
      },
      {
        source: "/record/:path*",
        headers: coopCoepHeaders,
      },
      {
        source: "/scan/:path*",
        headers: coopCoepHeaders,
      },
      {
        source: "/tools/waveform/:path*",
        headers: coopCoepHeaders,
      },
      {
        // SharedArrayBuffer for Transformers.js / Whisper on AI pages
        source: "/ai/:path*",
        headers: coopCoepHeaders,
      },
    ];
  },
};

export default nextConfig;
