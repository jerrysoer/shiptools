import Papa from "papaparse";
import type { AuditResult } from "./types";

export function exportJSON(result: AuditResult): void {
  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `audit-${result.domain}.json`);
}

export function exportCSV(result: AuditResult): void {
  const { scan } = result;

  // Flatten cookies into CSV rows
  const cookieRows = scan.cookies.items.map((c) => ({
    type: "cookie",
    name: c.name,
    domain: c.domain,
    thirdParty: c.thirdParty,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : "session",
  }));

  // Flatten trackers
  const trackerRows = [
    ...scan.trackers.analytics,
    ...scan.trackers.advertising,
    ...scan.trackers.sessionRecording,
    ...scan.trackers.social,
  ].map((t) => ({
    type: "tracker",
    name: t.name,
    domain: t.domain,
    thirdParty: true,
    secure: "",
    httpOnly: "",
    sameSite: "",
    expires: "",
    category: t.category,
  }));

  const csv = Papa.unparse([...cookieRows, ...trackerRows]);
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `audit-${result.domain}.csv`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
