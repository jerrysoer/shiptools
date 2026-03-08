"use client";

// F2: Screen Recorder
// Uses DUAL MediaRecorder (NOT canvas compositing) so recording works in background tabs.
//
// Sources:
// - Source 1: getDisplayMedia({ video: true, audio: true }) -- screen + system audio
// - Source 2 (optional): getUserMedia({ video: true }) -- webcam
// - Source 3 (optional): getUserMedia({ audio: true }) -- microphone
//
// Audio mixing: AudioMixer combines system audio + mic
//
// Two StreamRecorder instances run in parallel:
// - screenRecorder for the display capture
// - webcamRecorder for the webcam feed (if enabled)
//
// After stop: offer two modes:
// 1. "Quick Export" -- WebM of screen only (instant)
// 2. "Composite" -- ffmpeg composites webcam into screen at chosen PiP position
//
// Export: WebM (native, instant) or MP4 (ffmpeg transcode)
//
// UI Layout:
// - Top: mode selection (Standard / Annotate)
// - Settings: webcam toggle, mic toggle, webcam position (4 corners), webcam size (S/M/L)
// - During recording: screen preview + floating webcam preview
// - Post-recording: video player + export options
// - AI pipeline buttons for transcribe -> subtitles -> summarize

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Square,
  Loader2,
  Download,
  Settings,
  Maximize2,
  Play,
  Pause,
  PenTool,
  X,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { StreamRecorder } from "@/lib/recording/recorder";
import { AudioMixer } from "@/lib/recording/mixer";
import {
  captureScreen,
  captureMicrophone,
  stopAllTracks,
} from "@/lib/recording/capture";
import RecordingControls from "./RecordingControls";
import WaveformVisualizer from "./WaveformVisualizer";
import WebcamPreview from "./WebcamPreview";
import PlaybackWebcamOverlay from "./PlaybackWebcamOverlay";
import BrowserSupportWarning from "./BrowserSupportWarning";
import DrawingOverlay from "./DrawingOverlay";
import SubtitleGenerator from "./SubtitleGenerator";
import type { RecordingState, RecordingResult } from "@/lib/recording/types";
import type { PipPosition, PipSize } from "./WebcamPreview";
import { detectCapabilities } from "@/lib/recording/browser-support";
import type { TranscriptionResult } from "@/lib/ai/whisper";
import ToolPageHeader from "../tools/ToolPageHeader";

type RecorderMode = "standard" | "annotate";

interface ExportFormat {
  id: "webm" | "mp4" | "gif";
  label: string;
  description: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { id: "webm", label: "WebM", description: "Instant (native format)" },
  { id: "mp4", label: "MP4", description: "Universal compatibility (slower)" },
  { id: "gif", label: "GIF", description: "Animated image (shorter clips)" },
];

const PIP_POSITIONS: Array<{ id: PipPosition; label: string }> = [
  { id: "top-left", label: "Top Left" },
  { id: "top-right", label: "Top Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-right", label: "Bottom Right" },
];

