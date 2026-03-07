import {
  // Writing & Communication
  Mail,
  Share2,
  Shield,
  PenTool,
  ALargeSmall,
  Pilcrow,
  // Code & Development
  SearchCode,
  FileCode,
  GitCommit,
  GitPullRequest,
  BookOpen,
  FlaskConical,
  Bug,
  Database,
  ShieldCheck,
  Code,
  Regex,
  GitCompare,
  Camera,
  FileCheck,
  Bot,
  // Documents & Analysis
  FileJson,
  FileText,
  Users,
  Briefcase,
  Receipt,
  LayoutGrid,
  HeartPulse,
  Tags,
  // Media & Vision
  ImageOff,
  ScanText,
  Mic,
  FileStack,
  Image,
  Palette,
  // Encode & Transform
  Braces,
  ArrowLeftRight,
  Binary,
  Hash,
  Clock,
  Ruler,
  Eye as OGPreviewIcon,
  TextCursorInput,
  // Security & Crypto
  KeyRound,
  FileKey,
  Lock,
  Eye,
  // Privacy & Inspection
  Scan,
  Unplug,
  Type,
  ClipboardPaste,
  EyeOff,
  Mail as EmailHeaderIcon,
  FileSearch,
  // System & DevOps
  Fingerprint,
  QrCode,
  Network,
  Monitor,
  // Quick Tools
  Sparkles,
} from "lucide-react";

// Re-export for icon references that collide (Eye, Mail used in two groups)
// We alias them in the import above so each tool gets a clear binding.

