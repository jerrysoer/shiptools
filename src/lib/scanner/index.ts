import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { Browser } from "puppeteer-core";
import type { ScanData } from "../types";
import { classifyCookies, isThirdPartyDomain, detectServerSideProcessing } from "./classify";
import { classifyDomains } from "./trackers";
import { PAGE_TIMEOUT_MS } from "../constants";

/**
 * Launch a headless browser.
 *
 * - **Vercel (production):** Uses @sparticuz/chromium which ships a compressed
 *   Chromium binary that decompresses on cold start (~5-8s).
 * - **Local dev:** Uses `puppeteer` (dev dependency) which bundles its own
 *   Chromium. Falls back to system Chrome via puppeteer-core if puppeteer
 *   isn't available.
 */
async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    // Production: use @sparticuz/chromium
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  }

  // Local dev: try full puppeteer first (bundles its own browser)
  try {
    const puppeteer = await import("puppeteer");
    return await (puppeteer.default.launch({ headless: true }) as Promise<unknown> as Promise<Browser>);
  } catch {
    // Fallback: use puppeteer-core with system Chrome
    const executablePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
      "/usr/bin/google-chrome", // Linux
      "/usr/bin/chromium-browser", // Linux alt
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Windows
    ];

    for (const p of executablePaths) {
      try {
        return await puppeteerCore.launch({
          executablePath: p,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      } catch {
        continue;
      }
    }

    throw new Error(
      "No browser found for local development. Install puppeteer (npm install -D puppeteer) or ensure Chrome is installed."
    );
  }
}

/**
 * Scan a URL for privacy metrics:
 * 1. Launch headless Chromium
 * 2. Intercept all network requests — log third-party domains
 * 3. Block images/fonts/media for speed
 * 4. Navigate with networkidle2
 * 5. Extract cookies
 * 6. Classify domains against tracker database
 */
export async function scanUrl(url: string): Promise<ScanData> {
  const browser = await getBrowser();
  const thirdPartyRequests = new Set<string>();
  let pageDomain: string;

  try {
    pageDomain = new URL(url).hostname;
    const page = await browser.newPage();

    // Block heavy resources for speed (but NOT stylesheets — blocking CSS
    // can prevent page rendering and stop lazy-loaded tracker scripts)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      try {
        const resourceType = req.resourceType();
        if (["image", "font", "media"].includes(resourceType)) {
          void req.abort().catch(() => {});
          return;
        }

        // Log third-party domains
        try {
          const reqHost = new URL(req.url()).hostname;
          if (isThirdPartyDomain(reqHost, pageDomain)) {
            thirdPartyRequests.add(reqHost);
          }
        } catch {
          // Invalid URL — skip
        }

        void req.continue().catch(() => {});
      } catch {
        // Handler error — try to unblock the request
        void req.abort().catch(() => {});
      }
    });

    // Navigate
    const startTime = Date.now();
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: PAGE_TIMEOUT_MS,
    });
    const loadTimeMs = Date.now() - startTime;

    // Wait a bit for lazy-loaded trackers
    await new Promise((r) => setTimeout(r, 2000));

    // Extract cookies
    const rawCookies = await page.cookies();
    const cookies = classifyCookies(rawCookies, pageDomain);
    const thirdPartyDomainsList = Array.from(thirdPartyRequests).sort();

    // Classify trackers
    const trackers = classifyDomains(thirdPartyDomainsList);

    // Server-side processing heuristic
    const serverSideProcessing = detectServerSideProcessing(thirdPartyDomainsList);

    return {
      url,
      domain: pageDomain,
      scannedAt: new Date().toISOString(),
      loadTimeMs,
      cookies: {
        total: cookies.length,
        firstParty: cookies.filter((c) => !c.thirdParty).length,
        thirdParty: cookies.filter((c) => c.thirdParty).length,
        items: cookies,
      },
      thirdPartyDomains: {
        total: thirdPartyDomainsList.length,
        items: thirdPartyDomainsList,
      },
      trackers,
      serverSideProcessing,
    };
  } finally {
    await browser.close();
  }
}
