import {
  // Write tab
  PenTool,
  FileSearch,
  FileJson,
  ScanText,
  // Code tab — AI tools (merged into Code Utilities)
  FileCode,
  GitCommit,
  Bug,
  // Code tab — Code Utilities
  Code,
  Regex,
  Database,
  GitCompare,
  FileKey,
  // Code tab — Data & Formats
  Braces,
  Binary,
  Clock,
  QrCode,
  // Code tab — DevOps
  FileCheck,
  Fingerprint,
  // Media tab — Record
  MonitorSpeaker,
  Monitor,
  Users,
  // Media tab — Convert & Edit
  Image,
  Music,
  Video,
  ImageOff,
  Mic,
  Eye,
  // Media tab — Documents
  FileText,
  Layers,
  FileArchive,
  // Media tab — Design
  Palette,
  Paintbrush,
  // Protect tab — Security
  KeyRound,
  Lock,
  Hash,
  // Protect tab — Privacy
  ShieldCheck,
  EyeOff,
  Type,
  Mail as EmailInspectorIcon,
  // Quick Tools
  Sparkles,
} from "lucide-react";
import type { ModelCapability } from "@/lib/ai/registry";

// ─── Interfaces ────────────────────────────────────────────────────────

export interface ToolHubEntry {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ai?: { tier: string; capability?: ModelCapability };
}

export interface ToolHubGroup {
  label: string;
  tools: ToolHubEntry[];
}

