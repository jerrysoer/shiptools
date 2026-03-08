import {
  // Write tab — Writing
  Mail,
  Shield,
  PenTool,
  // Write tab — Analysis
  FileJson,
  FileText,
  Users,
  ScanText,
  // Write tab — Text Utilities
  ALargeSmall,
  // Code tab — AI Code
  SearchCode,
  FileCode,
  GitCommit,
  GitPullRequest,
  BookOpen,
  FlaskConical,
  Bug,
  Database,
  ShieldCheck,
  // Code tab — Code Utilities
  Code,
  Regex,
  GitCompare,
  Camera,
  Eye as OGPreviewIcon,
  // Code tab — Data & Encode
  Braces,
  ArrowLeftRight,
  Binary,
  Clock,
  Ruler,
  QrCode,
  // Code tab — DevOps & System
  FileCheck,
  Bot,
  Fingerprint,
  Network,
  Monitor,
  // Media tab — Record
  MonitorSpeaker,
  // Media tab — Convert Media
  Image,
  Music,
  Video,
  ImageOff,
  Mic,
  // Media tab — Documents
  Layers,
  FileSignature,
  FileArchive,
  // Media tab — Design
  Palette,
  // Protect tab — Security & Crypto
  KeyRound,
  FileKey,
  Lock,
  Hash,
  Eye,
  // Protect tab — Privacy & Data
  Scan,
  Unplug,
  Type,
  ClipboardPaste,
  EyeOff,
  Mail as EmailHeaderIcon,
  FileSearch,
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
// TAB 1: WRITE — 6 tools in accordion + 2 Quick AI = 8 unique tools
// "I need to compose, analyze, or process text."
// ═══════════════════════════════════════════════════════════════════════

export const WRITE_GROUPS: ToolHubGroup[] = [
  {
    label: "Writing",
    tools: [
      { href: "/ai/writer", icon: PenTool, title: "Writer", description: "Compose emails, social posts, rewrite text, or write with custom instructions.", ai: { tier: "Balanced+", capability: "email_compose" } },
      { href: "/ai/tech-writing", icon: PenTool, title: "Tech Writing Assistant", description: "Generate technical documentation and guides.", ai: { tier: "Ollama", capability: "tech_writing" } },
      { href: "/tools/text", icon: ALargeSmall, title: "Text Utilities", description: "Word count, case conversion, lorem ipsum, and text transformations." },
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
// TAB 2: CODE — 29 tools
// "I'm building, debugging, or deploying software."
// Route stays at /tools to avoid breaking 29 existing /tools/* child routes.
// ═══════════════════════════════════════════════════════════════════════

export const CODE_GROUPS: ToolHubGroup[] = [
  {
    label: "AI Code Tools",
    tools: [
      { href: "/ai/code-review", icon: SearchCode, title: "Code Reviewer", description: "Review code for bugs, security, performance, and style.", ai: { tier: "Code", capability: "code_review" } },
      { href: "/ai/code-explain", icon: FileCode, title: "Code Explainer", description: "Get line-by-line explanations of code snippets.", ai: { tier: "Code", capability: "code_explain" } },
      { href: "/ai/commit-msg", icon: GitCommit, title: "Commit Message", description: "Generate conventional commit messages from diffs.", ai: { tier: "Code", capability: "commit_message" } },
      { href: "/ai/pr-desc", icon: GitPullRequest, title: "PR Description", description: "Write pull request descriptions from diffs.", ai: { tier: "Code", capability: "pr_description" } },
      { href: "/ai/readme-gen", icon: BookOpen, title: "README Generator", description: "Generate project README from descriptions.", ai: { tier: "Code", capability: "readme_generate" } },
      { href: "/ai/test-gen", icon: FlaskConical, title: "Test Generator", description: "Generate test cases for functions (Jest, pytest).", ai: { tier: "Code", capability: "test_generate" } },
      { href: "/ai/error-decode", icon: Bug, title: "Error Decoder", description: "Decode error messages and stack traces into fixes.", ai: { tier: "Code", capability: "error_decode" } },
      { href: "/ai/sql-gen", icon: Database, title: "SQL Generator", description: "Generate SQL from natural language descriptions.", ai: { tier: "Code", capability: "sql_generate" } },
      { href: "/ai/full-review", icon: ShieldCheck, title: "Full Code Review", description: "Comprehensive code review for large files.", ai: { tier: "Ollama", capability: "full_review" } },
    ],
  },
  {
    label: "Code Utilities",
    tools: [
      { href: "/tools/code", icon: Code, title: "Code Tools", description: "Markdown editor, SVG \u2192 React, and code utilities." },
      { href: "/tools/regex", icon: Regex, title: "Regex Playground", description: "Test regular expressions with real-time matching and highlights." },
      { href: "/tools/sql-format", icon: Database, title: "SQL Formatter", description: "Format, beautify, and minify SQL with dialect support." },
      { href: "/tools/diff", icon: GitCompare, title: "Text Diff / Compare", description: "Compare two texts side by side with highlighted additions and deletions." },
      { href: "/tools/code-screenshot", icon: Camera, title: "Code Screenshot", description: "Generate beautiful code screenshots for sharing." },
      { href: "/tools/og-preview", icon: OGPreviewIcon, title: "OG Image Preview", description: "Preview how your page looks when shared on Twitter, Facebook, and LinkedIn." },
    ],
  },
  {
    label: "Data & Encode",
    tools: [
      { href: "/tools/json", icon: Braces, title: "JSON Formatter", description: "Format, minify, validate, and convert JSON to CSV/YAML." },
      { href: "/tools/format-convert", icon: ArrowLeftRight, title: "JSON / YAML / TOML Converter", description: "Convert between JSON, YAML, and TOML with auto-detection." },
      { href: "/tools/encode", icon: Binary, title: "Encode / Decode", description: "Base64, HTML entities, and URL encode/decode." },
      { href: "/tools/numbers", icon: Clock, title: "Number & Date Converter", description: "Number bases (bin, oct, hex) and Unix epoch timestamps." },
      { href: "/tools/units", icon: Ruler, title: "Unit Converter", description: "Convert length, weight, temperature, data, time, and speed." },
      { href: "/tools/qr", icon: QrCode, title: "QR Code Generator", description: "Create QR codes for URLs, WiFi, vCards, and text." },
    ],
  },
  {
    label: "DevOps & System",
    tools: [
      { href: "/tools/env-validate", icon: FileCheck, title: ".env Validator", description: "Validate .env files for format, duplicates, missing values, and secrets." },
      { href: "/tools/robots", icon: Bot, title: "robots.txt Generator", description: "Build robots.txt visually with AI crawler and SEO presets." },
      { href: "/tools/csp", icon: Shield, title: "CSP Header Builder", description: "Build Content-Security-Policy headers with visual toggles and presets." },
      { href: "/tools/uuid", icon: Fingerprint, title: "UUID Generator", description: "Generate v4 UUIDs in bulk with format options." },
      { href: "/tools/cron", icon: Clock, title: "Cron Expression Builder", description: "Build cron expressions visually with presets and human-readable output." },
      { href: "/tools/chmod", icon: Shield, title: "Chmod Calculator", description: "Calculate Unix file permissions with a visual checkbox grid." },
      { href: "/tools/ip-calc", icon: Network, title: "IP / Subnet Calculator", description: "Calculate subnet details from CIDR notation or IP + mask." },
      { href: "/tools/useragent", icon: Monitor, title: "User-Agent Parser", description: "Parse UA strings for browser, OS, device type, and bot detection." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: MEDIA — 15 tools
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
    label: "Convert Media",
    tools: [
      { href: "/convert/images", icon: Image, title: "Image Converter", description: "Convert between PNG, JPG, WebP, AVIF, SVG. Resize and compress." },
      { href: "/convert/audio", icon: Music, title: "Audio Converter", description: "Transcode between MP3, WAV, OGG, AAC, FLAC. Adjust bitrate." },
      { href: "/convert/video", icon: Video, title: "Video Converter", description: "Convert between MP4, WebM, GIF. Resize, trim, and adjust quality." },
      { href: "/ai/background-removal", icon: ImageOff, title: "Background Removal", description: "Remove image backgrounds using AI segmentation.", ai: { tier: "Specialized" } },
      { href: "/ai/transcribe", icon: Mic, title: "Speech-to-Text", description: "Transcribe audio with timestamps using Whisper.", ai: { tier: "Specialized" } },
    ],
  },
  {
    label: "Documents",
    tools: [
      { href: "/convert/documents", icon: FileText, title: "Document Converter", description: "Convert DOCX, PDF, XLSX, CSV, JSON, and TXT between formats." },
      { href: "/convert/pdf-tools", icon: Layers, title: "PDF Merge & Split", description: "Merge multiple PDFs into one or split by page ranges." },
      { href: "/sign", icon: FileSignature, title: "Sign PDFs", description: "Add signatures, fill form fields, and insert dates — no server, no account." },
      { href: "/convert/scan", icon: Camera, title: "Document Scanner", description: "Scan documents with your camera. Edge detection, perspective correction, OCR." },
      { href: "/convert/zip", icon: FileArchive, title: "ZIP / Unzip", description: "Create and extract ZIP archives. Browse file trees." },
    ],
  },
  {
    label: "Design",
    tools: [
      { href: "/tools/favicon", icon: Image, title: "Favicon Generator", description: "Generate favicons from images or emoji in all required sizes." },
      { href: "/tools/design", icon: Palette, title: "Color & Design", description: "Contrast checker, CSS gradients, and color palette extraction." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: PROTECT — 12 tools
// "I need to secure, inspect, or clean data."
// ═══════════════════════════════════════════════════════════════════════

export const PROTECT_GROUPS: ToolHubGroup[] = [
  {
    label: "Security & Crypto",
    tools: [
      { href: "/tools/password", icon: KeyRound, title: "Password Generator", description: "Generate strong passwords and passphrases with strength meter." },
      { href: "/tools/jwt", icon: FileKey, title: "JWT Decoder", description: "Decode and inspect JWT tokens. Header, payload, and expiry." },
      { href: "/tools/encrypt", icon: Lock, title: "File Encryption", description: "Encrypt and decrypt files with AES-256-GCM. Password-based." },
      { href: "/tools/hash", icon: Hash, title: "Hash Calculator", description: "MD5, SHA-1, SHA-256, SHA-512 for text and files." },
      { href: "/tools/exif", icon: Eye, title: "EXIF Stripper", description: "View and strip metadata from images. GPS, camera, dates." },
    ],
  },
  {
    label: "Privacy & Data Protection",
    tools: [
      { href: "/audit", icon: ShieldCheck, title: "Privacy Audit", description: "Scan any website for trackers, cookies, and data collection. Get an A\u2013F grade." },
      { href: "/tools/fingerprint", icon: Scan, title: "Browser Fingerprint", description: "See what your browser reveals. Canvas, WebGL, fonts, and more." },
      { href: "/tools/tracking-pixels", icon: Unplug, title: "Tracking Pixel Detector", description: "Paste email HTML to detect hidden tracking pixels." },
      { href: "/tools/invisible-chars", icon: Type, title: "Invisible Characters", description: "Detect zero-width chars, homoglyphs, and bidi controls." },
      { href: "/tools/clipboard", icon: ClipboardPaste, title: "Clipboard Cleaner", description: "Paste rich text to strip tracking, styles, and hidden markup." },
      { href: "/tools/redact", icon: EyeOff, title: "Document Redactor", description: "Detect and redact sensitive data in PDFs \u2014 emails, phones, SSNs, cards." },
      { href: "/tools/email-headers", icon: EmailHeaderIcon, title: "Email Header Analyzer", description: "Parse email headers to trace server hops and check SPF/DKIM/DMARC." },
      { href: "/tools/file-signature", icon: FileSearch, title: "File Signature Checker", description: "Verify file types by magic bytes. Detect extension mismatches." },
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

export const WRITE_TOOL_COUNT = countTools(WRITE_GROUPS) + QUICK_TOOLS.length; // 6 + 2 = 8
export const CODE_TOOL_COUNT = countTools(CODE_GROUPS);   // 29
export const MEDIA_TOOL_COUNT = countTools(MEDIA_GROUPS);  // 15
export const PROTECT_TOOL_COUNT = countTools(PROTECT_GROUPS); // 12

export const TOTAL_TOOL_COUNT = WRITE_TOOL_COUNT + CODE_TOOL_COUNT + MEDIA_TOOL_COUNT + PROTECT_TOOL_COUNT;
export const AI_TOOL_COUNT = countAI(WRITE_GROUPS) + countAI(CODE_GROUPS) + countAI(MEDIA_GROUPS) + QUICK_TOOLS.length;
