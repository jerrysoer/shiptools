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
    return [
      {
        // COOP/COEP on /convert/* — required for SharedArrayBuffer (ffmpeg.wasm)
        // These headers break third-party resources, so keep them scoped
        source: "/convert/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
