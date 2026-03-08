/**
 * Integration test for the privacy scanner.
 *
 * Tests real URLs across privacy tiers, validating that grades fall within
 * expected ranges and consent detection works correctly.
 *
 * Usage:
 *   npx tsx scripts/test-scanner.ts                    # run all 20 URLs
 *   npx tsx scripts/test-scanner.ts --site=example.com # run single site
 *   npx tsx scripts/test-scanner.ts --tier=5           # run one tier (4 URLs)
 *   npx tsx scripts/test-scanner.ts --tier=1 --site=ilovepdf  # combine filters
 *
 * NOT part of CI — too slow and network-dependent. Manual validation only.
 */

import { scanUrl } from "../src/lib/scanner/index";
import { gradeFromScan, computeScores } from "../src/lib/grading";
import type { PrivacyGrade, ScanData, AuditScores } from "../src/lib/types";

interface TestCase {
  url: string;
  tier: number;
  expectedGrades: PrivacyGrade[];
  description: string;
}

const TEST_CASES: TestCase[] = [
  // ── Tier 1: Privacy Nightmares (expected: D/F) ──
  {
    url: "https://www.ilovepdf.com",
    tier: 1,
    expectedGrades: ["A", "B", "C"],
    description: "Geo-fenced: Google Consent Mode v2; US sees minimal tracking (EU=D/F)",
  },
  {
    url: "https://www.online-convert.com",
    tier: 1,
    expectedGrades: ["A", "B", "C"],
    description: "Geo-fenced: No CMP for US visitors; consent restricted to EU",
  },
  {
    url: "https://www.convertio.co",
    tier: 1,
    expectedGrades: ["A", "B", "C"],
    description: "Geo-fenced: No CMP from US; GA only, tracking restricted to EU",
  },
  {
    url: "https://www.sodapdf.com",
    tier: 1,
    expectedGrades: ["C", "D", "F"],
    description: "Session replay, heavy tracking stack, upsell funnels",
  },
  {
    url: "https://www.forbes.com",
    tier: 1,
    expectedGrades: ["C", "D", "F"],
    description: "Prebid, DoubleClick, Criteo, Taboola, session recording, 50+ 3P domains",
  },
  {
    url: "https://weather.com",
    tier: 1,
    expectedGrades: ["C", "D", "F"],
    description: "Native ads, multiple analytics, ad exchanges",
  },
  {
    url: "https://www.cnet.com",
    tier: 1,
    expectedGrades: ["C", "D", "F"],
    description: "Heavy SSP stack, multiple ad exchanges, session recording",
  },

  // ── Tier 2: Ad-Supported Tools (expected: C/D) ──
  {
    url: "https://www.canva.com",
    tier: 2,
    expectedGrades: ["A", "B"],
    description: "OneTrust geo-fenced to EU; US sees clean profile",
  },
  {
    url: "https://smallpdf.com",
    tier: 2,
    expectedGrades: ["A", "B", "C"],
    description: "Consent geo-fenced; US sees AdSense + Google Consent Mode default:granted",
  },
  {
    url: "https://www.remove.bg",
    tier: 2,
    expectedGrades: ["C", "D"],
    description: "Conversion tracking, moderate trackers",
  },
  {
    url: "https://tinypng.com",
    tier: 2,
    expectedGrades: ["C", "D"],
    description: "Minimal UI, some analytics and ad scripts",
  },

  // ── Tier 2.5: Edge Cases ──
  {
    url: "https://www.bbc.com",
    tier: 2,
    expectedGrades: ["B", "C", "D"],
    description: "EU cookie banner edge case; US sees moderate tracking",
  },
  {
    url: "https://open.spotify.com",
    tier: 3,
    expectedGrades: ["A", "B", "C"],
    description: "SPA edge case; dynamically-loaded trackers",
  },

  // ── Tier 3: Big Tech Platforms (expected: B/C) ──
  {
    url: "https://docs.google.com",
    tier: 3,
    expectedGrades: ["A", "B"],
    description: "Genuinely clean public page; first-party only",
  },
  {
    url: "https://www.notion.so",
    tier: 3,
    expectedGrades: ["B", "C"],
    description: "Segment, Intercom, no display ads",
  },
  {
    url: "https://github.com",
    tier: 3,
    expectedGrades: ["A", "B"],
    description: "Genuinely clean logged-out page; ~1 third-party domain",
  },
  {
    url: "https://www.figma.com",
    tier: 3,
    expectedGrades: ["A", "B"],
    description: "Clean from US; ~8 third-party domains, no ads",
  },

  // ── Tier 4: Privacy-Conscious (expected: A/B) ──
  {
    url: "https://duckduckgo.com",
    tier: 4,
    expectedGrades: ["A", "B"],
    description: "Privacy-first search, minimal cookies",
  },
  {
    url: "https://proton.me",
    tier: 4,
    expectedGrades: ["A", "B"],
    description: "Encrypted email, self-hosted analytics only",
  },
  {
    url: "https://signal.org",
    tier: 4,
    expectedGrades: ["A", "B"],
    description: "Encrypted messaging, near-zero footprint",
  },
  {
    url: "https://www.mozilla.org",
    tier: 4,
    expectedGrades: ["A", "B"],
    description: "Firefox maker, low-to-moderate analytics",
  },

  // ── Tier 5: Minimal Baselines (expected: A) ──
  {
    url: "https://example.com",
    tier: 5,
    expectedGrades: ["A"],
    description: "IANA reserved domain, zero tracking",
  },
  {
    url: "https://lite.cnn.com",
    tier: 5,
    expectedGrades: ["A", "B"],
    description: "Text-only CNN, minimal or no tracking",
  },
  {
    url: "https://uploadless.dev",
    tier: 5,
    expectedGrades: ["A", "B"],
    description: "Own site — should practice what it preaches",
  },
  {
    url: "https://blog.cloudflare.com",
    tier: 3,
    expectedGrades: ["B", "C", "D"],
    description: "CF blog has LinkedIn Ads, OneTrust, 25+ 3P domains — surprisingly tracked for CF",
  },
];

