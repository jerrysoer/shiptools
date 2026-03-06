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
    ];
  },
};

export default nextConfig;
