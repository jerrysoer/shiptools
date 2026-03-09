import type { PrivacyGrade } from "./types";

export const GRADE_COLORS: Record<PrivacyGrade, string> = {
  A: "var(--color-grade-a)",
  B: "var(--color-grade-b)",
  C: "var(--color-grade-c)",
  D: "var(--color-grade-d)",
  F: "var(--color-grade-f)",
};

export const GRADE_BG_CLASSES: Record<PrivacyGrade, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  F: "bg-grade-f",
};

export const GRADE_TEXT_CLASSES: Record<PrivacyGrade, string> = {
  A: "text-grade-a",
  B: "text-grade-b",
  C: "text-grade-c",
  D: "text-grade-d",
  F: "text-grade-f",
};

export const GRADE_GLOW_CLASSES: Record<PrivacyGrade, string> = {
  A: "grade-glow-a",
  B: "grade-glow-b",
  C: "grade-glow-c",
  D: "grade-glow-d",
  F: "grade-glow-f",
};

export const GRADE_LABELS: Record<PrivacyGrade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Failing",
};

/** Max scans per IP per hour */
export const SCAN_RATE_LIMIT = 10;
export const SCAN_RATE_WINDOW_MS = 60 * 60 * 1000;

/** Cache TTL for audit results */
export const AUDIT_CACHE_TTL_HOURS = 24;

/** Puppeteer navigation timeout */
export const PAGE_TIMEOUT_MS = 25_000;

/** Grade context label — clarifies that the numeric score measures tracking only */
export const GRADE_SUBTITLE = "Tracking & Surveillance Score";

/** Max file sizes for converters (bytes) */
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

/** LaMa inpainting model (ONNX, ~93 MB) */
export const LAMA_MODEL_URL =
  "https://huggingface.co/opencv/inpainting_lama/resolve/main/inpainting_lama_2025jan.onnx";

/** Max file sizes for tools (bytes) */
export const MAX_ZIP_SIZE = 200 * 1024 * 1024; // 200 MB
export const MAX_ENCRYPT_SIZE = 100 * 1024 * 1024; // 100 MB
