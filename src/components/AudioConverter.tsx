"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, Trash2, Loader2, CircleCheck, DownloadCloud } from "lucide-react";
import DropZone from "./DropZone";
import PrivacyBadge from "./PrivacyBadge";
import { useConverter } from "@/hooks/useConverter";
import { MAX_AUDIO_SIZE } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { getFFmpeg, isFFmpegLoaded } from "@/lib/ffmpeg";
import type { AudioFormat, ConversionOptions } from "@/lib/types";

const OUTPUT_FORMATS: AudioFormat[] = ["mp3", "wav", "ogg", "aac", "flac"];
const ACCEPT = ".mp3,.wav,.ogg,.aac,.flac,.m4a,.wma,audio/*";

async function convertAudio(
  file: File,
  outputFormat: string,
  options?: ConversionOptions,
  onProgress?: (p: number) => void
): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpeg = (await getFFmpeg(onProgress)) as any;

  const inputName = `input.${file.name.split(".").pop()}`;
  const outputName = `output.${outputFormat}`;

  onProgress?.(40);

  const { fetchFile } = await import("@ffmpeg/util");
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.(50);

  const args = ["-i", inputName];

  if (options?.bitrate && ["mp3", "ogg", "aac"].includes(outputFormat)) {
    args.push("-b:a", `${options.bitrate}k`);
  }

  if (options?.trimStart !== undefined) {
    args.push("-ss", String(options.trimStart));
  }
  if (options?.trimEnd !== undefined) {
    args.push("-to", String(options.trimEnd));
  }

  const codecMap: Record<string, string[]> = {
    mp3: ["-codec:a", "libmp3lame"],
    ogg: ["-codec:a", "libvorbis"],
    aac: ["-codec:a", "aac"],
    flac: ["-codec:a", "flac"],
    wav: [],
  };

  if (codecMap[outputFormat]) {
    args.push(...codecMap[outputFormat]);
  }

  args.push("-y", outputName);

  onProgress?.(60);

  await ffmpeg.exec(args);

  onProgress?.(80);

  const data = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Cleanup errors are non-fatal
  }

  onProgress?.(90);

  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
  };

  return new Blob([data], { type: mimeMap[outputFormat] ?? "application/octet-stream" });
}

export default function AudioConverter() {
  useEffect(() => { trackEvent("tool_opened", { tool: "convert-audio" }); }, []);

  const [outputFormat, setOutputFormat] = useState<AudioFormat>("mp3");
  const [bitrate, setBitrate] = useState(192);
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);

  const {
    jobs, addFiles, processAll, downloadResult, removeJob, clearJobs,
    pendingCount, doneCount, processingCount, isBatchComplete, downloadAll,
  } = useConverter(async (file, format, options, onProgress) => {
    if (!isFFmpegLoaded()) setIsLoadingFFmpeg(true);
    try {
      return await convertAudio(file, format, options, onProgress);
    } finally {
      setIsLoadingFFmpeg(false);
    }
  });

  const handleFiles = useCallback(
    (files: File[]) => {
      addFiles(files, outputFormat, { bitrate });
    },
    [addFiles, outputFormat, bitrate]
  );

  const totalActive = pendingCount + processingCount + doneCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PrivacyBadge />
        {jobs.length > 0 && (
          <button onClick={clearJobs} className="text-text-tertiary hover:text-text-primary text-xs transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-text-secondary text-xs block mb-1">Output format</label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as AudioFormat)}
            className="bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-text-secondary text-xs block mb-1">Bitrate</label>
          <select
            value={bitrate}
            onChange={(e) => setBitrate(Number(e.target.value))}
            className="bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary"
          >
            <option value={128}>128 kbps</option>
            <option value={192}>192 kbps</option>
            <option value={256}>256 kbps</option>
            <option value={320}>320 kbps</option>
          </select>
        </div>
      </div>

      <DropZone
        accept={ACCEPT}
        maxSize={MAX_AUDIO_SIZE}
        onFiles={handleFiles}
        label="Drop audio files here or click to browse"
      />

      {isLoadingFFmpeg && (
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading audio engine (~32MB, one-time download)...
        </div>
      )}

      {/* Batch progress bar */}
      {processingCount > 0 && totalActive > 1 && (
        <div className="space-y-1.5 fade-in">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Converting {doneCount + 1} of {totalActive}...</span>
            <span>{Math.round(((doneCount) / totalActive) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(2, (doneCount / totalActive) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch completion banner */}
      {isBatchComplete && doneCount > 1 && (
        <div className="flex items-center justify-between bg-grade-a/10 border border-grade-a/25 px-4 py-3 fade-in">
          <div className="flex items-center gap-2">
            <CircleCheck className="w-4 h-4 text-grade-a done-check" />
            <span className="text-sm text-grade-a font-medium">
              All {doneCount} files converted
            </span>
          </div>
          <button
            onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-grade-a/15 hover:bg-grade-a/25 text-grade-a text-xs font-medium transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            Download All
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className={`flex items-center gap-3 px-4 py-3 ${
              job.status === "done"
                ? "bg-grade-a/5 border border-grade-a/25 border-l-2 border-l-grade-a"
                : job.status === "error"
                  ? "bg-grade-f/5 border border-grade-f/25 border-l-2 border-l-grade-f"
                  : "bg-bg-surface border border-border"
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{job.file.name}</p>
                <p className="text-xs text-text-tertiary">
                  {job.inputFormat.toUpperCase()} → {job.outputFormat.toUpperCase()}
                  {job.status === "processing" && ` · ${job.progress}%`}
                  {job.status === "done" && job.result && (
                    <span className="text-grade-a"> · Done · {(job.result.size / 1024).toFixed(0)} KB</span>
                  )}
                  {job.status === "error" && <span className="text-grade-f"> · {job.error}</span>}
                </p>
              </div>
              {job.status === "processing" && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
              {job.status === "done" && (
                <>
                  <CircleCheck className="w-4 h-4 text-grade-a shrink-0 done-check" />
                  <button onClick={() => downloadResult(job)} className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-grade-a">
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={() => removeJob(job.id)} className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-tertiary">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {pendingCount > 0 && (
            <button onClick={() => { trackEvent("tool_used", { tool: "convert-audio" }); processAll(); }} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-accent-fg text-sm font-medium transition-colors">
              Convert {pendingCount} file{pendingCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
