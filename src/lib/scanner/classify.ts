import { getDomain } from "tldts";
import type { CookieInfo, ServerSideSignal, ServerSideProcessingInfo } from "../types";
import { isKnownFileService } from "./file-services";

/**
 * Extract the registrable domain (eTLD+1) from a full hostname.
 * Uses the Public Suffix List via tldts for accurate parsing of all ccTLDs
 * (co.uk, com.au, co.za, etc.) — replaces the previous hand-rolled version
 * that only handled 6 double-TLD patterns.
 */
export function getBaseDomain(hostname: string): string {
  const domain = getDomain(hostname);
  // tldts returns null for IPs, localhost, or invalid hostnames — fall back to input
  return domain ?? hostname;
}

/**
 * Determine if a cookie is third-party relative to the scanned domain.
 */
export function isThirdPartyCookie(
  cookie: { domain: string },
  pageDomain: string
): boolean {
  const cookieDomain = cookie.domain.replace(/^\./, "");
  const pageBase = getBaseDomain(pageDomain);
  const cookieBase = getBaseDomain(cookieDomain);
  return pageBase !== cookieBase;
}

/**
 * Classify raw Puppeteer cookies into structured CookieInfo.
 */
export function classifyCookies(
  rawCookies: Array<{
    name: string;
    domain: string;
    path: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
    expires?: number;
  }>,
  pageDomain: string
): CookieInfo[] {
  return rawCookies.map((c) => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    secure: c.secure ?? false,
    httpOnly: c.httpOnly ?? false,
    sameSite: c.sameSite ?? "None",
    expires: c.expires ?? -1,
    thirdParty: isThirdPartyCookie(c, pageDomain),
  }));
}

/**
 * Determine if a request domain is third-party relative to the page.
 */
export function isThirdPartyDomain(
  requestDomain: string,
  pageDomain: string
): boolean {
  return getBaseDomain(requestDomain) !== getBaseDomain(pageDomain);
}

/**
 * Heuristic: does the site appear to process files server-side?
 * Checks for upload endpoints and file processing indicators.
 */
export function detectServerSideProcessing(domains: string[]): boolean {
  const uploadPatterns = [
    /upload/i,
    /convert/i,
    /process/i,
    /api.*file/i,
    /s3\.amazonaws\.com/i,
    /storage\.googleapis\.com/i,
    /blob\.core\.windows\.net/i,
  ];

  return domains.some((d) =>
    uploadPatterns.some((p) => p.test(d))
  );
}

/**
 * Enhanced server-side processing detection with confidence tiers.
 *
 * Signal layers (highest → lowest confidence):
 * 1. Known service match — curated list of file processing sites
 * 2. File input elements — <input type="file"> found in DOM
 * 3. Multipart forms — form[enctype="multipart/form-data"] in DOM
 * 4. Upload domain patterns — regex matches on third-party domains
 */
export function detectServerSideProcessingDetailed(
  pageDomain: string,
  thirdPartyDomains: string[],
  domSignals: { fileInputCount: number; multipartFormCount: number }
): ServerSideProcessingInfo {
  const signals: ServerSideSignal[] = [];

  // 1. Known service match (high confidence)
  const knownService = isKnownFileService(pageDomain);
  if (knownService) {
    signals.push({ type: "known_service", detail: knownService });
  }

  // 2. File input elements (medium confidence)
  if (domSignals.fileInputCount > 0) {
    signals.push({
      type: "file_input",
      detail: `${domSignals.fileInputCount} file input${domSignals.fileInputCount > 1 ? "s" : ""} found`,
    });
  }

  // 3. Multipart forms (medium confidence)
  if (domSignals.multipartFormCount > 0) {
    signals.push({
      type: "multipart_form",
      detail: `${domSignals.multipartFormCount} multipart form${domSignals.multipartFormCount > 1 ? "s" : ""} found`,
    });
  }

  // 4. Upload domain patterns (low confidence)
  const uploadPatterns = [
    /upload/i,
    /convert/i,
    /process/i,
    /api.*file/i,
    /s3\.amazonaws\.com/i,
    /storage\.googleapis\.com/i,
    /blob\.core\.windows\.net/i,
  ];
  for (const domain of thirdPartyDomains) {
    for (const pattern of uploadPatterns) {
      if (pattern.test(domain)) {
        signals.push({ type: "upload_domain", detail: domain });
        break; // one signal per domain
      }
    }
  }

  // Confidence = highest signal type found
  let confidence: ServerSideProcessingInfo["confidence"] = "low";
  if (signals.some((s) => s.type === "known_service")) {
    confidence = "high";
  } else if (signals.some((s) => s.type === "file_input" || s.type === "multipart_form")) {
    confidence = "medium";
  }

  return {
    detected: signals.length > 0,
    signals,
    confidence,
  };
}
