import { Metadata } from "next";
import Link from "next/link";
import { Image, FileText, Music, Video, Layers, FileArchive, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Convert Files Locally — ShipTools",
  description:
    "Convert images, documents, audio, and video files entirely in your browser. No uploads, no servers, no tracking.",
};

const CONVERTERS = [
  {
    href: "/convert/images",
    icon: Image,
    title: "Image Converter",
    description: "Convert between PNG, JPG, WebP, AVIF, SVG. Resize and compress.",
    formats: "PNG, JPG, WebP, AVIF, GIF, BMP, TIFF, SVG",
  },
  {
    href: "/convert/documents",
    icon: FileText,
    title: "Document Converter",
    description: "Convert DOCX, PDF, XLSX, CSV, JSON, and TXT between formats.",
    formats: "DOCX, PDF, XLSX, TXT, CSV, JSON",
  },
  {
    href: "/convert/audio",
    icon: Music,
    title: "Audio Converter",
    description: "Transcode between MP3, WAV, OGG, AAC, FLAC. Adjust bitrate.",
    formats: "MP3, WAV, OGG, AAC, FLAC, M4A",
  },
  {
    href: "/convert/video",
    icon: Video,
    title: "Video Converter",
    description: "Convert between MP4, WebM, GIF. Resize, trim, and adjust quality.",
    formats: "MP4, WebM, MOV, AVI, MKV, GIF",
  },
  {
    href: "/convert/pdf-tools",
    icon: Layers,
    title: "PDF Merge & Split",
    description: "Merge multiple PDFs into one or split by page ranges.",
    formats: "PDF",
  },
  {
    href: "/convert/zip",
    icon: FileArchive,
    title: "ZIP / Unzip",
    description: "Create and extract ZIP archives. Browse file trees.",
    formats: "ZIP",
  },
] as const;

export default function ConvertPage() {
  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="font-heading font-bold text-3xl mb-3">
          Convert files without uploading them
        </h1>
        <p className="text-text-secondary mb-4">
          All processing happens locally in your browser using WebAssembly.
          Your files never leave your device.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-grade-a/10 border border-grade-a/20 text-grade-a text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          Zero network requests during conversion
        </div>
      </div>

      <div className="grid gap-4">
        {CONVERTERS.map(({ href, icon: Icon, title, description, formats }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
          >
            <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
              <Icon className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg mb-1">{title}</h2>
              <p className="text-text-secondary text-sm mb-2">{description}</p>
              <p className="text-text-tertiary text-xs font-mono">{formats}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