const GRADE_ORDER: Record<PrivacyGrade, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };

interface TestResult {
  passed: boolean;
  grade: PrivacyGrade;
  score: number;
  scan: ScanData | null;
  elapsedMs: number;
  error?: string;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const start = Date.now();
  try {
    const scan = await scanUrl(testCase.url);
    const { grade, scores } = gradeFromScan(scan);
    const passed = testCase.expectedGrades.includes(grade);
    return {
      passed,
      grade,
      score: scores.total,
      scan,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    return {
      passed: false,
      grade: "F",
      score: 0,
      scan: null,
      elapsedMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function formatTrackerSummary(scan: ScanData): string {
  const parts: string[] = [];
  if (scan.trackers.analytics.length > 0)
    parts.push(`${scan.trackers.analytics.length} analytics`);
  if (scan.trackers.advertising.length > 0)
    parts.push(`${scan.trackers.advertising.length} ads`);
  if (scan.trackers.sessionRecording.length > 0)
    parts.push(`${scan.trackers.sessionRecording.length} recorder`);
  if (scan.trackers.social.length > 0)
    parts.push(`${scan.trackers.social.length} social`);
  return parts.length > 0 ? parts.join(", ") : "none detected";
}

function formatConsentInfo(scan: ScanData): string {
  const parts: string[] = [];

  if (scan.consent.bannerDetected) {
    const cmp = scan.consent.cmpName || "custom";
    parts.push(scan.consent.bannerClicked ? `${cmp} (clicked)` : `${cmp} (not clicked)`);
  } else {
    parts.push("none");
  }

  if (scan.consent.googleConsentMode) {
    const state = scan.consent.consentDefaultGranted ? "default:granted" : "default:denied";
    parts.push(`Google Consent Mode (${state})`);
  }

  return parts.join(", ");
}

async function main() {
  // ── Parse CLI flags ──
  const siteArg = process.argv.find((a) => a.startsWith("--site="));
  const siteFilter = siteArg?.split("=")[1];

  const tierArg = process.argv.find((a) => a.startsWith("--tier="));
  const tierFilter = tierArg ? parseInt(tierArg.split("=")[1], 10) : null;

  if (tierFilter !== null && (tierFilter < 1 || tierFilter > 5)) {
    console.error(`Invalid --tier=${tierFilter}. Must be 1-5.`);
    process.exit(1);
  }

  let cases = TEST_CASES;
  if (tierFilter !== null) {
    cases = cases.filter((t) => t.tier === tierFilter);
  }
  if (siteFilter) {
    cases = cases.filter((t) => t.url.includes(siteFilter));
  }

  if (cases.length === 0) {
    const filters = [
      tierFilter !== null ? `--tier=${tierFilter}` : null,
      siteFilter ? `--site=${siteFilter}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.error(`No test cases match ${filters}`);
    process.exit(1);
  }

  // ── Header ──
  console.log(`\n🔍 Privacy Scanner Integration Tests\n`);
  console.log(`Running ${cases.length} of ${TEST_CASES.length} test(s)...`);
  if (tierFilter !== null) console.log(`  Tier filter: ${tierFilter}`);
  if (siteFilter) console.log(`  Site filter: ${siteFilter}`);
  console.log();

  // ── Run tests ──
  let passed = 0;
  let failed = 0;
  const results: { tier: number; grade: PrivacyGrade; score: number }[] = [];
  const suiteStart = Date.now();

  for (const testCase of cases) {
    const hostname = new URL(testCase.url).hostname;
    const label = `Tier ${testCase.tier}: ${hostname}`;
    process.stdout.write(`  ${label} ... `);

    const result = await runTest(testCase);
    results.push({ tier: testCase.tier, grade: result.grade, score: result.score });

    if (result.error) {
      console.log(`❌ ERROR: ${result.error}`);
      console.log(`    Scan time: ${(result.elapsedMs / 1000).toFixed(1)}s`);
      failed++;
      continue;
    }

    const icon = result.passed ? "✅" : "❌";
    const expectNote = result.passed
      ? ""
      : ` — expected ${testCase.expectedGrades.join("/")}`;
    console.log(`${icon} ${result.grade} (${result.score}/100)${expectNote}`);

    // Detailed metrics
    if (result.scan) {
      const s = result.scan;
      console.log(
        `    Cookies: ${s.cookies.total} (${s.cookies.firstParty} first-party, ${s.cookies.thirdParty} third-party)`
      );
      console.log(`    Third-party domains: ${s.thirdPartyDomains.total}`);
      console.log(`    Trackers: ${formatTrackerSummary(s)}`);
      console.log(`    Consent: ${formatConsentInfo(s)}`);
      console.log(`    Scan time: ${(result.elapsedMs / 1000).toFixed(1)}s`);
    }

    if (result.passed) {
      passed++;
    } else {
      failed++;
      // Diagnostic output on failure — print score breakdown + tracker names
      if (result.scan) {
        const scores = computeScores(result.scan);
        console.log(`    ── DIAGNOSTIC (expected ${testCase.expectedGrades.join("/")} got ${result.grade}) ──`);
        console.log(`    Score breakdown: cookies=${scores.thirdPartyCookies} domains=${scores.thirdPartyDomains} recording=${scores.sessionRecording} ads=${scores.adNetworks} analytics=${scores.analyticsTrackers} server=${scores.serverSide}`);
        const allTrackers = [
          ...result.scan.trackers.analytics.map((t) => `[analytics] ${t.name}`),
          ...result.scan.trackers.advertising.map((t) => `[ads] ${t.name}`),
          ...result.scan.trackers.sessionRecording.map((t) => `[recording] ${t.name}`),
          ...result.scan.trackers.social.map((t) => `[social] ${t.name}`),
        ];
        if (allTrackers.length > 0) {
          console.log(`    Detected trackers: ${allTrackers.join(", ")}`);
        }
        console.log(`    3P domains (${result.scan.thirdPartyDomains.total}): ${result.scan.thirdPartyDomains.items.slice(0, 15).join(", ")}${result.scan.thirdPartyDomains.items.length > 15 ? ` (+${result.scan.thirdPartyDomains.items.length - 15} more)` : ""}`);
      }
    }
  }

  // ── Monotonicity check (only when multiple tiers present) ──
  const uniqueTiers = new Set(results.map((r) => r.tier));
  if (uniqueTiers.size > 1) {
    console.log(`\n📊 Monotonicity Check (grades should increase Tier 1 → 5):`);
    const byTier = new Map<number, number[]>();
    for (const r of results) {
      const arr = byTier.get(r.tier) || [];
      arr.push(GRADE_ORDER[r.grade]);
      byTier.set(r.tier, arr);
    }

    const tierAvgs = Array.from(byTier.entries())
      .map(([tier, grades]) => ({
        tier,
        avg: grades.reduce((a, b) => a + b, 0) / grades.length,
      }))
      .sort((a, b) => a.tier - b.tier);

    let monotonic = true;
    for (let i = 1; i < tierAvgs.length; i++) {
      if (tierAvgs[i].avg < tierAvgs[i - 1].avg) {
        monotonic = false;
      }
    }

    const gradeNames = ["F", "D", "C", "B", "A"];
    for (const { tier, avg } of tierAvgs) {
      const gradeLabel = gradeNames[Math.round(avg)];
      const count = byTier.get(tier)?.length || 0;
      console.log(`  Tier ${tier}: avg ${gradeLabel} (${count} sites)`);
    }
    console.log(`  Monotonic: ${monotonic ? "✅ Yes" : "❌ No"}`);
  }

  // ── Summary ──
  const totalElapsed = ((Date.now() - suiteStart) / 1000).toFixed(1);
  console.log(
    `\n${passed} passed, ${failed} failed out of ${cases.length} total (${totalElapsed}s)\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main();