const PIP_SIZES: Array<{ id: PipSize; label: string }> = [
  { id: "small", label: "S" },
  { id: "medium", label: "M" },
  { id: "large", label: "L" },
];

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScreenRecorder() {
  // ---- Browser support ----
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const caps = detectCapabilities();
    setIsSupported(caps.getDisplayMedia && caps.mediaRecorder);
  }, []);

  // ---- Mode ----
  const [mode, setMode] = useState<RecorderMode>("standard");

  // ---- Settings ----
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [pipPosition, setPipPosition] = useState<PipPosition>("bottom-right");
  const [pipSize, setPipSize] = useState<PipSize>("medium");
  const [showSettings, setShowSettings] = useState(true);

  // ---- Recording state ----
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ---- Streams & recorders ----
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<StreamRecorder | null>(null);
  const webcamRecorderRef = useRef<StreamRecorder | null>(null);
  const mixerRef = useRef<AudioMixer | null>(null);

  // ---- Preview refs ----
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // ---- Result ----
  const [screenResult, setScreenResult] = useState<RecordingResult | null>(
    null,
  );
  const [webcamResult, setWebcamResult] = useState<RecordingResult | null>(
    null,
  );
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [webcamUrl, setWebcamUrl] = useState<string | null>(null);

  // ---- Playback refs ----
  const playbackScreenRef = useRef<HTMLVideoElement>(null);
  const playbackWebcamRef = useRef<HTMLVideoElement>(null);
  const playbackContainerRef = useRef<HTMLDivElement>(null);

  // ---- Export state ----
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<string>("");
  const [compositedBlob, setCompositedBlob] = useState<Blob | null>(null);

  // ---- Annotate ----
  const [annotateActive, setAnnotateActive] = useState(false);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 1280,
    height: 720,
  });

  // ---- AI pipeline ----
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(
    null,
  );
  const [transcribeProgress, setTranscribeProgress] = useState(0);

  // ---- Webcam stream (for preview) ----
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // ---- Start recording ----
  const startRecording = useCallback(async () => {
    setError(null);
    setState("requesting");

    try {
      // 1. Capture screen with audio
      const screenStream = await captureScreen({ audio: true, video: true });
      screenStreamRef.current = screenStream;

      // Set screen preview
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
      }

      // Track screen dimensions for annotation overlay
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setPreviewDimensions({
          width: settings.width ?? 1280,
          height: settings.height ?? 720,
        });
      }

      // 2. Setup audio mixer
      const mixer = new AudioMixer();
      mixerRef.current = mixer;

      // Add system audio if available
      const systemAudioTracks = screenStream.getAudioTracks();
      if (systemAudioTracks.length > 0) {
        const systemAudioStream = new MediaStream(systemAudioTracks);
        mixer.addStream(systemAudioStream, {
          label: "system",
          gain: 1,
        });
      }

      // 3. Microphone (optional)
      if (micEnabled) {
        try {
          const micStream = await captureMicrophone();
          micStreamRef.current = micStream;
          mixer.addStream(micStream, { label: "mic", gain: 1 });
        } catch {
          // Mic denied -- continue without it
          console.warn("Microphone access denied, continuing without mic");
        }
      }

      setAnalyser(mixer.getAnalyserNode());

      // 4. Webcam (optional)
      if (webcamEnabled) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 },
          });
          webcamStreamRef.current = webcamStream;
          setWebcamStream(webcamStream);

          // Start webcam recorder
          const webcamRec = new StreamRecorder();
          webcamRecorderRef.current = webcamRec;
          webcamRec.start(webcamStream, { type: "video" });
        } catch {
          console.warn("Webcam access denied, continuing without webcam");
          setWebcamEnabled(false);
        }
      }

      // 5. Combine screen video + mixed audio into one stream for recording
      const mixedAudioStream = mixer.getMixedStream();
      const combinedStream = new MediaStream();

      // Add video tracks from screen
      for (const track of screenStream.getVideoTracks()) {
        combinedStream.addTrack(track);
      }

      // Add mixed audio tracks
      if (mixedAudioStream) {
        for (const track of mixedAudioStream.getAudioTracks()) {
          combinedStream.addTrack(track);
        }
      }

      // 6. Start screen recorder
      const screenRec = new StreamRecorder();
      screenRecorderRef.current = screenRec;
      screenRec.onStateChange = setState;
      screenRec.onDurationChange = setDuration;
      screenRec.start(combinedStream, { type: "video" });

      // Handle screen share ending (user clicks browser "Stop sharing")
      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stopRecording();
      });
    } catch (err) {
      setState("idle");
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Screen sharing was cancelled or denied.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start screen recording.",
        );
      }
    }
  }, [micEnabled, webcamEnabled]);

  // ---- Stop recording ----
  const stopRecording = useCallback(async () => {
    const screenRec = screenRecorderRef.current;
    const webcamRec = webcamRecorderRef.current;

    setState("processing");

    // Stop both recorders in parallel
    const [screenRes, webcamRes] = await Promise.all([
      screenRec?.stop().catch(() => null),
      webcamRec?.stop().catch(() => null),
    ]);

    if (screenRes) {
      setScreenResult(screenRes);
      const url = URL.createObjectURL(screenRes.blob);
      setRecordingUrl(url);
    }

    if (webcamRes) {
      setWebcamResult(webcamRes);
      setWebcamUrl(URL.createObjectURL(webcamRes.blob));
    }

    // Stop all streams
    if (screenStreamRef.current) {
      stopAllTracks(screenStreamRef.current);
      screenStreamRef.current = null;
    }
    if (webcamStreamRef.current) {
      stopAllTracks(webcamStreamRef.current);
      webcamStreamRef.current = null;
    }
    if (micStreamRef.current) {
      stopAllTracks(micStreamRef.current);
      micStreamRef.current = null;
    }
    setWebcamStream(null);

    // Dispose mixer
    mixerRef.current?.dispose();
    mixerRef.current = null;
    setAnalyser(null);

    setState("stopped");
  }, []);

  // ---- Pause / Resume ----
  const pauseRecording = useCallback(() => {
    screenRecorderRef.current?.pause();
    webcamRecorderRef.current?.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    screenRecorderRef.current?.resume();
    webcamRecorderRef.current?.resume();
  }, []);

  // ---- Export ----
  const handleExport = useCallback(
    async (format: "webm" | "mp4" | "gif") => {
      if (!screenResult) return;

      setIsExporting(true);
      setExportProgress(0);
      setExportPhase("");

      try {
        // Composite webcam overlay if webcam was recorded
        let sourceBlob = screenResult.blob;
        if (webcamResult) {
          if (compositedBlob) {
            // Use cached composite from a previous export
            sourceBlob = compositedBlob;
          } else {
            setExportPhase("Compositing webcam...");
            const { compositeWebcam } = await import(
              "@/lib/recording/composite"
            );
            const composited = await compositeWebcam(
              screenResult.blob,
              webcamResult.blob,
              {
                screenWidth: previewDimensions.width,
                screenHeight: previewDimensions.height,
                position: pipPosition,
                size: pipSize,
                onProgress: (pct) => setExportProgress(Math.round(pct * 0.4)),
              },
            );
            setCompositedBlob(composited);
            sourceBlob = composited;
          }
        }

        setExportProgress(webcamResult ? 40 : 0);
        setExportPhase("");

        // Progress scaling: if compositing took 0–40%, format export uses 40–100%
        const progressBase = webcamResult ? 40 : 0;
        const progressRange = 100 - progressBase;

        if (format === "webm") {
          downloadBlob(sourceBlob, "screen-recording.webm");
          setExportProgress(100);
          return;
        }

        if (format === "gif") {
          setExportPhase("Creating GIF...");

          const { getFFmpeg } = await import("@/lib/ffmpeg");
          const { fetchFile } = await import("@ffmpeg/util");

          setExportProgress(progressBase + Math.round(progressRange * 0.1));
          const ffmpeg = await getFFmpeg();
          setExportProgress(progressBase + Math.round(progressRange * 0.2));

          await ffmpeg.writeFile("input.webm", await fetchFile(sourceBlob));
          setExportProgress(progressBase + Math.round(progressRange * 0.3));

          // Step 1: Generate palette
          await ffmpeg.exec([
            "-i", "input.webm",
            "-vf", "fps=10,palettegen=stats_mode=diff",
            "-y", "palette.png",
          ]);
          setExportProgress(progressBase + Math.round(progressRange * 0.5));

          // Step 2: Apply palette to create GIF
          await ffmpeg.exec([
            "-i", "input.webm",
            "-i", "palette.png",
            "-lavfi", "fps=10[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
            "-y", "output.gif",
          ]);
          setExportProgress(progressBase + Math.round(progressRange * 0.85));

          const data = await ffmpeg.readFile("output.gif");
          const blob = new Blob([data], { type: "image/gif" });
          downloadBlob(blob, "screen-recording.gif");

          try {
            await ffmpeg.deleteFile("input.webm");
            await ffmpeg.deleteFile("palette.png");
            await ffmpeg.deleteFile("output.gif");
          } catch {
            // Non-fatal
          }

          setExportProgress(100);
          return;
        }

        // MP4 export via ffmpeg
        setExportPhase("Converting to MP4...");

        const { getFFmpeg } = await import("@/lib/ffmpeg");
        const { fetchFile } = await import("@ffmpeg/util");

        setExportProgress(progressBase + Math.round(progressRange * 0.1));
        const ffmpeg = await getFFmpeg();
        setExportProgress(progressBase + Math.round(progressRange * 0.2));

        await ffmpeg.writeFile("input.webm", await fetchFile(sourceBlob));
        setExportProgress(progressBase + Math.round(progressRange * 0.3));

        ffmpeg.on(
          "progress",
          ({ progress }: { progress: number }) => {
            setExportProgress(
              progressBase + Math.round(progressRange * (0.3 + progress * 0.6)),
            );
          },
        );

        await ffmpeg.exec([
          "-i", "input.webm",
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
          "output.mp4",
        ]);

        setExportProgress(progressBase + Math.round(progressRange * 0.95));

        const data = await ffmpeg.readFile("output.mp4");
        const blob = new Blob([data], { type: "video/mp4" });
        downloadBlob(blob, "screen-recording.mp4");

        await ffmpeg.deleteFile("input.webm");
        await ffmpeg.deleteFile("output.mp4");
        setExportProgress(100);
      } catch (err) {
        console.error(`${format.toUpperCase()} export failed:`, err);
        setError(`${format.toUpperCase()} export failed. Try downloading as WebM instead.`);
      } finally {
        setIsExporting(false);
        setExportPhase("");
      }
    },
    [screenResult, webcamResult, compositedBlob, pipPosition, pipSize, previewDimensions],
  );

  // ---- Transcription ----
  const handleTranscribe = useCallback(async () => {
    if (!screenResult) return;

    setIsTranscribing(true);
    setTranscribeProgress(0);

    try {
      const { loadWhisper, transcribe } = await import("@/lib/ai/whisper");

      setTranscribeProgress(5);
      await loadWhisper("Xenova/whisper-tiny", (p) => {
        setTranscribeProgress(Math.round(p.progress * 0.5));
      });

      setTranscribeProgress(50);
      const result = await transcribe(screenResult.blob, (p) => {
        setTranscribeProgress(50 + Math.round(p.progress * 0.5));
      });

      setTranscription(result);
    } catch (err) {
      console.error("Transcription failed:", err);
      setError("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  }, [screenResult]);

  // ---- Reset ----
  const reset = useCallback(() => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    if (webcamUrl) URL.revokeObjectURL(webcamUrl);
    setScreenResult(null);
    setWebcamResult(null);
    setCompositedBlob(null);
    setRecordingUrl(null);
    setWebcamUrl(null);
    setTranscription(null);
    setState("idle");
    setDuration(0);
    setError(null);
    setExportProgress(0);
    setExportPhase("");
    setTranscribeProgress(0);
  }, [recordingUrl, webcamUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) stopAllTracks(screenStreamRef.current);
      if (webcamStreamRef.current) stopAllTracks(webcamStreamRef.current);
      if (micStreamRef.current) stopAllTracks(micStreamRef.current);
      mixerRef.current?.dispose();
    };
  }, []);

  const isIdle = state === "idle";
  const isStopped = state === "stopped";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isActive = isRecording || isPaused;

  // Fix: Assign screen stream to video element after conditional render mounts it
  useEffect(() => {
    if (isActive && screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isActive]);

  // Fix: Sync webcam stream from ref to state when recording becomes active
  useEffect(() => {
    if (isActive && webcamStreamRef.current && !webcamStream) {
      setWebcamStream(webcamStreamRef.current);
    }
  }, [isActive, webcamStream]);

  // Invalidate composite cache when PiP position/size changes
  useEffect(() => {
    setCompositedBlob(null);
  }, [pipPosition, pipSize]);

  // Sync playback webcam video with screen video (play/pause/seek/rate)
  useEffect(() => {
    const screen = playbackScreenRef.current;
    const webcam = playbackWebcamRef.current;
    if (!screen || !webcam || !recordingUrl || !webcamUrl) return;

    const DRIFT_THRESHOLD = 0.15; // seconds

    const onPlay = () => {
      void webcam.play().catch(() => {});
    };
    const onPause = () => {
      webcam.pause();
    };
    const onSeeked = () => {
      webcam.currentTime = screen.currentTime;
    };
    const onRateChange = () => {
      webcam.playbackRate = screen.playbackRate;
    };
    const onTimeUpdate = () => {
      const drift = Math.abs(screen.currentTime - webcam.currentTime);
      if (drift > DRIFT_THRESHOLD) {
        webcam.currentTime = screen.currentTime;
      }
    };

    screen.addEventListener("play", onPlay);
    screen.addEventListener("pause", onPause);
    screen.addEventListener("seeked", onSeeked);
    screen.addEventListener("ratechange", onRateChange);
    screen.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      screen.removeEventListener("play", onPlay);
      screen.removeEventListener("pause", onPause);
      screen.removeEventListener("seeked", onSeeked);
      screen.removeEventListener("ratechange", onRateChange);
      screen.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [recordingUrl, webcamUrl]);

  if (!isSupported) {
    return (
      <div>
        <ToolPageHeader
          icon={Monitor}
          title="Screen Recorder"
          description="Record your screen with optional webcam overlay and audio."
        />
        <BrowserSupportWarning
          feature="Screen recording"
          description="Your browser does not support the getDisplayMedia API required for screen recording."
        />
      </div>
    );
  }

  return (
    <div>
      <ToolPageHeader
        icon={Monitor}
        title="Screen Recorder"
        description="Record your screen with optional webcam overlay and audio. Export as WebM or MP4."
      />

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Mode selector (pre-recording only) */}
      {isIdle && !isStopped && (
        <>
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("standard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "standard"
                  ? "bg-accent text-white"
                  : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <Monitor className="w-4 h-4" />
              Standard
            </button>
            <button
              type="button"
              onClick={() => setMode("annotate")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "annotate"
                  ? "bg-accent text-white"
                  : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <PenTool className="w-4 h-4" />
              Annotate
            </button>
          </div>

          {/* Settings panel */}
          <div className="bg-bg-surface border border-border rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-text-primary"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-text-tertiary" />
                Recording Settings
              </span>
              <span className="text-text-tertiary text-xs">
                {showSettings ? "Hide" : "Show"}
              </span>
            </button>

            {showSettings && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* Webcam toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {webcamEnabled ? (
                      <Camera className="w-4 h-4 text-accent" />
                    ) : (
                      <CameraOff className="w-4 h-4 text-text-tertiary" />
                    )}
                    <span className="text-sm text-text-primary">
                      Webcam overlay
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebcamEnabled(!webcamEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      webcamEnabled ? "bg-accent" : "bg-bg-elevated"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        webcamEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Webcam position (only if webcam enabled) */}
                {webcamEnabled && (
                  <div className="pl-6 space-y-3">
                    <div>
                      <p className="text-xs text-text-tertiary mb-2">
                        Position
                      </p>
                      <div className="flex gap-1.5">
                        {PIP_POSITIONS.map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPipPosition(id)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              pipPosition === id
                                ? "bg-accent text-white"
                                : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary mb-2">Size</p>
                      <div className="flex gap-1.5">
                        {PIP_SIZES.map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPipSize(id)}
                            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                              pipSize === id
                                ? "bg-accent text-white"
                                : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Microphone toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {micEnabled ? (
                      <Mic className="w-4 h-4 text-accent" />
                    ) : (
                      <MicOff className="w-4 h-4 text-text-tertiary" />
                    )}
                    <span className="text-sm text-text-primary">
                      Microphone audio
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      micEnabled ? "bg-accent" : "bg-bg-elevated"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        micEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recording controls */}
      {!isStopped && (
        <div className="mb-6">
          <RecordingControls
            state={state}
            duration={duration}
            onStart={startRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={stopRecording}
          />
        </div>
      )}

      {/* Live preview during recording */}
      {isActive && (
        <div className="mb-6 space-y-4">
          {/* Screen preview */}
          <div
            ref={previewContainerRef}
            className="relative bg-black rounded-xl overflow-hidden"
          >
            <video
              ref={screenVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video object-contain rounded-xl"
            />

            {/* Webcam PiP overlay */}
            {webcamEnabled && (
              <WebcamPreview
                stream={webcamStream}
                position={pipPosition}
                size={pipSize}
                shape="circle"
                onPositionChange={setPipPosition}
              />
            )}

            {/* Drawing overlay (annotate mode) */}
            {mode === "annotate" && (
              <DrawingOverlay
                width={previewDimensions.width}
                height={previewDimensions.height}
                active={annotateActive}
              />
            )}

            {/* Annotate toggle button */}
            {mode === "annotate" && (
              <button
                type="button"
                onClick={() => setAnnotateActive(!annotateActive)}
                className={`absolute bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors ${
                  annotateActive
                    ? "bg-accent text-white"
                    : "bg-bg-surface/90 text-text-primary hover:bg-bg-surface"
                }`}
              >
                <PenTool className="w-4 h-4" />
                {annotateActive ? "Drawing" : "Draw"}
              </button>
            )}
          </div>

          {/* Audio waveform */}
          {analyser && (
            <div className="bg-bg-surface border border-border rounded-xl p-3">
              <WaveformVisualizer
                analyser={analyser}
                style="wave"
                height={60}
              />
            </div>
          )}
        </div>
      )}

      {/* Post-recording: playback + export */}
      {isStopped && screenResult && (
        <div className="space-y-6">
          {/* Video player with webcam overlay */}
          {recordingUrl && (
            <div
              ref={playbackContainerRef}
              className="relative bg-bg-surface border border-border rounded-xl overflow-hidden group/playback"
            >
              <video
                ref={playbackScreenRef}
                src={recordingUrl}
                controls
                className="w-full"
              />

              {webcamUrl && (
                <PlaybackWebcamOverlay
                  webcamUrl={webcamUrl}
                  webcamRef={playbackWebcamRef}
                  position={pipPosition}
                  size={pipSize}
                  onPositionChange={(pos) => setPipPosition(pos)}
                />
              )}

              {/* Fullscreen button — includes webcam overlay (native fullscreen is screen-only) */}
              {webcamUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const container = playbackContainerRef.current;
                    if (!container) return;
                    if (document.fullscreenElement) {
                      void document.exitFullscreen();
                    } else {
                      void container.requestFullscreen();
                    }
                  }}
                  className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-black/50 text-white opacity-0 group-hover/playback:opacity-100 transition-opacity hover:bg-black/70"
                  title="Fullscreen with webcam overlay"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* PiP position/size controls */}
          {webcamUrl && (
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-tertiary mr-1">Position</span>
                {PIP_POSITIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPipPosition(id)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      pipPosition === id
                        ? "bg-accent text-white"
                        : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-tertiary mr-1">Size</span>
                {PIP_SIZES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPipSize(id)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                      pipSize === id
                        ? "bg-accent text-white"
                        : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recording info */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>
                Duration:{" "}
                {Math.round(screenResult.duration / 1000)}s
              </span>
              <span>
                Size:{" "}
                {(screenResult.blob.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New recording
            </button>
          </div>

          {/* Export buttons */}
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-accent" />
              Export
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {EXPORT_FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => handleExport(format.id)}
                  disabled={isExporting}
                  className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg border border-border hover:border-border-hover bg-bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {format.label}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {format.description}
                  </span>
                </button>
              ))}
            </div>

            {webcamResult && !isExporting && (
              <p className="mt-3 text-xs text-text-tertiary flex items-center gap-1.5">
                <Camera className="w-3 h-3" />
                Export will bake webcam overlay into the final file at its current position
              </p>
            )}

            {isExporting && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  <span className="text-xs text-text-secondary">
                    {exportPhase || "Exporting..."} {exportProgress}%
                  </span>
                </div>
                <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI pipeline */}
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              AI Tools
            </h3>

            {!transcription && (
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-lg bg-accent text-white font-medium text-sm transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transcribing... {transcribeProgress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Transcribe Recording
                  </>
                )}
              </button>
            )}

            {isTranscribing && (
              <div className="mt-2 w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${transcribeProgress}%` }}
                />
              </div>
            )}

            {transcription && (
              <SubtitleGenerator
                transcription={transcription}
                videoBlob={screenResult.blob}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
