"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Download,
  Bookmark,
  RotateCcw,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { captureMicrophone, stopAllTracks } from "@/lib/recording/capture";
import { AudioMixer } from "@/lib/recording/mixer";
import { isRecordingSupported } from "@/lib/recording/browser-support";
import { getFFmpeg } from "@/lib/ffmpeg";
import RecordingControls from "./RecordingControls";
import WaveformVisualizer from "./WaveformVisualizer";
import LevelMeter from "./LevelMeter";
import DeviceSelector from "./DeviceSelector";
import DurationDisplay, { formatDuration } from "./DurationDisplay";
import BrowserSupportWarning from "./BrowserSupportWarning";

type ExportFormat = "webm" | "mp3" | "wav";

interface ExportState {
  active: boolean;
  format: ExportFormat;
  progress: number;
}

export default function VoiceMemo() {
  // ---- Recording core ----
  const {
    state,
    duration,
    bookmarks,
    result,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    addBookmark,
    reset: resetRecorder,
  } = useRecorder();

  // ---- Devices ----
  const {
    audioInputs,
    permissionState,
    selectedAudioInput,
    setSelectedAudioInput,
    refresh: refreshDevices,
  } = useMediaDevices();

  // ---- Audio processing ----
  const mixerRef = useRef<AudioMixer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // ---- Constraint toggles ----
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  // ---- Export ----
  const [exportState, setExportState] = useState<ExportState>({
    active: false,
    format: "webm",
    progress: 0,
  });

  // ---- Browser support ----
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  // ---- Audio element for playback ----
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Clean up blob URL on unmount or reset
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ---- Start handler ----
  const handleStart = useCallback(async () => {
    try {
      const stream = await captureMicrophone({
        deviceId: selectedAudioInput || undefined,
        noiseSuppression,
        echoCancellation,
      });

      streamRef.current = stream;

      // Set up mixer for analyser node
      const mixer = new AudioMixer();
      mixer.addStream(stream, { label: "Microphone" });
      mixerRef.current = mixer;
      setAnalyser(mixer.getAnalyserNode());

      // Record from mixer output for waveform consistency,
      // but use the raw stream for higher quality recording
      await startRecording(stream, { type: "audio" });
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [
    selectedAudioInput,
    noiseSuppression,
    echoCancellation,
    startRecording,
  ]);

  // ---- Stop handler ----
  const handleStop = useCallback(async () => {
    const res = await stopRecording();

    // Clean up stream and mixer
    if (streamRef.current) {
      stopAllTracks(streamRef.current);
      streamRef.current = null;
    }
    if (mixerRef.current) {
      mixerRef.current.dispose();
      mixerRef.current = null;
    }
    setAnalyser(null);

    // Create playback URL
    if (res) {
      const url = URL.createObjectURL(res.blob);
      setAudioUrl(url);
    }
  }, [stopRecording]);

  // ---- Reset handler ----
  const handleReset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setExportState({ active: false, format: "webm", progress: 0 });
    resetRecorder();
  }, [audioUrl, resetRecorder]);

  // ---- Bookmark jump ----
  const handleJumpToBookmark = useCallback(
    (timestamp: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = timestamp / 1000;
        audioRef.current.play().catch(() => {});
      }
    },
    [],
  );

  // ---- Export / Download ----
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!result) return;

      // WebM is the native format -- instant download
      if (format === "webm") {
        downloadBlob(result.blob, `voice-memo.webm`);
        return;
      }

      // MP3/WAV require ffmpeg transcoding
      setExportState({ active: true, format, progress: 0 });

      try {
        const ffmpeg = await getFFmpeg((p) => {
          setExportState((prev) => ({ ...prev, progress: p }));
        });

        setExportState((prev) => ({ ...prev, progress: 40 }));

        // Write input blob
        const inputData = new Uint8Array(await result.blob.arrayBuffer());
        await ffmpeg.writeFile("input.webm", inputData);

        setExportState((prev) => ({ ...prev, progress: 50 }));

        // Transcode
        if (format === "mp3") {
          await ffmpeg.exec([
            "-i",
            "input.webm",
            "-vn",
            "-acodec",
            "libmp3lame",
            "-ab",
            "192k",
            "output.mp3",
          ]);
        } else {
          await ffmpeg.exec([
            "-i",
            "input.webm",
            "-vn",
            "-acodec",
            "pcm_s16le",
            "output.wav",
          ]);
        }

        setExportState((prev) => ({ ...prev, progress: 90 }));

        const ext = format;
        const outputData = await ffmpeg.readFile(`output.${ext}`);
        const outputBlob = new Blob([outputData], {
          type: format === "mp3" ? "audio/mpeg" : "audio/wav",
        });

        downloadBlob(outputBlob, `voice-memo.${ext}`);

        // Clean up ffmpeg files
        await ffmpeg.deleteFile("input.webm").catch(() => {});
        await ffmpeg.deleteFile(`output.${ext}`).catch(() => {});

        setExportState({ active: false, format, progress: 100 });
      } catch (err) {
        console.error("Export failed:", err);
        setExportState({ active: false, format, progress: 0 });
      }
    },
    [result],
  );

  // ---- Render ----

  if (!supported) {
    return (
      <div>
        <h1 className="font-heading font-bold text-2xl mb-6">Voice Memo</h1>
        <BrowserSupportWarning
          feature="Audio Recording"
          description="This tool requires the MediaRecorder and getUserMedia APIs to capture audio from your microphone."
        />
      </div>
    );
  }

  const isIdle = state === "idle";
  const isStopped = state === "stopped";
  const isActive = state === "recording" || state === "paused";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl mb-2">Voice Memo</h1>
        <p className="text-text-secondary text-sm">
          Record audio from your microphone. Add bookmarks, then export as WebM,
          MP3, or WAV.
        </p>
      </div>

      {/* Privacy badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-grade-a/5 border border-grade-a/10 text-xs text-text-secondary mb-6">
        <ShieldCheck className="w-3.5 h-3.5 text-grade-a shrink-0" />
        Audio is recorded and processed locally. Nothing is uploaded.
      </div>

      {/* Device selector + constraint toggles (only when idle) */}
      {isIdle && (
        <div className="space-y-4 mb-8">
          <DeviceSelector
            type="audio"
            devices={audioInputs}
            selectedDeviceId={selectedAudioInput}
            onSelect={setSelectedAudioInput}
            onRefresh={refreshDevices}
          />

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={noiseSuppression}
                onChange={(e) => setNoiseSuppression(e.target.checked)}
                className="rounded border-border accent-accent"
              />
              Noise suppression
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={echoCancellation}
                onChange={(e) => setEchoCancellation(e.target.checked)}
                className="rounded border-border accent-accent"
              />
              Echo cancellation
            </label>
          </div>

          {permissionState === "denied" && (
            <p className="text-xs text-red-500">
              Microphone permission was denied. Please allow access in your
              browser settings and refresh.
            </p>
          )}
        </div>
      )}

      {/* Waveform (visible when active) */}
      {isActive && (
        <div className="mb-6 space-y-2">
          <WaveformVisualizer analyser={analyser} style="bars" height={100} />
          <LevelMeter analyser={analyser} height={6} />
        </div>
      )}

      {/* Recording controls */}
      {!isStopped && (
        <div className="flex justify-center mb-8">
          <RecordingControls
            state={state}
            duration={duration}
            onStart={handleStart}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={handleStop}
            onBookmark={isActive ? () => addBookmark() : undefined}
            bookmarks={bookmarks}
            disabled={permissionState === "denied" || audioInputs.length === 0}
          />
        </div>
      )}

      {/* Post-recording: Playback + Bookmarks + Export */}
      {isStopped && result && audioUrl && (
        <div className="space-y-6">
          {/* Playback */}
          <div className="bg-bg-surface border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-base">
                Recording
              </h2>
              <DurationDisplay duration={result.duration} />
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
            />
          </div>

          {/* Bookmarks */}
          {bookmarks.length > 0 && (
            <div className="bg-bg-surface border border-border p-6">
              <h2 className="font-heading font-semibold text-base mb-3">
                <Bookmark className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                Bookmarks ({bookmarks.length})
              </h2>
              <ul className="space-y-2">
                {bookmarks.map((bm, i) => (
                  <li key={bm.id}>
                    <button
                      type="button"
                      onClick={() => handleJumpToBookmark(bm.timestamp)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-bg-elevated transition-colors group"
                    >
                      <span className="text-xs font-mono text-accent tabular-nums">
                        {formatDuration(bm.timestamp)}
                      </span>
                      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                        {bm.label || `Bookmark ${i + 1}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Export options */}
          <div className="bg-bg-surface border border-border p-6">
            <h2 className="font-heading font-semibold text-base mb-4">
              Export
            </h2>

            {exportState.active ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-sm text-text-secondary">
                    Converting to {exportState.format.toUpperCase()}...
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${exportState.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <ExportButton
                  label="WebM"
                  sublabel="Instant"
                  onClick={() => handleExport("webm")}
                />
                <ExportButton
                  label="MP3"
                  sublabel="Via FFmpeg"
                  onClick={() => handleExport("mp3")}
                />
                <ExportButton
                  label="WAV"
                  sublabel="Via FFmpeg"
                  onClick={() => handleExport("wav")}
                />
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface border border-border hover:border-border-hover transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----

function ExportButton({
  label,
  sublabel,
  onClick,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated border border-border hover:border-border-hover text-text-primary transition-colors"
    >
      <Download className="w-4 h-4 text-text-tertiary" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-text-tertiary">({sublabel})</span>
    </button>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
