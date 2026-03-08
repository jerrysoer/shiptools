import type { AuditScores, PrivacyGrade, ScanData } from "./types";

/**
 * Privacy grading algorithm.
 *
 * Each factor is scored 0-100 where 100 = best privacy, then weighted:
 *   - Third-party cookies:  15%  (less reliable from US due to geo-fencing)
 *   - Third-party domains:  20%  (reliable from US)
 *   - Session recording:    20%  (binary, reliable)
 *   - Ad networks:          20%  (reliable from US — increased weight)
 *   - Analytics trackers:   10%  (reliable)
 *   - Fingerprinting:       10%  (canvas/WebGL/audio detection)
 *   - Cookie duration:       5%  (penalizes long-lived 3P cookies)
 *
 * Tracker diversity penalty: when trackers span multiple categories
 * (analytics + advertising + recording + social), it signals a site that
 * monetizes visitors aggressively. Applied as a small penalty to the total.
 */

function linearScore(value: number, bestAt: number, worstAt: number): number {
  if (value <= bestAt) return 100;
  if (value >= worstAt) return 0;
  return Math.round(100 * (1 - (value - bestAt) / (worstAt - bestAt)));
}

/**
 * Score cookie duration: penalizes third-party cookies with long lifetimes.
 * Returns 0-100 where 100 = all session/short-lived, 0 = many long-lived.
 *
 * Categories: session (<0), short (<24h), medium (<30d), long (>1yr)
 * Only third-party cookies are scored — first-party long cookies are normal.
 */
function scoreCookieDuration(scan: ScanData): number {
  const thirdPartyCookies = scan.cookies.items.filter((c) => c.thirdParty);
  if (thirdPartyCookies.length === 0) return 100;

  const now = Date.now() / 1000;
  let longLivedCount = 0;

  for (const cookie of thirdPartyCookies) {
    if (cookie.expires <= 0) continue; // session cookie — good
    const diffDays = (cookie.expires - now) / 86400;
    if (diffDays > 365) longLivedCount++;
  }

  // Score: 0 long-lived = 100, 5+ long-lived = 0
  return linearScore(longLivedCount, 0, 5);
}

export function computeScores(scan: ScanData): AuditScores {
  const thirdPartyCookies = linearScore(scan.cookies.thirdParty, 0, 30);
  const thirdPartyDomains = linearScore(scan.thirdPartyDomains.total, 0, 20);
  const sessionRecording = scan.trackers.sessionRecording.length > 0 ? 0 : 100;
  const adNetworks = linearScore(scan.trackers.advertising.length, 0, 2);
  const analyticsTrackers = linearScore(scan.trackers.analytics.length, 0, 3);

  // Fingerprinting: each technique detected (canvas, webgl, audio) reduces score
  const fpTechniques = scan.fingerprinting?.length ?? 0;
  const fingerprinting = linearScore(fpTechniques, 0, 2);

  // Cookie duration: penalizes long-lived third-party cookies
  const cookieDuration = scoreCookieDuration(scan);

  // Tracker diversity: how many categories have at least one tracker?
  const categoriesPresent = [
    scan.trackers.analytics.length > 0,
    scan.trackers.advertising.length > 0,
    scan.trackers.sessionRecording.length > 0,
    scan.trackers.social.length > 0,
  ].filter(Boolean).length;
  const trackerDiversity = linearScore(categoriesPresent, 0, 3);

  // Consent-default-granted penalty: if the site silently grants consent
  // for US visitors (no banner shown, tracking fires immediately), penalize
  const consentPenalty =
    scan.consent.googleConsentMode && scan.consent.consentDefaultGranted ? 5 : 0;

  const weightedTotal = Math.round(
    thirdPartyCookies * 0.15 +
      thirdPartyDomains * 0.20 +
      sessionRecording * 0.20 +
      adNetworks * 0.20 +
      analyticsTrackers * 0.10 +
      fingerprinting * 0.10 +
      cookieDuration * 0.05
  );

  // Apply diversity penalty: if trackers span 3+ categories, deduct up to 10 points
  const diversityPenalty = categoriesPresent >= 3 ? (categoriesPresent - 2) * 5 : 0;

  const total = Math.max(0, Math.min(100, weightedTotal - diversityPenalty - consentPenalty));

  return {
    thirdPartyCookies,
    thirdPartyDomains,
    sessionRecording,
    adNetworks,
    analyticsTrackers,
    serverSide: 0, // Deprecated — kept for backward compat with cached results
    fingerprinting,
    cookieDuration,
    trackerDiversity,
    total,
  };
}

export function scoreToGrade(score: number): PrivacyGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function gradeFromScan(scan: ScanData): {
  grade: PrivacyGrade;
  scores: AuditScores;
} {
  const scores = computeScores(scan);
  return { grade: scoreToGrade(scores.total), scores };
}
