"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  Monitor,
  Layers,
  Circle,
  Pause,
  Square,
  Bookmark,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
import { useMediaDevices } from "@/hooks/useMediaDevices";
import { useWaveform } from "@/hooks/useWaveform";
import { captureMicrophone, captureSystemAudio, stopAllTracks } from "@/lib/recording/capture";
import { AudioMixer } from "@/lib/recording/mixer";
import { isRecordingSupported } from "@/lib/recording/browser-support";
import { drawLevelMeter } from "@/lib/recording/waveform";
import DurationDisplay from "./DurationDisplay";
import TrimUI from "./TrimUI";
import ExportPanel from "./ExportPanel";
import RecordingPipeline from "./RecordingPipeline";
import type { TrimRange, RecordingResult } from "@/lib/recording/types";

type SourceType = "microphone" | "system" | "both";

export default function AudioRecorder() {
  // ---- Source & device state ----
  const [sourceType, setSourceType] = useState<SourceType>("microphone");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // ---- Mixer state (for "both" mode) ----
  const mixerRef = useRef<AudioMixer | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxsRef = useRef<AudioContext[]>([]);
  const [micGain, setMicGain] = useState(1);
  const [sysGain, setSysGain] = useState(1);
  const micInputIdRef = useRef<string>("");
  const sysInputIdRef = useRef<string>("");

  // ---- Analyser for waveform & level meters ----
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [sysAnalyser, setSysAnalyser] = useState<AnalyserNode | null>(null);

  // ---- Post-recording state ----
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [trim, setTrim] = useState<TrimRange | undefined>(undefined);

  // ---- Hooks ----
  const {
    audioInputs,
    selectedAudioInput,
    setSelectedAudioInput,
    permissionState,
    refresh: refreshDevices,
  } = useMediaDevices();

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

  // ---- Canvas refs ----
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const micMeterRef = useRef<HTMLCanvasElement>(null);
  const sysMeterRef = useRef<HTMLCanvasElement>(null);

  // Live waveform
  useWaveform(analyser, waveformCanvasRef, {
    style: "mirrored",
    color: "var(--color-accent)",
  });

  // Level meter RAF loops for "both" mode
  useEffect(() => {
    if (!micAnalyser || !micMeterRef.current) return;
    const canvas = micMeterRef.current;
    let running = true;
    const draw = () => {
      if (!running) return;
      drawLevelMeter(micAnalyser, canvas, {
        color: "#22c55e",
        backgroundColor: "var(--color-bg-elevated)",
      });
      requestAnimationFrame(draw);
    };
    draw();
    return () => { running = false; };
  }, [micAnalyser]);

  useEffect(() => {
    if (!sysAnalyser || !sysMeterRef.current) return;
    const canvas = sysMeterRef.current;
    let running = true;
    const draw = () => {
      if (!running) return;
      drawLevelMeter(sysAnalyser, canvas, {
        color: "#3b82f6",
        backgroundColor: "var(--color-bg-elevated)",
      });
      requestAnimationFrame(draw);
    };
    draw();
    return () => { running = false; };
  }, [sysAnalyser]);

  // ---- Browser support check ----
  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  // ---- Gain changes propagation ----
  useEffect(() => {
    if (mixerRef.current && micInputIdRef.current) {
      mixerRef.current.setGain(micInputIdRef.current, micGain);
    }
  }, [micGain]);

  useEffect(() => {
    if (mixerRef.current && sysInputIdRef.current) {
      mixerRef.current.setGain(sysInputIdRef.current, sysGain);
    }
  }, [sysGain]);

  // ---- Cleanup streams on unmount ----
  useEffect(() => {
    return () => {
      streamsRef.current.forEach(stopAllTracks);
      mixerRef.current?.dispose();
    };
  }, []);

  // ---- Capture result when recorder stops ----
  useEffect(() => {
    if (result) {
      setRecording(result);
    }
  }, [result]);

  // ---- Start handler ----
  const handleStart = useCallback(async () => {
    setError(null);

    try {
      if (sourceType === "microphone") {
        const stream = await captureMicrophone({
          deviceId: selectedAudioInput || undefined,
        });
        streamsRef.current = [stream];

        // Create analyser for waveform
        const ctx = new AudioContext();
        audioCtxsRef.current.push(ctx);
        const source = ctx.createMediaStreamSource(stream);
        const node = ctx.createAnalyser();
        node.fftSize = 2048;
        source.connect(node);
        setAnalyser(node);

        await startRecording(stream, { type: "audio" });
      } else if (sourceType === "system") {
        const stream = await captureSystemAudio();
        streamsRef.current = [stream];

        const ctx = new AudioContext();
        audioCtxsRef.current.push(ctx);
        const source = ctx.createMediaStreamSource(stream);
        const node = ctx.createAnalyser();
        node.fftSize = 2048;
        source.connect(node);
        setAnalyser(node);

        await startRecording(stream, { type: "audio" });
      } else {
        // "both" mode — use AudioMixer
        const mixer = new AudioMixer();
        mixerRef.current = mixer;

        const sysStream = await captureSystemAudio();
        const micStream = await captureMicrophone({
          deviceId: selectedAudioInput || undefined,
        });
        streamsRef.current = [sysStream, micStream];

        sysInputIdRef.current = mixer.addStream(sysStream, {
          label: "System Audio",
          gain: sysGain,
        });
        micInputIdRef.current = mixer.addStream(micStream, {
          label: "Microphone",
          gain: micGain,
        });

        // Main analyser from mixer
        const mainAnalyser = mixer.getAnalyserNode();
        setAnalyser(mainAnalyser);

        // Per-source analysers for level meters
        const micCtx = new AudioContext();
        audioCtxsRef.current.push(micCtx);
        const micSource = micCtx.createMediaStreamSource(micStream);
        const micNode = micCtx.createAnalyser();
        micNode.fftSize = 2048;
        micSource.connect(micNode);
        setMicAnalyser(micNode);

        const sysCtx = new AudioContext();
        audioCtxsRef.current.push(sysCtx);
        const sysSource = sysCtx.createMediaStreamSource(sysStream);
        const sysNode = sysCtx.createAnalyser();
        sysNode.fftSize = 2048;
        sysSource.connect(sysNode);
        setSysAnalyser(sysNode);

        const mixedStream = mixer.getMixedStream();
        if (!mixedStream) {
          throw new Error("Failed to create mixed stream");
        }

        await startRecording(mixedStream, { type: "audio" });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
    }
  }, [sourceType, selectedAudioInput, startRecording, micGain, sysGain]);

  // ---- Stop handler ----
  const handleStop = useCallback(async () => {
    await stopRecording();
    streamsRef.current.forEach(stopAllTracks);
    streamsRef.current = [];
    mixerRef.current?.dispose();
    mixerRef.current = null;
    audioCtxsRef.current.forEach((c) => c.close());
    audioCtxsRef.current = [];
    setAnalyser(null);
    setMicAnalyser(null);
    setSysAnalyser(null);
  }, [stopRecording]);

  // ---- Reset handler ----
  const handleReset = useCallback(() => {
    streamsRef.current.forEach(stopAllTracks);
    streamsRef.current = [];
    mixerRef.current?.dispose();
    mixerRef.current = null;
    audioCtxsRef.current.forEach((c) => c.close());
    audioCtxsRef.current = [];
    setAnalyser(null);
    setMicAnalyser(null);
    setSysAnalyser(null);
    setRecording(null);
    setTrim(undefined);
    setError(null);
    resetRecorder();
  }, [resetRecorder]);

  const isIdle = state === "idle" || state === "stopped";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isStopped = state === "stopped" && recording !== null;

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
            Audio recording requires a modern browser with MediaRecorder support.
            Please use Chrome, Edge, or Firefox.
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
            <Mic className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-heading font-bold text-3xl mb-2">
            Audio Recorder
          </h1>
          <p className="text-text-secondary">
            Capture system audio, microphone, or both. Mix, trim, and export.
          </p>
        </div>

        {/* Source Selection Tabs */}
        {!isStopped && (
          <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-xl mb-6">
            {(
              [
                { key: "microphone", icon: Mic, label: "Microphone" },
                { key: "system", icon: Monitor, label: "Tab Audio" },
                { key: "both", icon: Layers, label: "Both" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => !isRecording && !isPaused && setSourceType(key)}
                disabled={isRecording || isPaused}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === key
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                } ${isRecording || isPaused ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Microphone Selector */}
        {!isStopped &&
          (sourceType === "microphone" || sourceType === "both") && (
            <div className="mb-6">
              <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                Microphone
              </label>
              {permissionState === "prompt" ? (
                <button
                  onClick={refreshDevices}
                  className="w-full py-2.5 px-4 bg-bg-surface border border-border rounded-xl text-sm text-text-secondary hover:border-border-hover transition-colors cursor-pointer"
                >
                  Grant microphone access to select device
                </button>
              ) : (
                <select
                  value={selectedAudioInput}
                  onChange={(e) => setSelectedAudioInput(e.target.value)}
                  disabled={isRecording || isPaused}
                  className="w-full py-2.5 px-4 bg-bg-surface border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer disabled:opacity-50"
                >
                  {audioInputs.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

        {/* Live Waveform */}
        {(isRecording || isPaused) && (
          <div className="mb-6 bg-bg-surface border border-border rounded-xl p-4">
            <canvas
              ref={waveformCanvasRef}
              width={600}
              height={120}
              className="w-full h-[120px] rounded-lg"
            />

            {/* Duration */}
            <div className="flex items-center justify-between mt-3">
              <DurationDisplay duration={duration} bookmarks={bookmarks} />
              {isPaused && (
                <span className="text-xs font-medium text-accent animate-pulse">
                  PAUSED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dual Level Meters (Both mode) */}
        {sourceType === "both" && (isRecording || isPaused) && (
          <div className="mb-6 space-y-4">
            {/* Mic meter + gain */}
            <div className="bg-bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-medium text-text-secondary">
                    Microphone
                  </span>
                </div>
                <span className="text-xs text-text-tertiary tabular-nums">
                  {Math.round(micGain * 100)}%
                </span>
              </div>
              <canvas
                ref={micMeterRef}
                width={500}
                height={12}
                className="w-full h-3 rounded-full mb-2"
              />
              <input
                type="range"
                min="0"
                max="200"
                value={micGain * 100}
                onChange={(e) => setMicGain(Number(e.target.value) / 100)}
                className="w-full h-1 accent-green-500"
              />
            </div>

            {/* System meter + gain */}
            <div className="bg-bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-text-secondary">
                    System Audio
                  </span>
                </div>
                <span className="text-xs text-text-tertiary tabular-nums">
                  {Math.round(sysGain * 100)}%
                </span>
              </div>
              <canvas
                ref={sysMeterRef}
                width={500}
                height={12}
                className="w-full h-3 rounded-full mb-2"
              />
              <input
                type="range"
                min="0"
                max="200"
                value={sysGain * 100}
                onChange={(e) => setSysGain(Number(e.target.value) / 100)}
                className="w-full h-1 accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* Recording Controls */}
        {!isStopped && (
          <div className="flex items-center justify-center gap-4 mb-6">
            {isIdle && state !== "stopped" && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 py-3 px-8 bg-accent text-accent-fg font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Circle className="w-4 h-4 fill-current" />
                Record
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 py-3 px-6 bg-bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 py-3 px-6 bg-accent text-accent-fg font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </button>
                <button
                  onClick={() => addBookmark()}
                  className="flex items-center gap-2 py-3 px-4 bg-bg-surface border border-border text-text-secondary rounded-xl hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
                  title="Add bookmark"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 py-3 px-6 bg-bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  <Circle className="w-4 h-4 fill-accent text-accent" />
                  Resume
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 py-3 px-6 bg-accent text-accent-fg font-semibold rounded-xl hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </button>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Post-Recording: Trim + Export + Pipeline */}
        {isStopped && recording && (
          <div className="space-y-6">
            {/* Reset / New Recording */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold text-lg">
                  Recording Complete
                </h2>
                <p className="text-sm text-text-secondary">
                  {(recording.duration / 1000).toFixed(1)}s recorded
                  {recording.bookmarks.length > 0 &&
                    ` with ${recording.bookmarks.length} bookmark${recording.bookmarks.length > 1 ? "s" : ""}`}
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

            {/* TrimUI */}
            <TrimUI
              audioBlob={recording.blob}
              bookmarks={recording.bookmarks}
              onTrimChange={setTrim}
            />

            {/* ExportPanel */}
            <ExportPanel
              audioBlob={recording.blob}
              trim={trim}
              duration={recording.duration}
            />

            {/* AI Pipeline */}
            <RecordingPipeline audioBlob={recording.blob} />
          </div>
        )}
      </div>
    </div>
  );
}