export interface QuickTool {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

// ─── Quick AI Tools (pinned above Write tab accordion) ─────────────────

export const QUICK_TOOLS: QuickTool[] = [
  {
    href: "/ai/summarize",
    icon: Sparkles,
    title: "Summarize",
    description: "Condense text, analyze privacy policies, or summarize long documents",
  },
  {
    href: "/ai/writer?mode=rewrite",
    icon: Sparkles,
    title: "Rewrite",
    description: "Adjust tone, length, style",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 1: WRITE — 4 tools in accordion + 2 Quick AI = 6 unique tools
// "I need to compose, analyze, or process text."
// ═══════════════════════════════════════════════════════════════════════

export const WRITE_GROUPS: ToolHubGroup[] = [
  {
    label: "Writing",
    tools: [
      { href: "/ai/writer", icon: PenTool, title: "Writer", description: "Compose emails, social posts, rewrite text, tech docs, or write with custom instructions.", ai: { tier: "Balanced+", capability: "email_compose" } },
    ],
  },
  {
    label: "Analysis",
    tools: [
      { href: "/ai/analyze", icon: FileSearch, title: "Analyzer", description: "Analyze contracts, job postings, meeting notes, sentiment, keywords, and SWOT.", ai: { tier: "Tiny+", capability: "sentiment" } },
      { href: "/ai/extract", icon: FileJson, title: "Structured Extractor", description: "Extract structured JSON from unstructured text using a custom schema.", ai: { tier: "General+", capability: "extract_json" } },
      { href: "/ai/image-scanner", icon: ScanText, title: "Image Scanner", description: "Extract text from images via OCR, or parse receipts into structured data.", ai: { tier: "Specialized" } },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 2: CODE — 15 tools
// "I'm building, debugging, or deploying software."
// Route stays at /tools to avoid breaking existing /tools/* child routes.
// ═══════════════════════════════════════════════════════════════════════

export const CODE_GROUPS: ToolHubGroup[] = [
  {
    label: "Code Utilities",
    tools: [
      { href: "/ai/code-explain", icon: FileCode, title: "Code Explainer", description: "Get line-by-line explanations of code snippets.", ai: { tier: "Code", capability: "code_explain" } },
      { href: "/ai/git-writer", icon: GitCommit, title: "Git Writer", description: "Generate commit messages or PR descriptions from diffs.", ai: { tier: "Code", capability: "commit_message" } },
      { href: "/ai/error-decode", icon: Bug, title: "Error Decoder", description: "Decode error messages and stack traces into fixes.", ai: { tier: "Code", capability: "error_decode" } },
      { href: "/tools/code", icon: Code, title: "Code Tools", description: "Markdown editor, SVG \u2192 React, and code utilities." },
      { href: "/tools/regex", icon: Regex, title: "Regex Playground", description: "Test regular expressions with real-time matching and highlights." },
      { href: "/tools/sql-format", icon: Database, title: "SQL Formatter", description: "Format, beautify, and minify SQL with dialect support." },
      { href: "/tools/diff", icon: GitCompare, title: "Text Diff / Compare", description: "Compare two texts side by side with highlighted additions and deletions." },
      { href: "/tools/jwt", icon: FileKey, title: "JWT Decoder", description: "Decode and inspect JWT tokens. Header, payload, and expiry." },
    ],
  },
  {
    label: "Data & Formats",
    tools: [
      { href: "/tools/data-formatter", icon: Braces, title: "Data Formatter", description: "Format, validate, and convert JSON. Convert between JSON, YAML, and TOML." },
      { href: "/tools/encode", icon: Binary, title: "Encode / Decode", description: "Base64, HTML entities, and URL encode/decode." },
      { href: "/tools/numbers", icon: Clock, title: "Converter", description: "Number bases (bin, oct, hex), Unix epoch timestamps, and unit conversion." },
      { href: "/tools/qr", icon: QrCode, title: "QR Code Generator", description: "Create QR codes for URLs, WiFi, vCards, and text." },
    ],
  },
  {
    label: "DevOps",
    tools: [
      { href: "/tools/env-validate", icon: FileCheck, title: ".env Validator", description: "Validate .env files for format, duplicates, missing values, and secrets." },
      { href: "/tools/uuid", icon: Fingerprint, title: "UUID Generator", description: "Generate v4 UUIDs in bulk with format options." },
      { href: "/tools/cron", icon: Clock, title: "Cron Expression Builder", description: "Build cron expressions visually with presets and human-readable output." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: MEDIA — 14 tools
// "I need to record, convert, or create media assets."
// ═══════════════════════════════════════════════════════════════════════

export const MEDIA_GROUPS: ToolHubGroup[] = [
  {
    label: "Record",
    tools: [
      { href: "/record/audio", icon: MonitorSpeaker, title: "Audio Recorder", description: "Capture system audio, microphone, or both. Trim and export as MP3/WAV/OGG." },
      { href: "/record/screen", icon: Monitor, title: "Screen Recorder", description: "Record your screen with optional webcam overlay and audio. Export as WebM, MP4, or GIF." },
      { href: "/record/meeting", icon: Users, title: "Meeting Recorder", description: "Record, transcribe, and summarize meetings. Export as ZIP bundle.", ai: { tier: "AI" } },
    ],
  },
  {
    label: "Convert & Edit",
    tools: [
      { href: "/convert/images", icon: Image, title: "Image Converter", description: "Convert between PNG, JPG, WebP, AVIF, SVG. Resize and compress." },
      { href: "/convert/audio", icon: Music, title: "Audio Converter", description: "Transcode between MP3, WAV, OGG, AAC, FLAC. Adjust bitrate." },
      { href: "/convert/video", icon: Video, title: "Video Converter", description: "Convert between MP4, WebM, GIF. Resize, trim, and adjust quality." },
      { href: "/ai/background-removal", icon: ImageOff, title: "Background Removal", description: "Remove image backgrounds using AI segmentation.", ai: { tier: "Specialized" } },
      { href: "/ai/transcribe", icon: Mic, title: "Speech-to-Text", description: "Transcribe audio with timestamps using Whisper.", ai: { tier: "Specialized" } },
      { href: "/tools/exif", icon: Eye, title: "EXIF Stripper", description: "View and strip metadata from images. GPS, camera, dates." },
    ],
  },
  {
    label: "Documents",
    tools: [
      { href: "/convert/documents", icon: FileText, title: "Document Converter", description: "Convert DOCX, PDF, XLSX, CSV, JSON, and TXT between formats." },
      { href: "/tools/pdf", icon: Layers, title: "PDF Tools", description: "Merge, split, and sign PDFs \u2014 no server, no account." },
      { href: "/convert/zip", icon: FileArchive, title: "ZIP / Unzip", description: "Create and extract ZIP archives. Browse file trees." },
    ],
  },
  {
    label: "Design",
    tools: [
      { href: "/tools/design", icon: Palette, title: "Color & Design", description: "Contrast checker, CSS gradients, and color palette extraction." },
      { href: "/tools/favicon", icon: Image, title: "Favicon Generator", description: "Generate favicons from images or emoji in all required sizes." },
      { href: "/design", icon: Paintbrush, title: "Design Editor", description: "Create social media graphics with templates, fonts, shapes, and background removal." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: PROTECT — 7 tools
// "I need to secure, inspect, or clean data."
// ═══════════════════════════════════════════════════════════════════════

export const PROTECT_GROUPS: ToolHubGroup[] = [
  {
    label: "Security",
    tools: [
      { href: "/tools/password", icon: KeyRound, title: "Password Generator", description: "Generate strong passwords and passphrases with strength meter." },
      { href: "/tools/encrypt", icon: Lock, title: "File Encryption", description: "Encrypt and decrypt files with AES-256-GCM. Password-based." },
      { href: "/tools/hash", icon: Hash, title: "Hash Calculator", description: "MD5, SHA-1, SHA-256, SHA-512 for text and files." },
    ],
  },
  {
    label: "Privacy",
    tools: [
      { href: "/audit", icon: ShieldCheck, title: "Privacy Audit", description: "Scan any website for trackers, cookies, and data collection. Get an A\u2013F grade." },
      { href: "/tools/redact", icon: EyeOff, title: "Document Redactor", description: "Detect and redact sensitive data in PDFs \u2014 emails, phones, SSNs, cards." },
      { href: "/tools/text-cleaner", icon: Type, title: "Text Cleaner", description: "Strip formatting from pasted text and detect invisible characters." },
      { href: "/tools/email-inspector", icon: EmailInspectorIcon, title: "Email Inspector", description: "Detect tracking pixels in emails and analyze email headers." },
    ],
  },
];

// ─── Combined export (for search-all or sitemap use) ───────────────────

export const ALL_TAB_GROUPS = [
  ...WRITE_GROUPS,
  ...CODE_GROUPS,
  ...MEDIA_GROUPS,
  ...PROTECT_GROUPS,
];

// ─── Per-tab counts ────────────────────────────────────────────────────

const countTools = (groups: ToolHubGroup[]) =>
  groups.reduce((sum, g) => sum + g.tools.length, 0);

const countAI = (groups: ToolHubGroup[]) =>
  groups.reduce((sum, g) => sum + g.tools.filter((t) => t.ai).length, 0);

export const WRITE_TOOL_COUNT = countTools(WRITE_GROUPS) + QUICK_TOOLS.length; // 4 + 2 = 6
export const CODE_TOOL_COUNT = countTools(CODE_GROUPS);   // 16
export const MEDIA_TOOL_COUNT = countTools(MEDIA_GROUPS);  // 14
export const PROTECT_TOOL_COUNT = countTools(PROTECT_GROUPS); // 7

export const TOTAL_TOOL_COUNT = WRITE_TOOL_COUNT + CODE_TOOL_COUNT + MEDIA_TOOL_COUNT + PROTECT_TOOL_COUNT;
export const AI_TOOL_COUNT = countAI(WRITE_GROUPS) + countAI(CODE_GROUPS) + countAI(MEDIA_GROUPS) + QUICK_TOOLS.length;
