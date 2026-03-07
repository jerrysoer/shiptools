import { Metadata } from "next";
import Link from "next/link";
import { Image, FileText, Music, Video, Layers, FileSignature, Camera, FileArchive } from "lucide-react";
import EditorialRule from "@/components/EditorialRule";

export const metadata: Metadata = {
  title: "Convert Files Locally — ShipLocal",
  description:
    "Convert images, documents, audio, and video files entirely in your browser. No uploads, no servers, no tracking.",
};

const CONVERTERS = [
  {
    href: "/convert/images",
    icon: Image,
    title: "Image Converter",
    description: "Convert between PNG, JPG, WebP, AVIF, SVG. Resize and compress.",
    formats: ["PNG", "JPG", "WebP", "AVIF", "GIF", "BMP", "TIFF", "SVG"],
  },
  {
    href: "/convert/documents",
    icon: FileText,
    title: "Document Converter",
    description: "Convert DOCX, PDF, XLSX, CSV, JSON, and TXT between formats.",
    formats: ["DOCX", "PDF", "XLSX", "TXT", "CSV", "JSON"],
  },
  {
    href: "/convert/audio",
    icon: Music,
    title: "Audio Converter",
    description: "Transcode between MP3, WAV, OGG, AAC, FLAC. Adjust bitrate.",
    formats: ["MP3", "WAV", "OGG", "AAC", "FLAC", "M4A"],
  },
  {
    href: "/convert/video",
    icon: Video,
    title: "Video Converter",
    description: "Convert between MP4, WebM, GIF. Resize, trim, and adjust quality.",
    formats: ["MP4", "WebM", "MOV", "AVI", "MKV", "GIF"],
  },
  {
    href: "/convert/pdf-tools",
    icon: Layers,
    title: "PDF Merge & Split",
    description: "Merge multiple PDFs into one or split by page ranges.",
    formats: ["PDF"],
  },
  {
    href: "/sign",
    icon: FileSignature,
    title: "Sign PDFs",
    description: "Add signatures, fill form fields, and insert dates — no server, no account.",
    formats: ["PDF"],
  },
  {
    href: "/convert/scan",
    icon: Camera,
    title: "Document Scanner",
    description: "Scan documents with your camera. Edge detection, perspective correction, OCR.",
    formats: ["PDF", "PNG", "JPG"],
  },
  {
    href: "/convert/zip",
    icon: FileArchive,
    title: "ZIP / Unzip",
    description: "Create and extract ZIP archives. Browse file trees.",
    formats: ["ZIP"],
  },
] as const;

export default function ConvertPage() {
  return (
    <div>
      {/* Header with editorial rule and department accent */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "var(--color-dept-convert)" }} />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            Department No. 01
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">
          Convert
        </h1>
        <p className="text-text-secondary max-w-xl">
          All processing happens locally in your browser using WebAssembly.
          Your files never leave your device.
        </p>
      </div>

      <div className="space-y-1">
        {CONVERTERS.map(({ href, icon: Icon, title, description, formats }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 py-5 border-b border-border hover:bg-bg-surface transition-colors -mx-3 px-3"
            style={{ borderLeftWidth: "3px", borderLeftColor: "var(--color-dept-convert)" }}
          >
            <Icon className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary transition-colors flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-semibold text-lg mb-1 group-hover:text-accent transition-colors">
                {title}
              </h2>
              <p className="text-text-secondary text-sm mb-2">{description}</p>
              <div className="flex flex-wrap gap-1.5">
                {formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 bg-bg-elevated text-text-tertiary"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
