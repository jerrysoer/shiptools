import { describe, it, expect } from "vitest";
import { computeScores, scoreToGrade, gradeFromScan } from "./grading";
import type { ScanData } from "./types";

/** Helper to build a minimal ScanData with overrides */
function makeScan(overrides: Partial<{
  thirdPartyCookies: number;
  thirdPartyDomains: number;
  analyticsCount: number;
  adCount: number;
  sessionRecordingCount: number;
  serverSide: boolean;
  fingerprinting: string[];
  longLivedThirdPartyCookies: number;
}>): ScanData {
  const {
    thirdPartyCookies = 0,
    thirdPartyDomains = 0,
    analyticsCount = 0,
    adCount = 0,
    sessionRecordingCount = 0,
    fingerprinting = [],
    longLivedThirdPartyCookies = 0,
  } = overrides;

  // Build cookie items: include long-lived 3P cookies if requested
  const now = Date.now() / 1000;
  const cookieItems = [
    // Regular third-party cookies (session)
    ...Array.from({ length: Math.max(0, thirdPartyCookies - longLivedThirdPartyCookies) }, (_, i) => ({
      name: `cookie${i}`,
      domain: `.tracker${i}.com`,
      path: "/",
      secure: false,
      httpOnly: false,
      sameSite: "None",
      expires: -1, // session
      thirdParty: true,
    })),
    // Long-lived third-party cookies (2 years)
    ...Array.from({ length: longLivedThirdPartyCookies }, (_, i) => ({
      name: `longcookie${i}`,
      domain: `.longtracker${i}.com`,
      path: "/",
      secure: false,
      httpOnly: false,
      sameSite: "None",
      expires: now + 86400 * 730, // 2 years
      thirdParty: true,
    })),
  ];

  return {
    url: "https://example.com",
    domain: "example.com",
    scannedAt: new Date().toISOString(),
    loadTimeMs: 500,
    consent: { bannerDetected: false, bannerClicked: false, cmpName: null },
    cookies: {
      total: thirdPartyCookies,
      firstParty: 0,
      thirdParty: thirdPartyCookies,
      items: cookieItems,
    },
    thirdPartyDomains: {
      total: thirdPartyDomains,
      items: Array.from({ length: thirdPartyDomains }, (_, i) => `tracker${i}.com`),
    },
    trackers: {
      analytics: Array.from({ length: analyticsCount }, (_, i) => ({
        domain: `analytics${i}.com`,
        category: "analytics" as const,
        name: `Analytics ${i}`,
      })),
      advertising: Array.from({ length: adCount }, (_, i) => ({
        domain: `ads${i}.com`,
        category: "advertising" as const,
        name: `Ad Network ${i}`,
      })),
      sessionRecording: Array.from({ length: sessionRecordingCount }, (_, i) => ({
        domain: `recorder${i}.com`,
        category: "session-recording" as const,
        name: `Recorder ${i}`,
      })),
      social: [],
    },
    serverSideProcessing: false,
    fingerprinting,
  };
}

describe("scoreToGrade", () => {
  it("returns A for scores >= 90", () => {
    expect(scoreToGrade(100)).toBe("A");
    expect(scoreToGrade(95)).toBe("A");
    expect(scoreToGrade(90)).toBe("A");
  });

  it("returns B for scores 75-89", () => {
    expect(scoreToGrade(89)).toBe("B");
    expect(scoreToGrade(75)).toBe("B");
  });

  it("returns C for scores 55-74", () => {
    expect(scoreToGrade(74)).toBe("C");
    expect(scoreToGrade(55)).toBe("C");
  });

  it("returns D for scores 35-54", () => {
    expect(scoreToGrade(54)).toBe("D");
    expect(scoreToGrade(35)).toBe("D");
  });

  it("returns F for scores below 35", () => {
    expect(scoreToGrade(34)).toBe("F");
    expect(scoreToGrade(0)).toBe("F");
  });
});

describe("computeScores", () => {
  it("gives 100 for all factors when scan is clean", () => {
    const scores = computeScores(makeScan({}));
    expect(scores.thirdPartyCookies).toBe(100);
    expect(scores.thirdPartyDomains).toBe(100);
    expect(scores.sessionRecording).toBe(100);
    expect(scores.adNetworks).toBe(100);
    expect(scores.analyticsTrackers).toBe(100);
    expect(scores.fingerprinting).toBe(100);
    expect(scores.cookieDuration).toBe(100);
    expect(scores.total).toBe(100);
  });

  it("floors third-party cookies at worstAt=30", () => {
    const scores = computeScores(makeScan({ thirdPartyCookies: 30 }));
    expect(scores.thirdPartyCookies).toBe(0);

    // 50 cookies should also be 0 (clamped at worstAt)
    const scores2 = computeScores(makeScan({ thirdPartyCookies: 50 }));
    expect(scores2.thirdPartyCookies).toBe(0);
  });

  it("scores third-party cookies linearly between 0 and 30", () => {
    const scores = computeScores(makeScan({ thirdPartyCookies: 15 }));
    expect(scores.thirdPartyCookies).toBe(50);
  });

  it("floors third-party domains at worstAt=20", () => {
    const scores = computeScores(makeScan({ thirdPartyDomains: 20 }));
    expect(scores.thirdPartyDomains).toBe(0);
  });

  it("scores third-party domains linearly between 0 and 20", () => {
    const scores = computeScores(makeScan({ thirdPartyDomains: 10 }));
    expect(scores.thirdPartyDomains).toBe(50);
  });

  it("floors analytics trackers at worstAt=3", () => {
    const scores = computeScores(makeScan({ analyticsCount: 3 }));
    expect(scores.analyticsTrackers).toBe(0);
  });

  it("scores analytics linearly between 0 and 3", () => {
    const scores = computeScores(makeScan({ analyticsCount: 1 }));
    expect(scores.analyticsTrackers).toBe(67);
  });

  it("gives 0 for session recording when any recorder is found", () => {
    const scores = computeScores(makeScan({ sessionRecordingCount: 1 }));
    expect(scores.sessionRecording).toBe(0);
  });
});

