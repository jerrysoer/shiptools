"use client";

import { useState, useCallback } from "react";
import { Download, Subtitles, Loader2, Check } from "lucide-react";
import type { TranscriptionResult } from "@/lib/ai/whisper";
import { generateSRT, generateVTT } from "@/lib/recording/meeting-export";

interface SubtitleGeneratorProps {
  transcription: TranscriptionResult;
  videoBlob?: Blob;
  className?: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SubtitleGenerator({
  transcription,
  videoBlob,
  className,
}: SubtitleGeneratorProps) {
  const [isBurningIn, setIsBurningIn] = useState(false);
  const [burnInProgress, setBurnInProgress] = useState(0);
  const [burnInComplete, setBurnInComplete] = useState(false);

  const handleDownloadSRT = useCallback(() => {
    const srt = generateSRT(transcription.segments);
    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, "subtitles.srt");
  }, [transcription]);

  const handleDownloadVTT = useCallback(() => {
    const vtt = generateVTT(transcription.segments);
    const blob = new Blob([vtt], { type: "text/vtt;charset=utf-8" });
    downloadBlob(blob, "subtitles.vtt");
  }, [transcription]);

  const handleBurnIn = useCallback(async () => {
    if (!videoBlob) return;

    setIsBurningIn(true);
    setBurnInProgress(0);
    setBurnInComplete(false);

    try {
      const { getFFmpeg } = await import("@/lib/ffmpeg");
      const { fetchFile } = await import("@ffmpeg/util");

      setBurnInProgress(10);
      const ffmpeg = await getFFmpeg();

      setBurnInProgress(20);

      // Write input video
      await ffmpeg.writeFile("input.webm", await fetchFile(videoBlob));

      // Write SRT file
      const srt = generateSRT(transcription.segments);
      const encoder = new TextEncoder();
      await ffmpeg.writeFile("subtitles.srt", encoder.encode(srt));

      setBurnInProgress(40);

      // Burn subtitles into video
      ffmpeg.on(
        "progress",
        ({ progress }: { progress: number }) => {
          setBurnInProgress(40 + Math.round(progress * 50));
        },
      );

      await ffmpeg.exec([
        "-i",
        "input.webm",
        "-vf",
        "subtitles=subtitles.srt:force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2'",
        "-c:a",
        "copy",
        "output.mp4",
      ]);

      setBurnInProgress(95);

      const data = await ffmpeg.readFile("output.mp4");
      const outputBlob = new Blob([data], { type: "video/mp4" });
      downloadBlob(outputBlob, "video-with-subtitles.mp4");

      // Cleanup
      await ffmpeg.deleteFile("input.webm");
      await ffmpeg.deleteFile("subtitles.srt");
      await ffmpeg.deleteFile("output.mp4");

      setBurnInProgress(100);
      setBurnInComplete(true);
    } catch (err) {
      console.error("Subtitle burn-in failed:", err);
    } finally {
      setIsBurningIn(false);
    }
  }, [videoBlob, transcription]);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Transcript segments */}
      <div className="bg-bg-surface border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Subtitles className="w-4 h-4 text-accent" />
          <h3 className="font-heading font-semibold text-sm">
            Transcript ({transcription.segments.length} segments)
          </h3>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {transcription.segments.map((segment, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-2 hover:bg-bg-elevated/50 transition-colors"
            >
              <span className="text-[11px] font-mono text-text-tertiary whitespace-nowrap mt-0.5 tabular-nums">
                {formatTimestamp(segment.start)}
              </span>
              <p className="text-sm text-text-primary leading-relaxed">
                {segment.text}
              </p>
            </div>
          ))}
          {transcription.segments.length === 0 && (
            <div className="px-4 py-6 text-center text-text-tertiary text-sm">
              No segments found in transcription.
            </div>
          )}
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownloadSRT}
          className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border hover:border-border-hover text-text-primary text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download SRT
        </button>
        <button
          type="button"
          onClick={handleDownloadVTT}
          className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border hover:border-border-hover text-text-primary text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Download VTT
        </button>
        {videoBlob && (
          <button
            type="button"
            onClick={handleBurnIn}
            disabled={isBurningIn}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBurningIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Burning in subtitles... {burnInProgress}%
              </>
            ) : burnInComplete ? (
              <>
                <Check className="w-4 h-4" />
                Subtitles burned in
              </>
            ) : (
              <>
                <Subtitles className="w-4 h-4" />
                Burn-in subtitles (MP4)
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress bar during burn-in */}
      {isBurningIn && (
        <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-300"
            style={{ width: `${burnInProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