export interface ToolHubEntry {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ai?: { tier: string };
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

// ─── Quick AI Tools (pinned above accordion) ────────────────────────

export const QUICK_TOOLS: QuickTool[] = [
  {
    href: "/ai/summarize",
    icon: Sparkles,
    title: "Summarize",
    description: "Condense text to key points",
  },
  {
    href: "/ai/rewrite",
    icon: Sparkles,
    title: "Rewrite",
    description: "Adjust tone, length, style",
  },
];

// ─── 8 Functional Groups (62 tools) ─────────────────────────────────

export const TOOL_HUB_GROUPS: ToolHubGroup[] = [
  // 1. Writing & Communication (6 tools, 4 AI)
  {
    label: "Writing & Communication",
    tools: [
      { href: "/ai/email", icon: Mail, title: "Email Composer", description: "Draft emails with tone control — professional, casual, follow-up.", ai: { tier: "Balanced+" } },
      { href: "/ai/social", icon: Share2, title: "Social Post Generator", description: "Create platform-optimized posts for Twitter, LinkedIn, Instagram.", ai: { tier: "Balanced+" } },
      { href: "/ai/privacy-policy", icon: Shield, title: "Privacy Policy Summarizer", description: "Analyze privacy policies for data collection, sharing, and red flags.", ai: { tier: "General+" } },
      { href: "/ai/tech-writing", icon: PenTool, title: "Tech Writing Assistant", description: "Generate technical documentation and guides.", ai: { tier: "Ollama" } },
      { href: "/tools/text", icon: ALargeSmall, title: "Text Utilities", description: "Word count, case conversion, and text transformations." },
      { href: "/tools/lorem", icon: Pilcrow, title: "Lorem Ipsum Generator", description: "Generate placeholder text in various styles and lengths." },
    ],
  },

  // 2. Code & Development (17 tools, 10 AI)
  {
    label: "Code & Development",
    tools: [
      { href: "/ai/code-review", icon: SearchCode, title: "Code Reviewer", description: "Review code for bugs, security, performance, and style.", ai: { tier: "Code" } },
      { href: "/ai/code-explain", icon: FileCode, title: "Code Explainer", description: "Get line-by-line explanations of code snippets.", ai: { tier: "Code" } },
      { href: "/ai/commit-msg", icon: GitCommit, title: "Commit Message", description: "Generate conventional commit messages from diffs.", ai: { tier: "Code" } },
      { href: "/ai/pr-desc", icon: GitPullRequest, title: "PR Description", description: "Write pull request descriptions from diffs.", ai: { tier: "Code" } },
      { href: "/ai/readme-gen", icon: BookOpen, title: "README Generator", description: "Generate project README from descriptions.", ai: { tier: "Code" } },
      { href: "/ai/test-gen", icon: FlaskConical, title: "Test Generator", description: "Generate test cases for functions (Jest, pytest).", ai: { tier: "Code" } },
      { href: "/ai/error-decode", icon: Bug, title: "Error Decoder", description: "Decode error messages and stack traces into fixes.", ai: { tier: "Code" } },
      { href: "/ai/sql-gen", icon: Database, title: "SQL Generator", description: "Generate SQL from natural language descriptions.", ai: { tier: "Code" } },
      { href: "/ai/full-review", icon: ShieldCheck, title: "Full Code Review", description: "Comprehensive code review for large files.", ai: { tier: "Ollama" } },
      { href: "/tools/code", icon: Code, title: "Code Tools", description: "Markdown editor, SVG \u2192 React, and code utilities." },
      { href: "/tools/regex", icon: Regex, title: "Regex Playground", description: "Test regular expressions with real-time matching and highlights." },
      { href: "/tools/sql-format", icon: Database, title: "SQL Formatter", description: "Format, beautify, and minify SQL with dialect support." },
      { href: "/tools/diff", icon: GitCompare, title: "Text Diff / Compare", description: "Compare two texts side by side with highlighted additions and deletions." },
      { href: "/tools/code-screenshot", icon: Camera, title: "Code Screenshot", description: "Generate beautiful code screenshots for sharing." },
      { href: "/tools/env-validate", icon: FileCheck, title: ".env Validator", description: "Validate .env files for format, duplicates, missing values, and secrets." },
      { href: "/tools/robots", icon: Bot, title: "robots.txt Generator", description: "Build robots.txt visually with AI crawler and SEO presets." },
      { href: "/tools/csp", icon: Shield, title: "CSP Header Builder", description: "Build Content-Security-Policy headers with visual toggles and presets." },
    ],
  },

  // 3. Documents & Analysis (8 tools, 8 AI)
  {
    label: "Documents & Analysis",
    tools: [
      { href: "/ai/extract", icon: FileJson, title: "Structured Extractor", description: "Extract structured JSON from unstructured text using a custom schema.", ai: { tier: "General+" } },
      { href: "/ai/contracts", icon: FileText, title: "Contract Analyzer", description: "Analyze contracts and flag clauses by severity.", ai: { tier: "General+" } },
      { href: "/ai/meeting-minutes", icon: Users, title: "Meeting Minutes", description: "Generate structured minutes from meeting transcripts.", ai: { tier: "General+" } },
      { href: "/ai/job-analyzer", icon: Briefcase, title: "Job Description Analyzer", description: "Analyze job postings for red flags, requirements, and match tips.", ai: { tier: "General+" } },
      { href: "/ai/receipts", icon: Receipt, title: "Receipt Parser", description: "Upload receipt images \u2192 OCR \u2192 structured line items and totals.", ai: { tier: "General+" } },
      { href: "/ai/swot", icon: LayoutGrid, title: "SWOT Analyzer", description: "Strategic SWOT analysis for businesses and projects.", ai: { tier: "Reasoning" } },
      { href: "/ai/sentiment", icon: HeartPulse, title: "Sentiment Analyzer", description: "Analyze emotional tone and sentiment of text.", ai: { tier: "Tiny+" } },
      { href: "/ai/keywords", icon: Tags, title: "Keyword Extractor", description: "Extract and categorize keywords from text.", ai: { tier: "Tiny+" } },
    ],
  },

  // 4. Media & Vision (6 tools, 4 AI)
  {
    label: "Media & Vision",
    tools: [
      { href: "/ai/background-removal", icon: ImageOff, title: "Background Removal", description: "Remove image backgrounds using AI segmentation.", ai: { tier: "Specialized" } },
      { href: "/ai/ocr", icon: ScanText, title: "OCR \u2014 Text from Images", description: "Extract text from images with Tesseract.js.", ai: { tier: "Specialized" } },
      { href: "/ai/transcribe", icon: Mic, title: "Speech-to-Text", description: "Transcribe audio with timestamps using Whisper.", ai: { tier: "Specialized" } },
      { href: "/ai/long-doc", icon: FileStack, title: "Long Document Summarizer", description: "Summarize lengthy documents with 8K+ context.", ai: { tier: "Ollama" } },
      { href: "/tools/favicon", icon: Image, title: "Favicon Generator", description: "Generate favicons from images or emoji in all required sizes." },
      { href: "/tools/design", icon: Palette, title: "Color & Design", description: "Contrast checker, CSS gradients, and color palette extraction." },
    ],
  },

  // 5. Encode & Transform (8 tools, 0 AI)
  {
    label: "Encode & Transform",
    tools: [
      { href: "/tools/json", icon: Braces, title: "JSON Formatter", description: "Format, minify, validate, and convert JSON to CSV/YAML." },
      { href: "/tools/format-convert", icon: ArrowLeftRight, title: "JSON / YAML / TOML Converter", description: "Convert between JSON, YAML, and TOML with auto-detection." },
      { href: "/tools/encode", icon: Binary, title: "Encode / Decode", description: "Base64, HTML entities, and URL encode/decode." },
      { href: "/tools/hash", icon: Hash, title: "Hash Calculator", description: "MD5, SHA-1, SHA-256, SHA-512 for text and files." },
      { href: "/tools/numbers", icon: Clock, title: "Number & Date Converter", description: "Number bases (bin, oct, hex) and Unix epoch timestamps." },
      { href: "/tools/units", icon: Ruler, title: "Unit Converter", description: "Convert length, weight, temperature, data, time, and speed." },
      { href: "/tools/og-preview", icon: OGPreviewIcon, title: "OG Image Preview", description: "Preview how your page looks when shared on Twitter, Facebook, and LinkedIn." },
      { href: "/tools/wordcount", icon: TextCursorInput, title: "Word Count", description: "Count words, characters, sentences, and reading time." },
    ],
  },

  // 6. Security & Crypto (4 tools, 0 AI)
  {
    label: "Security & Crypto",
    tools: [
      { href: "/tools/password", icon: KeyRound, title: "Password Generator", description: "Generate strong passwords and passphrases with strength meter." },
      { href: "/tools/jwt", icon: FileKey, title: "JWT Decoder", description: "Decode and inspect JWT tokens. Header, payload, and expiry." },
      { href: "/tools/encrypt", icon: Lock, title: "File Encryption", description: "Encrypt and decrypt files with AES-256-GCM. Password-based." },
      { href: "/tools/exif", icon: Eye, title: "EXIF Stripper", description: "View and strip metadata from images. GPS, camera, dates." },
    ],
  },

  // 7. Privacy & Inspection (7 tools, 0 AI)
  {
    label: "Privacy & Inspection",
    tools: [
      { href: "/tools/fingerprint", icon: Scan, title: "Browser Fingerprint", description: "See what your browser reveals. Canvas, WebGL, fonts, and more." },
      { href: "/tools/tracking-pixels", icon: Unplug, title: "Tracking Pixel Detector", description: "Paste email HTML to detect hidden tracking pixels." },
      { href: "/tools/invisible-chars", icon: Type, title: "Invisible Characters", description: "Detect zero-width chars, homoglyphs, and bidi controls." },
      { href: "/tools/clipboard", icon: ClipboardPaste, title: "Clipboard Cleaner", description: "Paste rich text to strip tracking, styles, and hidden markup." },
      { href: "/tools/redact", icon: EyeOff, title: "Document Redactor", description: "Detect and redact sensitive data in PDFs \u2014 emails, phones, SSNs, cards." },
      { href: "/tools/email-headers", icon: EmailHeaderIcon, title: "Email Header Analyzer", description: "Parse email headers to trace server hops and check SPF/DKIM/DMARC." },
      { href: "/tools/file-signature", icon: FileSearch, title: "File Signature Checker", description: "Verify file types by magic bytes. Detect extension mismatches." },
    ],
  },

  // 8. System & DevOps (6 tools, 0 AI)
  {
    label: "System & DevOps",
    tools: [
      { href: "/tools/uuid", icon: Fingerprint, title: "UUID Generator", description: "Generate v4 UUIDs in bulk with format options." },
      { href: "/tools/qr", icon: QrCode, title: "QR Code Generator", description: "Create QR codes for URLs, WiFi, vCards, and text." },
      { href: "/tools/cron", icon: Clock, title: "Cron Expression Builder", description: "Build cron expressions visually with presets and human-readable output." },
      { href: "/tools/chmod", icon: Shield, title: "Chmod Calculator", description: "Calculate Unix file permissions with a visual checkbox grid." },
      { href: "/tools/ip-calc", icon: Network, title: "IP / Subnet Calculator", description: "Calculate subnet details from CIDR notation or IP + mask." },
      { href: "/tools/useragent", icon: Monitor, title: "User-Agent Parser", description: "Parse UA strings for browser, OS, device type, and bot detection." },
    ],
  },
];

// Total tool count for display
export const TOTAL_TOOL_COUNT = TOOL_HUB_GROUPS.reduce(
  (sum, g) => sum + g.tools.length,
  0
);

export const AI_TOOL_COUNT = TOOL_HUB_GROUPS.reduce(
  (sum, g) => sum + g.tools.filter((t) => t.ai).length,
  0
);
