import type { Page } from "puppeteer-core";

export interface ConsentResult {
  bannerDetected: boolean;
  bannerClicked: boolean;
  cmpName: string | null;
  googleConsentMode?: boolean;
  consentDefaultGranted?: boolean;
}

/** How long to wait for a consent banner to appear after page load */
const CONSENT_WAIT_MS = 4000;

/** How long to wait after clicking "Accept" for post-consent trackers to fire */
const POST_CONSENT_WAIT_MS = 3000;

/**
 * Known CMP (Consent Management Platform) selectors.
 *
 * Each entry maps a human-readable CMP name to CSS selectors that target
 * the "Accept All" / "Allow All" button. Order doesn't matter — we combine
 * them into a single waitForSelector call for speed.
 */
const CMP_SELECTORS: { name: string; selectors: string[] }[] = [
  {
    name: "OneTrust",
    selectors: ["#onetrust-accept-btn-handler"],
  },
  {
    name: "Cookiebot",
    selectors: [
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
      "#CybotCookiebotDialogBodyButtonAccept",
    ],
  },
  {
    name: "TrustArc",
    selectors: ["#truste-consent-button", ".truste_acceptBtn"],
  },
  {
    name: "Didomi",
    selectors: ["#didomi-notice-agree-button"],
  },
  {
    name: "CookieYes",
    selectors: [".cky-btn-accept"],
  },
  {
    name: "Termly",
    selectors: ['[data-tid="banner-accept"]'],
  },
  {
    name: "Quantcast",
    selectors: ['.qc-cmp2-summary-buttons button[mode="primary"]'],
  },
  {
    name: "Complianz",
    selectors: [".cmplz-accept"],
  },
  {
    name: "Osano",
    selectors: [".osano-cm-accept-all"],
  },
  {
    name: "Iubenda",
    selectors: [".iubenda-cs-accept-btn"],
  },
  {
    name: "Usercentrics",
    selectors: ['[data-testid="uc-accept-all-button"]'],
  },
  {
    name: "Borlabs",
    selectors: ["#BorlabsCookieBoxButtonAccept"],
  },
  {
    name: "ConsentManager",
    selectors: ["#cmpbntyestxt"],
  },
  {
    name: "Klaro",
    selectors: [".klaro .cm-btn-accept"],
  },
  {
    name: "CookieConsent (Insites)",
    selectors: [".cc-btn.cc-allow", ".cc-compliance .cc-btn"],
  },
  {
    name: "CookieFirst",
    selectors: [".cookiefirst-root button[data-cookiefirst-action='accept']"],
  },
  {
    name: "CookieScript",
    selectors: ["#cookiescript_accept"],
  },
  {
    name: "CookieHub",
    selectors: [".ch2-allow-all-btn"],
  },
  {
    name: "Civic",
    selectors: [".cc-accept-all", "#ccc-recommended-settings"],
  },
  {
    name: "Securiti",
    selectors: [".securiti-consent-accept-all"],
  },
  {
    name: "Axeptio",
    selectors: ["button[data-action='consent:acceptAll']"],
  },
  {
    name: "HubSpot",
    selectors: ["#hs-eu-confirmation-button"],
  },
];

/** All CMP selectors flattened into one CSS selector for a single waitForSelector call */
const COMBINED_SELECTOR = CMP_SELECTORS.flatMap((c) => c.selectors).join(", ");

/**
 * Text patterns for the "Accept All" button — catches custom/homegrown banners
 * that don't use a known CMP. Includes common translations.
 */
const ACCEPT_TEXT_PATTERNS = [
  /^accept\s*(all|cookies)?$/i,
  /^allow\s*(all|cookies)?$/i,
  /^i\s*agree$/i,
  /^got\s*it$/i,
  /^ok$/i,
  /^agree$/i,
  // German
  /^alle\s*akzeptieren$/i,
  /^akzeptieren$/i,
  // French
  /^tout\s*accepter$/i,
  /^accepter$/i,
  // Spanish
  /^aceptar\s*todo$/i,
  /^aceptar$/i,
  // Additional English
  /^continue$/i,
  /^i\s*understand$/i,
  /^confirm$/i,
  /^accept\s*&\s*close$/i,
  /^accept\s*and\s*continue$/i,
  // Portuguese
  /^aceitar\s*todos$/i,
  /^aceitar$/i,
  // Italian
  /^accetta\s*tutti$/i,
  /^accetta$/i,
  // Dutch
  /^alles\s*accepteren$/i,
  /^accepteren$/i,
];

