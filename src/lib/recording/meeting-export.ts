import type { TranscriptionResult } from "@/lib/ai/whisper";

export interface MeetingBundle {
  audio: Blob;
  audioFormat: string;
  transcript: TranscriptionResult;
  summary?: string;
  metadata: {
    date: string;
    duration: number;
    title?: string;
  };
}

/**
 * Package a meeting recording into a ZIP bundle containing:
 * - audio file
 * - plain text transcript
 * - SRT subtitle file
 * - summary markdown (if provided)
 * - metadata JSON
 */
export async function exportMeetingBundle(bundle: MeetingBundle): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Audio file
  zip.file(`audio.${bundle.audioFormat}`, bundle.audio);

  // Plain text transcript
  zip.file("transcript.txt", bundle.transcript.text);

  // SRT subtitle file
  zip.file("transcript.srt", generateSRT(bundle.transcript.segments));

  // Summary markdown (if available)
  if (bundle.summary) {
    zip.file("summary.md", bundle.summary);
  }

  // Metadata JSON
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        date: bundle.metadata.date,
        duration: bundle.metadata.duration,
        title: bundle.metadata.title ?? "Meeting Recording",
        segments: bundle.transcript.segments.length,
      },
      null,
      2,
    ),
  );

  return zip.generateAsync({ type: "blob" });
}

/**
 * Generate an SRT subtitle file from transcription segments.
 */
export function generateSRT(
  segments: Array<{ start: number; end: number; text: string }>,
): string {
  return segments
    .map((seg, i) => {
      return `${i + 1}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text}\n`;
    })
    .join("\n");
}

/**
 * Generate a WebVTT subtitle file from transcription segments.
 */
export function generateVTT(
  segments: Array<{ start: number; end: number; text: string }>,
): string {
  const lines = ["WEBVTT\n"];
  segments.forEach((seg) => {
    lines.push(`${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}`);
    lines.push(seg.text);
    lines.push("");
  });
  return lines.join("\n");
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function formatVTTTime(seconds: number): string {
  return formatSRTTime(seconds).replace(",", ".");
}

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, "0");
}
