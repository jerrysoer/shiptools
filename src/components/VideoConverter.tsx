"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Download,
  Trash2,
  Loader2,
  CircleCheck,
  AlertTriangle,
} from "lucide-react";
import DropZone from "./DropZone";
import PrivacyBadge from "./PrivacyBadge";
import { useConverter } from "@/hooks/useConverter";
import { MAX_VIDEO_SIZE } from "@/lib/constants";
import { getFFmpeg, isFFmpegLoaded } from "@/lib/ffmpeg";
import type { VideoFormat, ConversionOptions } from "@/lib/types";

const OUTPUT_FORMATS: VideoFormat[] = ["mp4", "webm", "gif"];
const ACCEPT =
  ".mp4,.webm,.mov,.avi,.mkv,.gif,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,image/gif";

const RESOLUTION_PRESETS = [
  { label: "Original", value: "original" },
  { label: "1080p (1920x1080)", value: "1920x1080" },
  { label: "720p (1280x720)", value: "1280x720" },
  { label: "480p (854x480)", value: "854x480" },
  { label: "360p (640x360)", value: "640x360" },
] as const;

const DEFAULT_CRF = 28;
const CRF_MIN = 18;
const CRF_MAX = 40;

/**
 * Build ffmpeg command arguments for a given output format and options.
 */
function buildFFmpegArgs(
  inputName: string,
  outputName: string,
  outputFormat: string,
  options?: ConversionOptions
): string[] {
  const args: string[] = [];

  args.push("-i", inputName);

  // Trim: -ss after -i for output-level accurate seeking (input-level seek
  // is unreliable in ffmpeg.wasm's virtual filesystem). Use -to for absolute
  // end time — no duration math needed.
  if (options?.trimStart !== undefined) {
    args.push("-ss", String(options.trimStart));
  }
  if (options?.trimEnd !== undefined) {
    args.push("-to", String(options.trimEnd));
  }

  const crf = options?.videoCrf ?? DEFAULT_CRF;
  const resolution = options?.resolution;

  // Resolution filter — ensure even dimensions for H.264/VP9 compatibility
  const resolutionFilter =
    resolution && resolution !== "original"
      ? `scale=${resolution.replace("x", ":")}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`
      : null;

  switch (outputFormat) {
    case "mp4": {
      args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf));
      args.push("-threads", "0");
      args.push("-c:a", "aac");
      if (resolutionFilter) {
        args.push("-vf", resolutionFilter);
      }
      break;
    }
    case "webm": {
      args.push(
        "-c:v",
        "libvpx-vp9",
        "-crf",
        String(crf),
        "-b:v",
        "0",
        "-deadline",
        "realtime",
        "-c:a",
        "libvorbis"
      );
      if (resolutionFilter) {
        args.push("-vf", resolutionFilter);
      }
      break;
    }
    case "gif": {
      // For GIF, extract width from resolution or default to 640
      let gifWidth = 640;
      if (resolution && resolution !== "original") {
        gifWidth = parseInt(resolution.split("x")[0], 10);
      }
      args.push(
        "-vf",
        `fps=10,scale=${gifWidth}:-1:flags=lanczos`
      );
      break;
    }
  }

  args.push("-y", outputName);
  return args;
}

/**
 * Convert a video file using ffmpeg.wasm.
 */
async function convertVideo(
  file: File,
  outputFormat: string,
  options?: ConversionOptions,
  onProgress?: (p: number) => void
): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpeg = (await getFFmpeg(onProgress)) as any;

  const inputExt = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const inputName = `input.${inputExt}`;
  const outputName = `output.${outputFormat}`;

  onProgress?.(40);

  // Write input file to WASM filesystem
  const { fetchFile } = await import("@ffmpeg/util");
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.(50);

  // Build and execute ffmpeg command
  const args = buildFFmpegArgs(inputName, outputName, outputFormat, options);

  onProgress?.(60);

  await ffmpeg.exec(args);

  onProgress?.(80);

  // Read output file
  const data = await ffmpeg.readFile(outputName);

  // Clean up WASM filesystem
  try {
    await ffmpeg.deleteFile(inputName);
  } catch {
    // Ignore cleanup errors
  }
  try {
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Ignore cleanup errors
  }

  onProgress?.(90);

  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    gif: "image/gif",
  };

  return new Blob([data], {
    type: mimeMap[outputFormat] ?? "application/octet-stream",
  });
}

