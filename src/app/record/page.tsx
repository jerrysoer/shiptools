import { Metadata } from "next";
import Link from "next/link";
import {
  Mic,
  MonitorSpeaker,
  Monitor,
  Camera,
  ImageIcon,
  Users,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Record & Capture — ShipLocal",
  description:
    "Voice memos, screen recordings, meeting notes, and document scanning. All processed locally.",
};

const TOOLS = [
  {
    href: "/record/voice",
    icon: Mic,
    title: "Voice Memo",
    description:
      "Record audio from your microphone with bookmarks and trimming.",
    tag: "Audio",
  },
  {
    href: "/record/audio",
    icon: MonitorSpeaker,
    title: "Audio Recorder",
    description:
      "Capture system audio, microphone, or both. Trim and export as MP3/WAV/OGG.",
    tag: "Audio",
  },
  {
    href: "/record/screen",
    icon: Monitor,
    title: "Screen Recorder",
    description:
      "Record your screen with optional webcam overlay and audio. Export as WebM or MP4.",
    tag: "Video",
  },
  {
    href: "/record/gif",
    icon: ImageIcon,
    title: "GIF Recorder",
    description: "Capture your screen as a high-quality animated GIF.",
    tag: "Video",
  },
  {
    href: "/scan",
    icon: Camera,
    title: "Document Scanner",
    description:
      "Scan documents with your camera. Edge detection, perspective correction, OCR.",
    tag: "Capture",
  },
  {
    href: "/record/meeting",
    icon: Users,
    title: "Meeting Recorder",
    description:
      "Record, transcribe, and summarize meetings. Export as ZIP bundle.",
    tag: "AI",
  },
] as const;

const TAG_COLORS: Record<string, string> = {
  Audio: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Video: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Capture: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  AI: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function RecordPage() {
  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="font-heading font-bold text-3xl mb-3">
          Record and capture without uploading
        </h1>
        <p className="text-text-secondary mb-4">
          Voice memos, screen recordings, and document scans processed entirely
          in your browser. Nothing leaves your device.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-grade-a/10 border border-grade-a/20 text-grade-a text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          All recording stays on your device
        </div>
      </div>

      <div className="grid gap-4">
        {TOOLS.map(({ href, icon: Icon, title, description, tag }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 bg-bg-surface border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
          >
            <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
              <Icon className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-heading font-semibold text-lg">
                  {title}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TAG_COLORS[tag] ?? ""}`}
                >
                  {tag}
                </span>
              </div>
              <p className="text-text-secondary text-sm">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
