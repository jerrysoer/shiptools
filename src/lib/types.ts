export type PrivacyGrade = "A" | "B" | "C" | "D" | "F";

export interface CookieInfo {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expires: number;
  /** Whether the cookie belongs to a third party */
  thirdParty: boolean;
}

export interface TrackerMatch {
  domain: string;
  category: "analytics" | "advertising" | "session-recording" | "social" | "cdn" | "unknown";
  name: string;
}

export interface ScanData {
  url: string;
  domain: string;
  scannedAt: string;
  loadTimeMs: number;
  consent: {
    bannerDetected: boolean;
    bannerClicked: boolean;
    cmpName: string | null;
    googleConsentMode?: boolean;
    consentDefaultGranted?: boolean;
  };
  cookies: {
    total: number;
    firstParty: number;
    thirdParty: number;
    items: CookieInfo[];
  };
  thirdPartyDomains: {
    total: number;
    items: string[];
  };
  trackers: {
    analytics: TrackerMatch[];
    advertising: TrackerMatch[];
    sessionRecording: TrackerMatch[];
    social: TrackerMatch[];
  };
  /** Whether the tool processes files server-side (heuristic) */
  serverSideProcessing: boolean;
}

export interface AuditScores {
  thirdPartyCookies: number;
  thirdPartyDomains: number;
  sessionRecording: number;
  adNetworks: number;
  analyticsTrackers: number;
  serverSide: number;
  /** How many tracker categories (analytics/ads/recording/social) are present (0-100) */
  trackerDiversity: number;
  /** Weighted total (0-100) */
  total: number;
}

export interface AuditResult {
  id: string;
  domain: string;
  displayUrl: string;
  grade: PrivacyGrade;
  scores: AuditScores;
  scan: ScanData;
  cachedAt: string;
  expiresAt: string;
}

export interface ScanRequest {
  url: string;
}

export interface ScanResponse {
  success: true;
  result: AuditResult;
}

export interface ScanError {
  success: false;
  error: string;
  code?: "RATE_LIMITED" | "INVALID_URL" | "SCAN_FAILED" | "SSRF_BLOCKED" | "TIMEOUT";
  retryAfter?: number;
}

export type AnalyticsEventName =
  | "page_view"
  | "tool_opened"
  | "tool_used"
  | "scan_initiated"
  | "scan_completed"
  | "report_shared"
  | "telemetry_opted_out"
  | "ai_model_loaded"
  | "ai_tool_used"
  | "ai_model_deleted"
  | "recording_started"
  | "recording_completed"
  | "recording_exported"
  | "recording_transcribed"
  | "scan_captured";

export interface AnalyticsEvent {
  event: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
  session_id?: string;
  referrer_domain?: string;
  device_type?: string;
}

/** Converter types */
export type ImageFormat = "png" | "jpg" | "webp" | "avif" | "gif" | "bmp" | "tiff" | "svg";
export type DocumentFormat = "pdf" | "docx" | "txt" | "csv" | "json" | "xlsx";
export type AudioFormat = "mp3" | "wav" | "ogg" | "aac" | "flac" | "m4a";
export type VideoFormat = "mp4" | "webm" | "gif";

export interface ConversionJob {
  id: string;
  file: File;
  inputFormat: string;
  outputFormat: string;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  quality?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  trimStart?: number;
  trimEnd?: number;
  /** Video resolution preset (e.g. "1920x1080") */
  resolution?: string;
  /** Video CRF quality (0=lossless, 51=worst) */
  videoCrf?: number;
}
