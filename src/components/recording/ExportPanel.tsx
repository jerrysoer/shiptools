"use client";

import { useState, useCallback, useMemo } from "react";
import { Download, Loader2, FileAudio } from "lucide-react";
// ffmpeg loaded dynamically to avoid bundling when unused
import type { TrimRange } from "@/lib/recording/types";

interface ExportPanelProps {
  audioBlob: Blob;
  trim?: TrimRange;
  duration: number;
  className?: string;
}

type ExportFormat = "webm" | "mp3" | "wav" | "ogg";

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
}> = [
  { value: "webm", label: "WebM", description: "Native format — instant download" },
  { value: "mp3", label: "MP3", description: "Universal compatibility" },
  { value: "wav", label: "WAV", description: "Lossless quality" },
  { value: "ogg", label: "OGG", description: "Open format, good quality" },
];

const BITRATE_OPTIONS = [64, 96, 128, 192, 256, 320] as const;

function estimateFileSize(
  durationMs: number,
  format: ExportFormat,
  bitrate: number,
): string {
  const seconds = durationMs / 1000;

  let bitsPerSecond: number;
  switch (format) {
    case "wav":
      // 16-bit, 44.1kHz, mono
      bitsPerSecond = 44100 * 16 * 1;
      break;
    case "webm":
      bitsPerSecond = 128 * 1000; // roughly Opus default
      break;
    default:
      bitsPerSecond = bitrate * 1000;
  }

  const bytes = (bitsPerSecond * seconds) / 8;

  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportPanel({
  audioBlob,
  trim,
  duration,
  className,
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("webm");
  const [bitrate, setBitrate] = useState(128);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  // Determine effective duration after trim
  const effectiveDuration = useMemo(() => {
    if (!trim) return duration;
    return (trim.end - trim.start) * 1000;
  }, [trim, duration]);

  const estimatedSize = useMemo(
    () => estimateFileSize(effectiveDuration, format, bitrate),
    [effectiveDuration, format, bitrate],
  );

  // Check if trim changes the blob (non-zero start, or end before full duration)
  const needsTrim = useMemo(() => {
    if (!trim) return false;
    return trim.start > 0.05 || trim.end < duration / 1000 - 0.05;
  }, [trim, duration]);

  // Whether conversion requires ffmpeg
  const needsConversion = format !== "webm" || needsTrim;

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    setProgressText("Preparing...");

    try {
      if (!needsConversion) {
        // Instant WebM download — no ffmpeg needed
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        downloadBlob(audioBlob, `recording-${timestamp}.webm`);
        setIsExporting(false);
        return;
      }

      // Load ffmpeg
      setProgressText("Loading audio engine...");
      const { getFFmpeg } = await import("@/lib/ffmpeg");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ffmpeg = (await getFFmpeg((p) => setProgress(p * 0.3))) as any;
      setProgress(30);

      // Write input to ffmpeg FS
      setProgressText("Processing...");
      const { fetchFile } = await import("@ffmpeg/util");
      const inputData = await fetchFile(audioBlob);
      await ffmpeg.writeFile("input.webm", inputData);
      setProgress(40);

      // Build ffmpeg args
      const args: string[] = ["-i", "input.webm"];

      // Trim
      if (trim && needsTrim) {
        args.push("-ss", trim.start.toFixed(3));
        args.push("-to", trim.end.toFixed(3));
      }

      // Format-specific codec
      const codecMap: Record<string, string[]> = {
        mp3: ["-codec:a", "libmp3lame", "-b:a", `${bitrate}k`],
        ogg: ["-codec:a", "libvorbis", "-b:a", `${bitrate}k`],
        wav: [],
        webm: ["-codec:a", "libopus"],
      };

      if (codecMap[format]) {
        args.push(...codecMap[format]);
      }

      const outputName = `output.${format}`;
      args.push("-y", outputName);

      setProgress(50);
      setProgressText("Converting...");

      await ffmpeg.exec(args);

      setProgress(80);
      setProgressText("Finalizing...");

      const data = await ffmpeg.readFile(outputName);

      // Cleanup ffmpeg FS
      try {
        await ffmpeg.deleteFile("input.webm");
        await ffmpeg.deleteFile(outputName);
      } catch {
        // Non-fatal cleanup error
      }

      setProgress(90);

      // Build mime type
      const mimeMap: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        webm: "audio/webm",
      };

      const blob = new Blob([data], { type: mimeMap[format] ?? "audio/octet-stream" });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      downloadBlob(blob, `recording-${timestamp}.${format}`);

      setProgress(100);
      setProgressText("Done");
    } catch (err) {
      console.error("Export failed:", err);
      setProgressText(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
        setProgressText("");
      }, 1500);
    }
  }, [audioBlob, format, bitrate, trim, needsTrim, needsConversion]);

  return (
    <div className={`bg-bg-surface border border-border p-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-4">
        <FileAudio className="w-4 h-4 text-text-tertiary" />
        <h3 className="text-sm font-medium text-text-secondary">Export</h3>
      </div>

      {/* Format selector */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFormat(opt.value)}
            disabled={isExporting}
            className={`flex flex-col items-center py-3 px-2 border text-center transition-colors cursor-pointer ${
              format === opt.value
                ? "bg-accent/10 border-accent/30 text-accent"
                : "bg-bg-elevated border-border text-text-secondary hover:border-border-hover"
            } ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-sm font-semibold">{opt.label}</span>
            <span className="text-[10px] text-text-tertiary mt-0.5 leading-tight">
              {opt.description}
            </span>
          </button>
        ))}
      </div>

      {/* Bitrate slider — only for lossy formats */}
      {(format === "mp3" || format === "ogg") && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-tertiary">
              Bitrate
            </label>
            <span className="text-xs font-mono text-text-secondary tabular-nums">
              {bitrate} kbps
            </span>
          </div>
          <div className="flex gap-1.5">
            {BITRATE_OPTIONS.map((br) => (
              <button
                key={br}
                onClick={() => setBitrate(br)}
                disabled={isExporting}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  bitrate === br
                    ? "bg-accent/10 text-accent"
                    : "bg-bg-elevated text-text-tertiary hover:text-text-secondary"
                } ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {br}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size estimate + download */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          Estimated size: ~{estimatedSize}
        </span>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 py-2.5 px-5 bg-accent text-accent-fg font-semibold text-sm hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progressText || "Exporting..."}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download {format.toUpperCase()}
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {isExporting && progress > 0 && (
        <div className="mt-3 h-1 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
