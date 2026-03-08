/**
 * Curated list of known file processing services that upload user files
 * to remote servers. Used for high-confidence server-side processing detection.
 *
 * Each entry is a registrable domain (eTLD+1). Matching is exact or *.domain.
 */
const KNOWN_FILE_SERVICES: ReadonlySet<string> = new Set([
  // PDF tools
  "ilovepdf.com",
  "smallpdf.com",
  "pdf2go.com",
  "sodapdf.com",
  "sejda.com",
  "pdfcandy.com",
  // File converters
  "convertio.co",
  "zamzar.com",
  "cloudconvert.com",
  "online-convert.com",
  "freeconvert.com",
  "onlineconvertfree.com",
  // Image tools
  "tinypng.com",
  "remove.bg",
  "canva.com",
  // Compression / archiving
  "compress2go.com",
  "youcompress.com",
  // Video/audio
  "online-video-cutter.com",
  "kapwing.com",
  // OCR / scanning
  "onlineocr.net",
]);

/**
 * Check if a domain (or any of its parent domains) is a known
 * server-side file processing service.
 *
 * Matches:
 *  - Exact: "ilovepdf.com"
 *  - Subdomain: "www.ilovepdf.com", "api.ilovepdf.com"
 */
export function isKnownFileService(domain: string): string | null {
  const lower = domain.toLowerCase();

  // Exact match
  if (KNOWN_FILE_SERVICES.has(lower)) return lower;

  // Subdomain match: strip leading labels until we find a match
  const parts = lower.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (KNOWN_FILE_SERVICES.has(parent)) return parent;
  }

  return null;
}