describe("fingerprinting scoring", () => {
  it("gives 100 when no fingerprinting detected", () => {
    const scores = computeScores(makeScan({ fingerprinting: [] }));
    expect(scores.fingerprinting).toBe(100);
  });

  it("gives 50 when one technique detected", () => {
    const scores = computeScores(makeScan({ fingerprinting: ["canvas"] }));
    expect(scores.fingerprinting).toBe(50);
  });

  it("gives 0 when two or more techniques detected", () => {
    const scores = computeScores(makeScan({ fingerprinting: ["canvas", "webgl"] }));
    expect(scores.fingerprinting).toBe(0);
  });

  it("clamps at 0 for three techniques", () => {
    const scores = computeScores(makeScan({ fingerprinting: ["canvas", "webgl", "audio"] }));
    expect(scores.fingerprinting).toBe(0);
  });

  it("fingerprinting contributes 10% to total", () => {
    // Clean scan with only fingerprinting penalty
    const clean = computeScores(makeScan({}));
    const withFP = computeScores(makeScan({ fingerprinting: ["canvas", "webgl"] }));
    // Fingerprinting goes from 100→0, 10% weight = 10 point difference
    expect(clean.total - withFP.total).toBe(10);
  });
});

describe("cookie duration scoring", () => {
  it("gives 100 when no third-party cookies", () => {
    const scores = computeScores(makeScan({}));
    expect(scores.cookieDuration).toBe(100);
  });

  it("gives 100 when all third-party cookies are session cookies", () => {
    const scores = computeScores(makeScan({ thirdPartyCookies: 5 }));
    expect(scores.cookieDuration).toBe(100);
  });

  it("penalizes long-lived third-party cookies", () => {
    const scores = computeScores(makeScan({
      thirdPartyCookies: 5,
      longLivedThirdPartyCookies: 5,
    }));
    expect(scores.cookieDuration).toBe(0);
  });

  it("partially penalizes some long-lived cookies", () => {
    const scores = computeScores(makeScan({
      thirdPartyCookies: 5,
      longLivedThirdPartyCookies: 2,
    }));
    expect(scores.cookieDuration).toBe(60);
  });
});

describe("gradeFromScan — tier differentiation", () => {
  it("Tier 5 (pristine, e.g. example.com) → A", () => {
    const { grade } = gradeFromScan(makeScan({}));
    expect(grade).toBe("A");
  });

  it("Tier 4 (minimal tracking, e.g. signal.org) → A or B", () => {
    const { grade } = gradeFromScan(makeScan({
      thirdPartyCookies: 1,
      thirdPartyDomains: 2,
      analyticsCount: 1,
    }));
    expect(["A", "B"]).toContain(grade);
  });

  it("Tier 3 (moderate, e.g. github.com) → B or C", () => {
    const { grade } = gradeFromScan(makeScan({
      thirdPartyCookies: 8,
      thirdPartyDomains: 10,
      analyticsCount: 2,
    }));
    expect(["B", "C"]).toContain(grade);
  });

  it("Tier 2 (heavy tracking, e.g. canva.com) → C or D", () => {
    const { grade } = gradeFromScan(makeScan({
      thirdPartyCookies: 20,
      thirdPartyDomains: 15,
      analyticsCount: 3,
      adCount: 1,
    }));
    expect(["C", "D"]).toContain(grade);
  });

  it("Tier 1 (extreme tracking, e.g. ilovepdf.com) → D or F", () => {
    const { grade } = gradeFromScan(makeScan({
      thirdPartyCookies: 50,
      thirdPartyDomains: 30,
      analyticsCount: 3,
      adCount: 2,
      sessionRecordingCount: 1,
    }));
    expect(["D", "F"]).toContain(grade);
  });

  it("grades increase monotonically from Tier 1 → Tier 5", () => {
    const gradeOrder: Record<string, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };

    const tier1 = gradeFromScan(makeScan({
      thirdPartyCookies: 50, thirdPartyDomains: 30,
      analyticsCount: 3, adCount: 2, sessionRecordingCount: 1,
    }));
    const tier3 = gradeFromScan(makeScan({
      thirdPartyCookies: 8, thirdPartyDomains: 10, analyticsCount: 2,
    }));
    const tier5 = gradeFromScan(makeScan({}));

    expect(gradeOrder[tier1.grade]).toBeLessThan(gradeOrder[tier3.grade]);
    expect(gradeOrder[tier3.grade]).toBeLessThan(gradeOrder[tier5.grade]);
  });
});
