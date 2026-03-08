import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { Browser, Page } from "puppeteer-core";
import type { ScanData, TrackerMatch } from "../types";
import { classifyCookies, isThirdPartyDomain, detectServerSideProcessing } from "./classify";
import { classifyDomain, classifyDomains, INLINE_SCRIPT_PATTERNS } from "./trackers";
import { PAGE_TIMEOUT_MS } from "../constants";

/** Stealth browser args to avoid headless detection */
const STEALTH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-sandbox",
  "--disable-setuid-sandbox",
];

/**
 * Apply anti-bot stealth techniques to a page.
 *
 * Cloudflare, PerimeterX, and similar bot-detection services check:
 * - navigator.webdriver (true in headless = instant block)
 * - window.chrome.runtime (missing = headless)
 * - navigator.plugins (empty = headless)
 * - navigator.languages (missing/wrong = headless)
 * - permissions.query behavior
 */
async function applyStealthTechniques(page: Page): Promise<void> {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1920, height: 1080 });

  await page.evaluateOnNewDocument(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, "webdriver", { get: () => false });

    // Fake chrome.runtime (Chromium-based browsers have this)
    const win = window as unknown as Record<string, unknown>;
    if (!win.chrome) {
      Object.defineProperty(window, "chrome", { value: {} });
    }
    const chromeObj = win.chrome as Record<string, unknown>;
    if (!chromeObj.runtime) {
      Object.defineProperty(chromeObj, "runtime", { value: {} });
    }

    // Fake plugins (headless has 0 plugins)
    Object.defineProperty(navigator, "plugins", {
      get: () => [
        { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
        { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
        { name: "Native Client", filename: "internal-nacl-plugin" },
      ],
    });

    // Fake languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });

    // Override permissions.query to not reveal automation
    const originalQuery = window.navigator.permissions.query.bind(
      window.navigator.permissions
    );
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === "notifications") {
        return Promise.resolve({ state: "denied", onchange: null } as PermissionStatus);
      }
      return originalQuery(parameters);
    };
  });
}

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
      args: [...chromium.args, ...STEALTH_ARGS],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  }

  // Local dev: try full puppeteer first (bundles its own browser)
  try {
    const puppeteer = await import("puppeteer");
    return await (puppeteer.default.launch({
      headless: true,
      args: STEALTH_ARGS,
    }) as Promise<unknown> as Promise<Browser>);
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
          args: STEALTH_ARGS,
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
 * Extract trackers from <script> tags in the page DOM.
 *
 * Two detection vectors:
 * 1. External <script src> — extract hostname, run through classifyDomain()
 * 2. Inline <script> content — match against known SDK initialization patterns
 */
async function extractScriptTrackers(
  page: Page,
  pageDomain: string
): Promise<TrackerMatch[]> {
  const trackers: TrackerMatch[] = [];

  // 1. External script src hostnames
  const scriptSrcs: string[] = await page.$$eval("script[src]", (scripts) =>
    scripts.map((s) => s.getAttribute("src") || "").filter(Boolean)
  );

  for (const src of scriptSrcs) {
    try {
      const srcUrl = src.startsWith("//") ? `https:${src}` : src;
      const hostname = new URL(srcUrl, `https://${pageDomain}`).hostname;
      if (isThirdPartyDomain(hostname, pageDomain)) {
        const match = classifyDomain(hostname);
        if (match) trackers.push(match);
      }
    } catch {
      // Invalid URL — skip
    }
  }

  // 2. Inline script content matching
  const inlineScripts: string[] = await page.$$eval(
    "script:not([src])",
    (scripts) => scripts.map((s) => s.textContent || "")
  );

  for (const content of inlineScripts) {
    if (content.length < 10) continue; // skip trivially empty
    for (const entry of INLINE_SCRIPT_PATTERNS) {
      if (entry.pattern.test(content)) {
        trackers.push({
          domain: `inline:${entry.name}`,
          name: entry.name,
          category: entry.category,
        });
      }
    }
  }

  return trackers;
}

/**
 * Scan a URL for privacy metrics:
 * 1. Launch headless Chromium with stealth techniques
 * 2. Intercept all network requests — log third-party domains
 * 3. Block fonts/media for speed (images allowed — tracking pixels!)
 * 4. Navigate with networkidle2
 * 5. Scan <script> tags for inline trackers
 * 6. Extract cookies
 * 7. Classify domains against tracker database
 */
export async function scanUrl(url: string): Promise<ScanData> {
  const browser = await getBrowser();
  const thirdPartyRequests = new Set<string>();
  let pageDomain: string;

  try {
    pageDomain = new URL(url).hostname;
    const page = await browser.newPage();

    // Apply stealth techniques before navigation
    await applyStealthTechniques(page);

    // Block heavy resources for speed — but NOT images (tracking pixels are images)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      try {
        const resourceType = req.resourceType();
        if (["font", "media"].includes(resourceType)) {
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

    // Navigate — use domcontentloaded (fast) then wait for trackers to fire.
    // networkidle2 is too slow with images unblocked (sites never settle).
    // If even domcontentloaded times out, continue with whatever data was captured.
    const startTime = Date.now();
    let navigationTimedOut = false;
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });
    } catch (navErr) {
      if (navErr instanceof Error && navErr.message.includes("timeout")) {
        navigationTimedOut = true;
      } else {
        throw navErr;
      }
    }
    const loadTimeMs = Date.now() - startTime;

    // Wait for lazy-loaded trackers (many fire after DOMContentLoaded + delays).
    // If navigation timed out, we still wait — the request handler may still be
    // capturing third-party domains from in-flight requests.
    await new Promise((r) => setTimeout(r, navigationTimedOut ? 2000 : 5000));

    // Scan <script> tags for inline and external trackers
    const scriptTrackers = await extractScriptTrackers(page, pageDomain);

    // Extract cookies
    const rawCookies = await page.cookies();
    const cookies = classifyCookies(rawCookies, pageDomain);
    const thirdPartyDomainsList = Array.from(thirdPartyRequests).sort();

    // Classify trackers from network requests
    const trackers = classifyDomains(thirdPartyDomainsList);

    // Merge script-detected trackers, deduplicating by name+category
    const seen = new Set<string>();
    for (const category of ["analytics", "advertising", "sessionRecording", "social"] as const) {
      for (const t of trackers[category]) {
        seen.add(`${t.name}:${t.category}`);
      }
    }
    for (const t of scriptTrackers) {
      const key = `${t.name}:${t.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      switch (t.category) {
        case "analytics":
          trackers.analytics.push(t);
          break;
        case "advertising":
          trackers.advertising.push(t);
          break;
        case "session-recording":
          trackers.sessionRecording.push(t);
          break;
        case "social":
          trackers.social.push(t);
          break;
      }
    }

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
