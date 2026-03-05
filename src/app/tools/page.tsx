import { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  Hash,
  QrCode,
  Braces,
  KeyRound,
  Binary,
  Fingerprint,
  Lock,
  Clock,
  FileKey,
  Scan,
  Type,
  ClipboardPaste,
  Unplug,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Developer & Privacy Tools — ShipTools",
  description:
    "Developer and privacy tools that run entirely in your browser. Hash, encode, encrypt, generate, inspect — no uploads, no tracking.",
};

interface ToolEntry {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const DEVELOPER_TOOLS: ToolEntry[] = [
  {
    href: "/tools/json",
    icon: Braces,
    title: "JSON Formatter",
    description: "Format, minify, validate, and convert JSON to CSV/YAML.",
  },
  {
    href: "/tools/hash",
    icon: Hash,
    title: "Hash Calculator",
    description: "MD5, SHA-1, SHA-256, SHA-512 for text and files.",
  },
  {
    href: "/tools/base64",
    icon: Binary,
    title: "Base64 Encode/Decode",
    description: "Encode and decode Base64 for text and files.",
  },
  {
    href: "/tools/uuid",
    icon: Fingerprint,
    title: "UUID Generator",
    description: "Generate v4 UUIDs in bulk with format options.",
  },
  {
    href: "/tools/qr",
    icon: QrCode,
    title: "QR Code Generator",
    description: "Create QR codes for URLs, WiFi, vCards, and text.",
  },
  {
    href: "/tools/password",
    icon: KeyRound,
    title: "Password Generator",
    description: "Generate strong passwords and passphrases with strength meter.",
  },
  {
    href: "/tools/epoch",
    icon: Clock,
    title: "Epoch Converter",
    description: "Convert between Unix timestamps, ISO 8601, and human dates.",
  },
  {
    href: "/tools/jwt",
    icon: FileKey,
    title: "JWT Decoder",
    description: "Decode and inspect JWT tokens. Header, payload, and expiry.",
  },
  {
    href: "/tools/encrypt",
    icon: Lock,
    title: "File Encryption",
    description: "Encrypt and decrypt files with AES-256-GCM. Password-based.",
  },
  {
    href: "/tools/exif",
    icon: Eye,
    title: "EXIF Stripper",
    description: "View and strip metadata from images. GPS, camera, dates.",
  },
];

const PRIVACY_TOOLS: ToolEntry[] = [
  {
    href: "/tools/fingerprint",
    icon: Scan,
    title: "Browser Fingerprint",
    description: "See what your browser reveals. Canvas, WebGL, fonts, and more.",
  },
  {
    href: "/tools/tracking-pixels",
    icon: Unplug,
    title: "Tracking Pixel Detector",
    description: "Paste email HTML to detect hidden tracking pixels.",
  },
  {
    href: "/tools/invisible-chars",
    icon: Type,
    title: "Invisible Characters",
    description: "Detect zero-width chars, homoglyphs, and bidi controls.",
  },
  {
    href: "/tools/clipboard",
    icon: ClipboardPaste,
    title: "Clipboard Cleaner",
    description: "Paste rich text to strip tracking, styles, and hidden markup.",
  },
];

function ToolCard({ href, icon: Icon, title, description }: ToolEntry) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 bg-bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-colors"
    >
      <div className="p-2.5 rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div>
        <h3 className="font-heading font-semibold mb-0.5">{title}</h3>
        <p className="text-text-secondary text-sm">{description}</p>
      </div>
    </Link>
  );
}

function ToolSection({
  title,
  tools,
  columns = 1,
}: {
  title: string;
  tools: ToolEntry[];
  columns?: 1 | 2;
}) {
  return (
    <section>
      <h2 className="font-heading font-semibold text-lg text-text-secondary mb-3">
        {title}
      </h2>
      <div
        className={`grid gap-3 ${
          columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </section>
  );
}

export default function ToolsPage() {
  return (
    <div>
      {/* Hero with dotted grid background */}
      <div
        className="text-center mb-10 py-2 -mx-6 px-6 relative"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="relative">
          <h1 className="font-heading font-bold text-3xl mb-3">
            Developer & Privacy Tools
          </h1>
          <p className="text-text-secondary mb-4">
            Hash, encode, encrypt, generate, and inspect — all in your browser.
            No data leaves your device.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-grade-a/10 border border-grade-a/20 text-grade-a text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            All processing happens in your browser
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ToolSection title="Developer" tools={DEVELOPER_TOOLS} columns={2} />
        <ToolSection title="Privacy" tools={PRIVACY_TOOLS} />
      </div>
    </div>
  );
}
