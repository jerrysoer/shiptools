"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor,
  Circle,
  Square,
  Download,
  Loader2,
  Settings,
  RotateCcw,
  AlertTriangle,
  Image,
} from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
import { captureScreen, stopAllTracks } from "@/lib/recording/capture";
import { isRecordingSupported } from "@/lib/recording/browser-support";
import DurationDisplay from "./DurationDisplay";

const FPS_OPTIONS = [5, 10, 15, 20] as const;

const RESOLUTION_OPTIONS = [
  { label: "Full", value: "full" },
  { label: "720p", value: "1280:720" },
  { label: "480p", value: "854:480" },
] as const;

const DURATION_LIMITS = [5, 10, 15, 30] as const;

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GifRecorder() {
  // ---- Settings state ----
  const [fps, setFps] = useState<(typeof FPS_OPTIONS)[number]>(10);
  const [resolution, setResolution] = useState<string>("full");
  const [durationLimit, setDurationLimit] =
    useState<(typeof DURATION_LIMITS)[number]>(10);
  const [showSettings, setShowSettings] = useState(false);

  // ---- Recording + conversion state ----
  const [isConverting, setIsConverting] = useState(false);
  const [convProgress, setConvProgress] = useState(0);
  const [convProgressText, setConvProgressText] = useState("");
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifSize, setGifSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // ---- Refs ----
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Recorder hook ----
  const {
    state,
    duration,
    result,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useRecorder();

  // ---- Support check ----
  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      if (streamRef.current) stopAllTracks(streamRef.current);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);

  // Stable ref for handleStop to avoid stale closures in timers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStopRef = useRef<(() => void) | null>(null);

  // ---- Auto-stop when duration limit reached ----
  useEffect(() => {
    if (state === "recording") {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = setTimeout(
        () => {
          handleStopRef.current?.();
        },
        durationLimit * 1000,
      );
    }

    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    };
  }, [state, durationLimit]);

  // ---- Convert on result ----
  useEffect(() => {
    if (!result) return;
    convertToGif(result.blob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // ---- Start handler ----
  const handleStart = useCallback(async () => {
    setError(null);
    setGifBlob(null);
    setGifUrl(null);

    try {
      const stream = await captureScreen({ audio: false, video: true });
      streamRef.current = stream;

      // Show live preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Detect if the user stopped sharing
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopRef.current?.();
        };
      }

      await startRecording(stream, { type: "video" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start screen capture";
      setError(message);
    }
  }, [startRecording]);

  // ---- Stop handler ----
  const handleStop = useCallback(async () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    await stopRecording();

    if (streamRef.current) {
      stopAllTracks(streamRef.current);
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopRecording]);

  // Keep ref in sync with latest handleStop
  handleStopRef.current = handleStop;

  // ---- Convert WebM to GIF via ffmpeg ----
  const convertToGif = useCallback(
    async (webmBlob: Blob) => {
      setIsConverting(true);
      setConvProgress(0);
      setConvProgressText("Loading conversion engine...");

      try {
        const { getFFmpeg } = await import("@/lib/ffmpeg");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ffmpeg = (await getFFmpeg((p) => setConvProgress(p))) as any;

        setConvProgress(30);
        setConvProgressText("Writing video data...");

        const { fetchFile } = await import("@ffmpeg/util");
        const inputData = await fetchFile(webmBlob);
        await ffmpeg.writeFile("input.webm", inputData);

        setConvProgress(40);
        setConvProgressText("Generating color palette...");

        // Build scale filter
        const scaleFilter =
          resolution === "full"
            ? ""
            : `,scale=${resolution}:flags=lanczos`;

        // Step 1: Generate palette
        await ffmpeg.exec([
          "-i",
          "input.webm",
          "-vf",
          `fps=${fps}${scaleFilter},palettegen=stats_mode=diff`,
          "-y",
          "palette.png",
        ]);

        setConvProgress(60);
        setConvProgressText("Creating GIF...");

        // Step 2: Apply palette to create GIF
        await ffmpeg.exec([
          "-i",
          "input.webm",
          "-i",
          "palette.png",
          "-lavfi",
          `fps=${fps}${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
          "-y",
          "output.gif",
        ]);

        setConvProgress(85);
        setConvProgressText("Reading output...");

        const data = await ffmpeg.readFile("output.gif");

        // Cleanup
        try {
          await ffmpeg.deleteFile("input.webm");
          await ffmpeg.deleteFile("palette.png");
          await ffmpeg.deleteFile("output.gif");
        } catch {
          // Non-fatal
        }

        const blob = new Blob([data], { type: "image/gif" });
        const url = URL.createObjectURL(blob);

        setGifBlob(blob);
        setGifUrl(url);
        setGifSize(blob.size);
        setConvProgress(100);
        setConvProgressText("Done");
      } catch (err) {
        console.error("GIF conversion failed:", err);
        setError(
          `Conversion failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setIsConverting(false);
      }
    },
    [fps, resolution],
  );

  // ---- Download handler ----
  const handleDownload = useCallback(() => {
    if (!gifBlob) return;
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-");
    downloadBlob(gifBlob, `screen-${timestamp}.gif`);
  }, [gifBlob]);

  // ---- Reset handler ----
  const handleReset = useCallback(() => {
    if (streamRef.current) {
      stopAllTracks(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setGifBlob(null);
    setGifUrl(null);
    setGifSize(0);
    setError(null);
    setIsConverting(false);
    setConvProgress(0);
    setConvProgressText("");
    resetRecorder();
  }, [gifUrl, resetRecorder]);

  const isIdle = state === "idle";
  const isRecording = state === "recording";
  const isStopped = state === "stopped";

  // ---- Unsupported browser ----
  if (!supported) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-md bg-bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 mb-4">
            <AlertTriangle className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">
            Browser Not Supported
          </h2>
          <p className="text-text-secondary text-sm">
            Screen recording requires a modern browser with MediaRecorder and
            getDisplayMedia support. Please use Chrome, Edge, or Firefox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-primary">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 mb-4">
            <Image className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-heading font-bold text-3xl mb-2">
            GIF Recorder
          </h1>
          <p className="text-text-secondary">
            Record your screen as a high-quality animated GIF.
          </p>
        </div>

        {/* Settings Panel */}
        {isIdle && !gifBlob && !isConverting && (
          <div className="mb-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer mb-3"
            >
              <Settings className="w-4 h-4" />
              Settings
              <ChevronIcon open={showSettings} />
            </button>

            {showSettings && (
              <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-5">
                {/* FPS */}
                <div>
                  <label className="block text-xs font-medium text-text-tertiary mb-2">
                    Frame Rate (FPS)
                  </label>
                  <div className="flex gap-2">
                    {FPS_OPTIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFps(f)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                          fps === f
                            ? "bg-accent/10 text-accent"
                            : "bg-bg-elevated text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    Higher FPS = smoother but larger file.
                  </p>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-xs font-medium text-text-tertiary mb-2">
                    Resolution
                  </label>
                  <div className="flex gap-2">
                    {RESOLUTION_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setResolution(r.value)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                          resolution === r.value
                            ? "bg-accent/10 text-accent"
                            : "bg-bg-elevated text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Limit */}
                <div>
                  <label className="block text-xs font-medium text-text-tertiary mb-2">
                    Max Duration (seconds)
                  </label>
                  <div className="flex gap-2">
                    {DURATION_LIMITS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDurationLimit(d)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                          durationLimit === d
                            ? "bg-accent/10 text-accent"
                            : "bg-bg-elevated text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    Recording auto-stops at this duration.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Preview */}
        {isRecording && (
          <div className="mb-6 bg-bg-surface border border-border rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full aspect-video bg-black object-contain"
            />
            <div className="flex items-center justify-between p-3">
              <DurationDisplay duration={duration} />
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-text-secondary">
                  Recording ({durationLimit}s max)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recording Controls */}
        {!gifBlob && !isConverting && (
          <div className="flex items-center justify-center gap-4 mb-6">
            {isIdle && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 py-3 px-8 bg-accent text-accent-fg font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                Record Screen
              </button>
            )}

            {isRecording && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 py-3 px-8 bg-accent text-accent-fg font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Recording
              </button>
            )}
          </div>
        )}

        {/* Conversion Progress */}
        {isConverting && (
          <div className="mb-6 bg-bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Converting to GIF...
                </p>
                <p className="text-xs text-text-tertiary">
                  {convProgressText}
                </p>
              </div>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-300 rounded-full"
                style={{ width: `${convProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* GIF Preview + Download */}
        {gifBlob && gifUrl && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold text-lg">
                  GIF Ready
                </h2>
                <p className="text-sm text-text-secondary">
                  {formatBytes(gifSize)}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 py-2 px-4 bg-bg-surface border border-border text-text-secondary text-sm rounded-xl hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Recording
              </button>
            </div>

            {/* Preview */}
            <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gifUrl}
                alt="Recorded GIF preview"
                className="w-full"
              />
            </div>

            {/* Download */}
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 py-3 px-8 bg-accent text-accent-fg font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download GIF ({formatBytes(gifSize)})
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Chevron icon sub-component ----
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  );
}
