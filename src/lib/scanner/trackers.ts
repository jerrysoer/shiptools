import type { TrackerMatch } from "../types";

type Category = TrackerMatch["category"];

interface TrackerEntry {
  pattern: RegExp;
  name: string;
  category: Category;
}

/**
 * Known tracker/ad/recorder database.
 * Patterns match against third-party request domains.
 */
const TRACKER_DB: TrackerEntry[] = [
  // --- Analytics ---
  { pattern: /google-analytics\.com/i, name: "Google Analytics", category: "analytics" },
  { pattern: /googletagmanager\.com/i, name: "Google Tag Manager", category: "analytics" },
  { pattern: /analytics\.google\.com/i, name: "Google Analytics", category: "analytics" },
  { pattern: /mixpanel\.com/i, name: "Mixpanel", category: "analytics" },
  { pattern: /segment\.io/i, name: "Segment", category: "analytics" },
  { pattern: /segment\.com/i, name: "Segment", category: "analytics" },
  { pattern: /amplitude\.com/i, name: "Amplitude", category: "analytics" },
  { pattern: /heap\.io/i, name: "Heap", category: "analytics" },
  { pattern: /plausible\.io/i, name: "Plausible", category: "analytics" },
  { pattern: /matomo\./i, name: "Matomo", category: "analytics" },
  { pattern: /newrelic\.com/i, name: "New Relic", category: "analytics" },
  { pattern: /sentry\.io/i, name: "Sentry", category: "analytics" },
  { pattern: /posthog\.com/i, name: "PostHog", category: "analytics" },
  { pattern: /rudderstack\.com/i, name: "RudderStack", category: "analytics" },
  { pattern: /cloudflareinsights\.com/i, name: "Cloudflare Analytics", category: "analytics" },
  { pattern: /static\.cloudflareinsights\.com/i, name: "Cloudflare Analytics", category: "analytics" },
  { pattern: /kissmetrics\.com/i, name: "Kissmetrics", category: "analytics" },
  { pattern: /chartbeat\.com/i, name: "Chartbeat", category: "analytics" },
  { pattern: /parsely\.com/i, name: "Parse.ly", category: "analytics" },
  { pattern: /omtrdc\.net/i, name: "Adobe Analytics", category: "analytics" },
  { pattern: /demdex\.net/i, name: "Adobe Audience Manager", category: "analytics" },
  { pattern: /2o7\.net/i, name: "Adobe Analytics (legacy)", category: "analytics" },

  // --- Advertising ---
  { pattern: /doubleclick\.net/i, name: "Google DoubleClick", category: "advertising" },
  { pattern: /googlesyndication\.com/i, name: "Google AdSense", category: "advertising" },
  { pattern: /googleadservices\.com/i, name: "Google Ads", category: "advertising" },
  { pattern: /google\.com\/pagead/i, name: "Google Ads", category: "advertising" },
  { pattern: /facebook\.net/i, name: "Meta Pixel", category: "advertising" },
  { pattern: /facebook\.com\/tr/i, name: "Meta Pixel", category: "advertising" },
  { pattern: /connect\.facebook/i, name: "Meta SDK", category: "advertising" },
  { pattern: /ads-twitter\.com/i, name: "Twitter Ads", category: "advertising" },
  { pattern: /analytics\.tiktok\.com/i, name: "TikTok Pixel", category: "advertising" },
  { pattern: /snap\.licdn\.com/i, name: "LinkedIn Insight", category: "advertising" },
  { pattern: /ads\.linkedin\.com/i, name: "LinkedIn Ads", category: "advertising" },
  { pattern: /criteo\.com/i, name: "Criteo", category: "advertising" },
  { pattern: /taboola\.com/i, name: "Taboola", category: "advertising" },
  { pattern: /outbrain\.com/i, name: "Outbrain", category: "advertising" },
  { pattern: /amazon-adsystem\.com/i, name: "Amazon Ads", category: "advertising" },
  { pattern: /adnxs\.com/i, name: "Xandr/AppNexus", category: "advertising" },
  { pattern: /rubiconproject\.com/i, name: "Rubicon", category: "advertising" },
  { pattern: /pubmatic\.com/i, name: "PubMatic", category: "advertising" },
  { pattern: /openx\.net/i, name: "OpenX", category: "advertising" },
  { pattern: /bat\.bing\.com/i, name: "Bing Ads", category: "advertising" },
  { pattern: /adsymptotic\.com/i, name: "Adsymptotic", category: "advertising" },
  { pattern: /thetradedesk\.com/i, name: "The Trade Desk", category: "advertising" },
  { pattern: /rlcdn\.com/i, name: "LiveRamp", category: "advertising" },
  { pattern: /casalemedia\.com/i, name: "Index Exchange", category: "advertising" },
  { pattern: /sharethrough\.com/i, name: "Sharethrough", category: "advertising" },
  { pattern: /bidswitch\.net/i, name: "BidSwitch", category: "advertising" },
  { pattern: /adsrvr\.org/i, name: "The Trade Desk", category: "advertising" },
  { pattern: /mediavine\.com/i, name: "Mediavine", category: "advertising" },
  { pattern: /moatads\.com/i, name: "Moat (Oracle)", category: "advertising" },
  { pattern: /scorecardresearch\.com/i, name: "Scorecard Research", category: "advertising" },

  // --- Session Recording ---
  { pattern: /clarity\.ms/i, name: "Microsoft Clarity", category: "session-recording" },
  { pattern: /fullstory\.com/i, name: "FullStory", category: "session-recording" },
  { pattern: /mouseflow\.com/i, name: "Mouseflow", category: "session-recording" },
  { pattern: /smartlook\.com/i, name: "Smartlook", category: "session-recording" },
  { pattern: /logrocket\.com/i, name: "LogRocket", category: "session-recording" },
  { pattern: /inspectlet\.com/i, name: "Inspectlet", category: "session-recording" },
  { pattern: /crazyegg\.com/i, name: "Crazy Egg", category: "session-recording" },
  { pattern: /luckyorange\.com/i, name: "Lucky Orange", category: "session-recording" },
  { pattern: /heatmap\.com/i, name: "Heatmap", category: "session-recording" },
  { pattern: /hotjar\.com/i, name: "Hotjar", category: "session-recording" },
  { pattern: /contentsquare\.net/i, name: "Contentsquare", category: "session-recording" },
  { pattern: /quantummetric\.com/i, name: "Quantum Metric", category: "session-recording" },
  { pattern: /pendo\.io/i, name: "Pendo", category: "session-recording" },

  // --- Consent Management (treated as analytics — presence means tracking exists) ---
  { pattern: /cookiebot\.com/i, name: "Cookiebot", category: "analytics" },
  { pattern: /onetrust\.com/i, name: "OneTrust", category: "analytics" },
  { pattern: /cookielaw\.org/i, name: "OneTrust (CookieLaw)", category: "analytics" },
  { pattern: /trustarc\.com/i, name: "TrustArc", category: "analytics" },
  { pattern: /osano\.com/i, name: "Osano", category: "analytics" },

  // --- A/B Testing & Experimentation ---
  { pattern: /optimizely\.com/i, name: "Optimizely", category: "analytics" },
  { pattern: /abtasty\.com/i, name: "AB Tasty", category: "analytics" },
  { pattern: /vwo\.com/i, name: "VWO", category: "analytics" },
  { pattern: /launchdarkly\.com/i, name: "LaunchDarkly", category: "analytics" },

  // --- Live Chat / Customer Success ---
  { pattern: /intercom\.io/i, name: "Intercom", category: "analytics" },
  { pattern: /intercomcdn\.com/i, name: "Intercom", category: "analytics" },
  { pattern: /drift\.com/i, name: "Drift", category: "analytics" },
  { pattern: /js\.driftt\.com/i, name: "Drift", category: "analytics" },
  { pattern: /zendesk\.com/i, name: "Zendesk", category: "analytics" },
  { pattern: /zdassets\.com/i, name: "Zendesk", category: "analytics" },
  { pattern: /freshdesk\.com/i, name: "Freshdesk", category: "analytics" },
  { pattern: /freshchat\.com/i, name: "Freshchat", category: "analytics" },
  { pattern: /livechatinc\.com/i, name: "LiveChat", category: "analytics" },
  { pattern: /crisp\.chat/i, name: "Crisp", category: "analytics" },
  { pattern: /tawk\.to/i, name: "Tawk.to", category: "analytics" },
  { pattern: /hubspot\.com/i, name: "HubSpot", category: "analytics" },
  { pattern: /hs-analytics\.net/i, name: "HubSpot Analytics", category: "analytics" },
  { pattern: /hsforms\.net/i, name: "HubSpot Forms", category: "analytics" },

  // --- Fingerprinting / Bot Detection ---
  { pattern: /fpjs\.io/i, name: "FingerprintJS", category: "analytics" },
  { pattern: /fingerprintjs\.com/i, name: "FingerprintJS", category: "analytics" },
  { pattern: /fpcdn\.io/i, name: "FingerprintJS", category: "analytics" },
  { pattern: /botd\.io/i, name: "BotD", category: "analytics" },

  // --- Video Analytics ---
  { pattern: /wistia\.com/i, name: "Wistia", category: "analytics" },
  { pattern: /wistia\.net/i, name: "Wistia", category: "analytics" },
  { pattern: /jwplayer\.com/i, name: "JW Player", category: "analytics" },
  { pattern: /jwpltx\.com/i, name: "JW Player", category: "analytics" },
  { pattern: /player\.vimeo\.com/i, name: "Vimeo", category: "social" },
  { pattern: /youtube\.com/i, name: "YouTube", category: "social" },
  { pattern: /ytimg\.com/i, name: "YouTube", category: "social" },

  // --- Ad Exchanges / SSPs ---
  { pattern: /prebid\.org/i, name: "Prebid", category: "advertising" },
  { pattern: /sovrn\.com/i, name: "Sovrn", category: "advertising" },
  { pattern: /triplelift\.com/i, name: "TripleLift", category: "advertising" },
  { pattern: /gumgum\.com/i, name: "GumGum", category: "advertising" },
  { pattern: /33across\.com/i, name: "33Across", category: "advertising" },
  { pattern: /smartadserver\.com/i, name: "Smart Ad Server", category: "advertising" },
  { pattern: /id5-sync\.com/i, name: "ID5", category: "advertising" },
  { pattern: /quantserve\.com/i, name: "Quantcast", category: "advertising" },
  { pattern: /bluekai\.com/i, name: "Oracle BlueKai", category: "advertising" },
  { pattern: /exelator\.com/i, name: "Nielsen eXelator", category: "advertising" },
  { pattern: /mathtag\.com/i, name: "MediaMath", category: "advertising" },
  { pattern: /intentiq\.com/i, name: "IntentIQ", category: "advertising" },
  { pattern: /audigent\.com/i, name: "Audigent", category: "advertising" },

  // --- Emerging + Mobile Attribution ---
  { pattern: /braze\.com/i, name: "Braze", category: "advertising" },
  { pattern: /appboy\.com/i, name: "Braze", category: "advertising" },
  { pattern: /customer\.io/i, name: "Customer.io", category: "analytics" },
  { pattern: /mparticle\.com/i, name: "mParticle", category: "analytics" },
  { pattern: /statsig\.com/i, name: "Statsig", category: "analytics" },
  { pattern: /branch\.io/i, name: "Branch", category: "analytics" },
  { pattern: /app\.link/i, name: "Branch", category: "analytics" },
  { pattern: /appsflyer\.com/i, name: "AppsFlyer", category: "advertising" },
  { pattern: /adjust\.com/i, name: "Adjust", category: "advertising" },

  // --- Social ---
  { pattern: /platform\.twitter\.com/i, name: "Twitter", category: "social" },
  { pattern: /platform\.linkedin\.com/i, name: "LinkedIn", category: "social" },
  { pattern: /apis\.google\.com/i, name: "Google APIs", category: "social" },
  { pattern: /accounts\.google\.com/i, name: "Google Sign-In", category: "social" },
];