/**
 * Format seconds to MM:SS display.
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VideoConverter() {
  const [outputFormat, setOutputFormat] = useState<VideoFormat>("mp4");
  const [resolution, setResolution] = useState("original");
  const [crf, setCrf] = useState(DEFAULT_CRF);
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);
  const [noSharedArrayBuffer, setNoSharedArrayBuffer] = useState(false);

  // Detect SharedArrayBuffer support on mount
  useEffect(() => {
    if (typeof SharedArrayBuffer === "undefined") {
      setNoSharedArrayBuffer(true);
    }
  }, []);

  const {
    jobs,
    addFiles,
    processAll,
    downloadResult,
    removeJob,
    clearJobs,
    pendingCount,
    doneCount,
    processingCount,
    totalCount,
    isBatchComplete,
    downloadAll,
  } = useConverter(async (file, format, options, onProgress) => {
    if (!isFFmpegLoaded()) {
      setIsLoadingFFmpeg(true);
    }
    try {
      return await convertVideo(file, format, options, onProgress);
    } finally {
      setIsLoadingFFmpeg(false);
    }
  });

  const handleFiles = useCallback(
    (files: File[]) => {
      const options: ConversionOptions = {
        videoCrf: crf,
        resolution,
      };

      const startSec = parseFloat(trimStart);
      const endSec = parseFloat(trimEnd);

      if (!isNaN(startSec) && startSec >= 0) {
        options.trimStart = startSec;
      }
      if (!isNaN(endSec) && endSec > 0 && (!options.trimStart || endSec > options.trimStart)) {
        options.trimEnd = endSec;
      }

      addFiles(files, outputFormat, options);
    },
    [addFiles, outputFormat, crf, resolution, trimStart, trimEnd]
  );

  // Batch progress calculation
  const batchProcessedCount = doneCount + jobs.filter((j) => j.status === "error").length;
  const batchProgressPct =
    totalCount > 0 ? Math.round((batchProcessedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PrivacyBadge />
        {jobs.length > 0 && (
          <button
            onClick={clearJobs}
            className="text-text-tertiary hover:text-text-primary text-xs transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Mobile / SharedArrayBuffer warning */}
      {noSharedArrayBuffer && (
        <div className="flex items-start gap-3 rounded-lg bg-grade-d/10 border border-grade-d/25 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-grade-d shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Limited browser support
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Video conversion may not work on some mobile browsers. For best
              results, use Chrome or Firefox on desktop.
            </p>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-text-secondary text-xs block mb-1">
            Output format
          </label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as VideoFormat)}
            className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-text-secondary text-xs block mb-1">
            Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            {RESOLUTION_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quality slider (hidden for GIF since it uses fixed fps/scale) */}
        {outputFormat !== "gif" && (
          <div>
            <label className="text-text-secondary text-xs block mb-1">
              Quality (CRF): {crf}{" "}
              <span className="text-text-tertiary">
                {crf <= 20 ? "High" : crf <= 28 ? "Medium" : "Low"}
              </span>
            </label>
            <input
              type="range"
              min={CRF_MIN}
              max={CRF_MAX}
              value={crf}
              onChange={(e) => setCrf(Number(e.target.value))}
              className="w-32"
            />
          </div>
        )}

        {/* Trim controls */}
        <div className="flex gap-2">
          <div>
            <label className="text-text-secondary text-xs block mb-1">
              Trim start (sec)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              placeholder="0"
              value={trimStart}
              onChange={(e) => setTrimStart(e.target.value)}
              className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary w-24"
            />
          </div>
          <div>
            <label className="text-text-secondary text-xs block mb-1">
              Trim end (sec)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              placeholder="End"
              value={trimEnd}
              onChange={(e) => setTrimEnd(e.target.value)}
              className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary w-24"
            />
          </div>
        </div>
      </div>

      <DropZone
        accept={ACCEPT}
        maxSize={MAX_VIDEO_SIZE}
        onFiles={handleFiles}
        label="Drop videos here or click to browse"
      />

      {/* FFmpeg loading indicator */}
      {isLoadingFFmpeg && (
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading video engine (~32MB, one-time download)...
        </div>
      )}

      {/* Batch progress bar */}
      {processingCount > 0 && totalCount > 1 && (
        <div className="space-y-1.5">
          <p className="text-sm text-text-secondary">
            Converting {batchProcessedCount + 1} of {totalCount}...
          </p>
          <div className="h-2 bg-bg-surface border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full progress-fill transition-[width] duration-300 ease-out"
              style={{ width: `${batchProgressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch completion banner */}
      {isBatchComplete && doneCount > 1 && (
        <div className="fade-in flex items-center justify-between rounded-lg bg-grade-a/10 border border-grade-a/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <CircleCheck className="w-5 h-5 text-grade-a" />
            <p className="text-sm font-medium text-text-primary">
              All {doneCount} files converted
            </p>
          </div>
          <button
            onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-grade-a/15 hover:bg-grade-a/25 text-grade-a rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download All
          </button>
        </div>
      )}

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                job.status === "done"
                  ? "bg-grade-a/5 border border-grade-a/25 border-l-2 border-l-grade-a"
                  : job.status === "error"
                    ? "bg-grade-f/5 border border-grade-f/25 border-l-2 border-l-grade-f"
                    : "bg-bg-surface border border-border"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">
                  {job.file.name}
                </p>
                <p className="text-xs text-text-tertiary">
                  {job.inputFormat.toUpperCase()} &rarr;{" "}
                  {job.outputFormat.toUpperCase()}
                  {job.options?.resolution &&
                    job.options.resolution !== "original" && (
                      <span> &middot; {job.options.resolution}</span>
                    )}
                  {job.options?.trimStart !== undefined && (
                    <span>
                      {" "}
                      &middot; {formatTime(job.options.trimStart)}
                      {job.options?.trimEnd !== undefined
                        ? `\u2013${formatTime(job.options.trimEnd)}`
                        : "+"}
                    </span>
                  )}
                  {job.status === "processing" && ` \u00B7 ${job.progress}%`}
                  {job.status === "done" && job.result && (
                    <span className="text-grade-a">
                      {" "}
                      &middot; Done &middot;{" "}
                      {job.result.size >= 1024 * 1024
                        ? `${(job.result.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(job.result.size / 1024).toFixed(0)} KB`}
                    </span>
                  )}
                  {job.status === "error" && (
                    <span className="text-grade-f">
                      {" "}
                      &middot; {job.error}
                    </span>
                  )}
                </p>
              </div>

              {job.status === "processing" && (
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
              )}
              {job.status === "done" && (
                <>
                  <CircleCheck className="done-check w-4 h-4 text-grade-a shrink-0" />
                  <button
                    onClick={() => downloadResult(job)}
                    className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-grade-a"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => removeJob(job.id)}
                className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-tertiary"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {pendingCount > 0 && (
            <button
              onClick={processAll}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Convert {pendingCount} file{pendingCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
