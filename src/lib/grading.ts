import type { AuditScores, PrivacyGrade, ScanData } from "./types";

/**
 * Privacy grading algorithm.
 *
 * Each factor is scored 0-100 where 100 = best privacy, then weighted:
 *   - Third-party cookies: 25%
 *   - Third-party domains: 20%
 *   - Session recording:   20%
 *   - Ad networks:         15%
 *   - Analytics trackers:  10%
 *   - Server-side processing: 10%
 */

function linearScore(value: number, bestAt: number, worstAt: number): number {
  if (value <= bestAt) return 100;
  if (value >= worstAt) return 0;
  return Math.round(100 * (1 - (value - bestAt) / (worstAt - bestAt)));
}

export function computeScores(scan: ScanData): AuditScores {
  const thirdPartyCookies = linearScore(scan.cookies.thirdParty, 0, 30);
  const thirdPartyDomains = linearScore(scan.thirdPartyDomains.total, 0, 20);
  const sessionRecording = scan.trackers.sessionRecording.length > 0 ? 0 : 100;
  const adNetworks = linearScore(scan.trackers.advertising.length, 0, 2);
  const analyticsTrackers = linearScore(scan.trackers.analytics.length, 0, 3);
  const serverSide = scan.serverSideProcessing ? 0 : 100;

  const total = Math.round(
    thirdPartyCookies * 0.25 +
      thirdPartyDomains * 0.2 +
      sessionRecording * 0.2 +
      adNetworks * 0.15 +
      analyticsTrackers * 0.1 +
      serverSide * 0.1
  );

  return {
    thirdPartyCookies,
    thirdPartyDomains,
    sessionRecording,
    adNetworks,
    analyticsTrackers,
    serverSide,
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