/**
 * Inline script patterns for detecting trackers embedded directly in HTML.
 * Each entry maps a regex (tested against inline <script> content) to a tracker.
 */
export const INLINE_SCRIPT_PATTERNS: { pattern: RegExp; name: string; category: Category }[] = [
  { pattern: /\bgtag\s*\(/, name: "Google Analytics", category: "analytics" },
  { pattern: /\b_gaq\b/, name: "Google Analytics (legacy)", category: "analytics" },
  { pattern: /\bga\s*\(\s*['"]create['"]/, name: "Google Analytics (UA)", category: "analytics" },
  { pattern: /\bfbq\s*\(/, name: "Meta Pixel", category: "advertising" },
  { pattern: /\b_hjSettings\b/, name: "Hotjar", category: "session-recording" },
  { pattern: /\bclarity\s*\(\s*["']/, name: "Microsoft Clarity", category: "session-recording" },
  { pattern: /\bmixpanel\.track\b/, name: "Mixpanel", category: "analytics" },
  { pattern: /\bLogRocket\.init\b/, name: "LogRocket", category: "session-recording" },
  { pattern: /\bFullStory\.init\b/, name: "FullStory", category: "session-recording" },
  { pattern: /\bposthog\.init\b/, name: "PostHog", category: "analytics" },
  { pattern: /\bamplitude\.getInstance\b/, name: "Amplitude", category: "analytics" },
  { pattern: /\bheap\.track\b/, name: "Heap", category: "analytics" },
  { pattern: /\bttq\.track\b/, name: "TikTok Pixel", category: "advertising" },
  { pattern: /\btwq\s*\(/, name: "Twitter Ads", category: "advertising" },
  { pattern: /\blintrk\s*\(/, name: "LinkedIn Insight", category: "advertising" },
  { pattern: /\b_paq\.push\b/, name: "Matomo", category: "analytics" },
  { pattern: /\bSnaptr\s*\(/, name: "Snapchat Pixel", category: "advertising" },
  { pattern: /\bobApi\s*\(/, name: "Outbrain", category: "advertising" },
  { pattern: /\bpendo\.initialize\b/, name: "Pendo", category: "session-recording" },
  // --- Segment ---
  { pattern: /\banalytics\.track\s*\(/, name: "Segment", category: "analytics" },
  { pattern: /\banalytics\.identify\s*\(/, name: "Segment", category: "analytics" },
  { pattern: /\banalytics\.page\s*\(/, name: "Segment", category: "analytics" },
  // --- RudderStack ---
  { pattern: /\brudderanalytics\b/, name: "RudderStack", category: "analytics" },
  // --- GTM dataLayer ---
  { pattern: /\bdataLayer\.push\s*\(/, name: "Google Tag Manager", category: "analytics" },
  // --- Intercom ---
  { pattern: /\bIntercom\s*\(\s*['"]boot['"]/, name: "Intercom", category: "analytics" },
  { pattern: /\bwindow\.intercomSettings\b/, name: "Intercom", category: "analytics" },
  // --- Drift ---
  { pattern: /\bdrift\.load\b/, name: "Drift", category: "analytics" },
  { pattern: /\bdrift\.api\b/, name: "Drift", category: "analytics" },
  // --- Zendesk ---
  { pattern: /\bzE\s*\(\s*['"]webWidget['"]/, name: "Zendesk", category: "analytics" },
  // --- Statsig ---
  { pattern: /\bstatsig\.initialize\b/, name: "Statsig", category: "analytics" },
  // --- Braze ---
  { pattern: /\bbraze\.initialize\b/, name: "Braze", category: "advertising" },
  // --- Customer.io ---
  { pattern: /\b_cio\.identify\b/, name: "Customer.io", category: "analytics" },
  // --- FingerprintJS ---
  { pattern: /\bFingerprintJS\.load\b/, name: "FingerprintJS", category: "analytics" },
  { pattern: /\bFpjsClient\b/, name: "FingerprintJS", category: "analytics" },
];

/**
 * Classify a third-party domain against the tracker database.
 */
export function classifyDomain(domain: string): TrackerMatch | null {
  for (const entry of TRACKER_DB) {
    if (entry.pattern.test(domain)) {
      return { domain, name: entry.name, category: entry.category };
    }
  }
  return null;
}

/**
 * Classify all third-party domains, deduplicating by name + category.
 */
export function classifyDomains(domains: string[]): {
  analytics: TrackerMatch[];
  advertising: TrackerMatch[];
  sessionRecording: TrackerMatch[];
  social: TrackerMatch[];
} {
  const seen = new Set<string>();
  const result = {
    analytics: [] as TrackerMatch[],
    advertising: [] as TrackerMatch[],
    sessionRecording: [] as TrackerMatch[],
    social: [] as TrackerMatch[],
  };

  for (const domain of domains) {
    const match = classifyDomain(domain);
    if (!match) continue;

    const key = `${match.name}:${match.category}`;
    if (seen.has(key)) continue;
    seen.add(key);

    switch (match.category) {
      case "analytics":
        result.analytics.push(match);
        break;
      case "advertising":
        result.advertising.push(match);
        break;
      case "session-recording":
        result.sessionRecording.push(match);
        break;
      case "social":
        result.social.push(match);
        break;
    }
  }

  return result;
}