/**
 * Attempt to find and click a consent banner's "Accept All" button.
 *
 * **Strategy (two-pass):**
 * 1. **CSS selector pass** — fast, covers ~90% of known CMPs. We combine all
 *    known selectors into a single `waitForSelector` call with a 3s timeout.
 * 2. **Text-based fallback** — catches custom banners by scanning all visible
 *    buttons/links for text matching common "Accept" patterns.
 *
 * After clicking, waits POST_CONSENT_WAIT_MS for post-consent trackers to load.
 */
export async function acceptConsentBanner(page: Page): Promise<ConsentResult> {
  const noConsent: ConsentResult = {
    bannerDetected: false,
    bannerClicked: false,
    cmpName: null,
  };

  // --- Pass 1: CSS selector-based detection ---
  try {
    const element = await page.waitForSelector(COMBINED_SELECTOR, {
      timeout: CONSENT_WAIT_MS,
      visible: true,
    });

    if (element) {
      // Identify which CMP matched
      const cmpName = await identifyCmp(page);

      // Short delay for banner animations to finish
      await new Promise((r) => setTimeout(r, 300));

      await element.click();
      await new Promise((r) => setTimeout(r, POST_CONSENT_WAIT_MS));

      return {
        bannerDetected: true,
        bannerClicked: true,
        cmpName,
      };
    }
  } catch {
    // No known CMP found within timeout — try text fallback
  }

  // --- Pass 2: Text-based fallback ---
  try {
    const clicked = await page.evaluate((patterns: string[]) => {
      const regexes = patterns.map((p) => new RegExp(p.slice(1, p.lastIndexOf("/")), p.slice(p.lastIndexOf("/") + 1)));
      const candidates = document.querySelectorAll("button, a, [role='button'], input[type='submit']");

      for (const el of candidates) {
        const htmlEl = el as HTMLElement;
        const text = (htmlEl.textContent || htmlEl.getAttribute("value") || "").trim();
        if (!text || text.length > 50) continue;

        // Check visibility
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        for (const regex of regexes) {
          if (regex.test(text)) {
            htmlEl.click();
            return true;
          }
        }
      }
      return false;
    }, ACCEPT_TEXT_PATTERNS.map((r) => r.toString()));

    if (clicked) {
      await new Promise((r) => setTimeout(r, POST_CONSENT_WAIT_MS));
      return {
        bannerDetected: true,
        bannerClicked: true,
        cmpName: "Custom",
      };
    }
  } catch {
    // Text-based detection failed — no banner
  }

  // --- Pass 3: Google Consent Mode detection (informational) ---
  const consentMode = await detectGoogleConsentMode(page);
  return {
    ...noConsent,
    googleConsentMode: consentMode.detected ? true : undefined,
    consentDefaultGranted: consentMode.detected
      ? consentMode.defaultState === "granted"
      : undefined,
  };
}

/**
 * Detect Google Consent Mode v2 in inline scripts.
 *
 * Sites using `gtag('consent', 'default', {...})` declare a default consent
 * state. When `isgdpr=false` (US visitors), the banner may not appear but
 * tracking fires silently with `analytics_storage: 'granted'`.
 */
async function detectGoogleConsentMode(
  page: Page
): Promise<{ detected: boolean; defaultState: "granted" | "denied" | "unknown" }> {
  try {
    const result = await page.evaluate(() => {
      const scripts = document.querySelectorAll("script:not([src])");
      for (const script of scripts) {
        const content = script.textContent || "";
        // Match gtag('consent', 'default', { ... })
        if (/gtag\s*\(\s*['"]consent['"]\s*,\s*['"]default['"]/.test(content)) {
          // Check if analytics_storage or ad_storage defaults to 'granted'
          const grantedMatch = /analytics_storage\s*:\s*['"]granted['"]/.test(content) ||
            /ad_storage\s*:\s*['"]granted['"]/.test(content);
          const deniedMatch = /analytics_storage\s*:\s*['"]denied['"]/.test(content) ||
            /ad_storage\s*:\s*['"]denied['"]/.test(content);
          return {
            detected: true,
            defaultState: grantedMatch ? "granted" : deniedMatch ? "denied" : "unknown",
          };
        }
      }
      return { detected: false, defaultState: "unknown" as const };
    });
    return result as { detected: boolean; defaultState: "granted" | "denied" | "unknown" };
  } catch {
    return { detected: false, defaultState: "unknown" };
  }
}

/**
 * Identify which CMP matched by checking each selector individually.
 * Only called after a combined selector match — so this is always fast.
 */
async function identifyCmp(page: Page): Promise<string | null> {
  for (const cmp of CMP_SELECTORS) {
    for (const selector of cmp.selectors) {
      const el = await page.$(selector);
      if (el) return cmp.name;
    }
  }
  return null;
}
