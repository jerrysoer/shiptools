const STORAGE_KEY = "st_analytics_consent";

export type ConsentStatus = "accepted" | "declined" | "unknown";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "accepted" || value === "declined") return value;
  return "unknown";
}

export function setConsentStatus(status: "accepted" | "declined"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, status);
}

export function hasOptedOut(): boolean {
  return getConsentStatus() === "declined";
}
