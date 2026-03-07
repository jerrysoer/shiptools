import { Metadata } from "next";
import Link from "next/link";
import {
  MonitorSpeaker,
  Monitor,
  Users,
} from "lucide-react";
import EditorialRule from "@/components/EditorialRule";

export const metadata: Metadata = {
  title: "Record & Capture — ShipLocal",
  description:
    "Screen recordings, audio capture, and meeting notes. All processed locally.",
};

const TOOLS = [
  {
    href: "/record/audio",
    icon: MonitorSpeaker,
    title: "Audio Recorder",
    description: "Capture system audio, microphone, or both. Trim and export as MP3/WAV/OGG.",
    tag: "Audio",
  },
  {
    href: "/record/screen",
    icon: Monitor,
    title: "Screen Recorder",
    description: "Record your screen with optional webcam overlay and audio. Export as WebM, MP4, or GIF.",
    tag: "Video",
  },
  {
    href: "/record/meeting",
    icon: Users,
    title: "Meeting Recorder",
    description: "Record, transcribe, and summarize meetings. Export as ZIP bundle.",
    tag: "AI",
  },
] as const;

export default function RecordPage() {
  return (
    <div>
      {/* Header with editorial rule and department accent */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "var(--color-dept-record)" }} />
          <span className="font-mono text-xs tracking-widest uppercase text-text-tertiary">
            Department No. 02
          </span>
        </div>
        <EditorialRule className="mb-6" />
        <h1 className="font-heading font-bold text-4xl mb-3">
          Record & Capture
        </h1>
        <p className="text-text-secondary max-w-xl">
          Voice memos, screen recordings, and document scans processed entirely
          in your browser. Nothing leaves your device.
        </p>
      </div>

      <div className="space-y-1">
        {TOOLS.map(({ href, icon: Icon, title, description, tag }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 py-5 border-b border-border hover:bg-bg-surface transition-colors -mx-3 px-3"
            style={{ borderLeftWidth: "3px", borderLeftColor: "var(--color-dept-record)" }}
          >
            <Icon className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary transition-colors flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-heading font-semibold text-lg group-hover:text-accent transition-colors">
                  {title}
                </h2>
                <span className="font-mono text-[10px] tracking-wider uppercase text-text-tertiary">
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
