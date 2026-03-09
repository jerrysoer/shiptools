"use client";

// F8: Meeting Recorder capstone -- composes everything.
// Single "Start Meeting" button -> captures system audio + microphone -> AudioMixer -> StreamRecorder
// During recording: live waveform + elapsed time
// On stop, automatic pipeline:
// 1. Whisper transcription (with progress bar)
// 2. Display transcript with timestamps
// 3. WebLLM summary (key decisions, action items) -- uses meetingSummarizer prompt
// 4. Export as ZIP: audio.mp3 + transcript.txt + transcript.srt + summary.md
//
// State: idle -> recording -> transcribing -> summarizing -> complete

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Users,
  Play,
  Square,
  Download,
  FileText,
  Sparkles,
  Loader2,
  Archive,
  RotateCcw,
  Mic,
  MonitorSpeaker,
  Pause,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
import { useWhisper } from "@/hooks/useWhisper";
import { useLocalAI } from "@/hooks/useLocalAI";
import { AudioMixer } from "@/lib/recording/mixer";
import {
  captureSystemAudio,
  captureMicrophone,
  stopAllTracks,
} from "@/lib/recording/capture";
import { exportMeetingBundle } from "@/lib/recording/meeting-export";
import RecordingControls from "./RecordingControls";
import WaveformVisualizer from "./WaveformVisualizer";
import BrowserSupportWarning from "./BrowserSupportWarning";
import { PROMPTS } from "@/lib/ai/prompts";
import { detectCapabilities } from "@/lib/recording/browser-support";
import type { TranscriptionResult } from "@/lib/ai/whisper";
import type { RecordingResult } from "@/lib/recording/types";
import ToolPageHeader from "../tools/ToolPageHeader";

type MeetingState =
  | "idle"
  | "recording"
  | "transcribing"
  | "summarizing"
  | "complete";

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

export default function MeetingRecorder() {
  // ---- Browser support ----
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const caps = detectCapabilities();
    setIsSupported(caps.getUserMedia && caps.mediaRecorder);
  }, []);

  // ---- Pipeline state ----
  const [meetingState, setMeetingState] = useState<MeetingState>("idle");
  const [error, setError] = useState<string | null>(null);

  // ---- Source toggles ----
  const [captureSystemAudioEnabled, setCaptureSystemAudioEnabled] =
    useState(true);
  const [captureMicEnabled, setCaptureMicEnabled] = useState(true);

  // ---- Recording ----
  const {
    state: recorderState,
    duration,
    bookmarks,
    result: recordingResult,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    addBookmark,
    reset: resetRecorder,
  } = useRecorder();

  const mixerRef = useRef<AudioMixer | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // ---- Transcription ----
  const {
    isLoaded: whisperLoaded,
    isTranscribing,
    progress: whisperProgress,
    progressText: whisperProgressText,
    loadWhisper,
    transcribe,
  } = useWhisper();

  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);

  // ---- AI Summary ----
  const { isReady: aiReady, infer, loadModel, status: aiStatus } = useLocalAI();
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // ---- Export ----
  const [isExporting, setIsExporting] = useState(false);
  const finalRecordingRef = useRef<RecordingResult | null>(null);

  // ---- Clipboard ----
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // ---- Start meeting ----
  const handleStart = useCallback(async () => {
    setError(null);
    setMeetingState("recording");

    try {
      const mixer = new AudioMixer();
      mixerRef.current = mixer;

      let hasAnySource = false;

      // Capture system audio
      if (captureSystemAudioEnabled) {
        try {
          const systemStream = await captureSystemAudio();
          systemStreamRef.current = systemStream;
          mixer.addStream(systemStream, { label: "system", gain: 1 });
          hasAnySource = true;
        } catch {
          console.warn(
            "System audio capture failed or cancelled, continuing with mic only.",
          );
        }
      }

      // Capture microphone
      if (captureMicEnabled) {
        try {
          const micStream = await captureMicrophone();
          micStreamRef.current = micStream;
          mixer.addStream(micStream, { label: "mic", gain: 1 });
          hasAnySource = true;
        } catch {
          console.warn("Microphone capture failed or denied.");
        }
      }

      if (!hasAnySource) {
        setError(
          "No audio sources available. Please enable system audio or microphone.",
        );
        mixer.dispose();
        setMeetingState("idle");
        return;
      }

      const mixedStream = mixer.getMixedStream();
      if (!mixedStream) {
        setError("Failed to create audio mix. Please try again.");
        mixer.dispose();
        setMeetingState("idle");
        return;
      }

      setAnalyser(mixer.getAnalyserNode());
      await startRecording(mixedStream, { type: "audio" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start meeting recording.",
      );
      setMeetingState("idle");
    }
  }, [captureSystemAudioEnabled, captureMicEnabled, startRecording]);

  // ---- Stop meeting -> begin pipeline ----
  const handleStop = useCallback(async () => {
    const result = await stopRecording();
    finalRecordingRef.current = result;

    // Stop all streams
    if (systemStreamRef.current) {
      stopAllTracks(systemStreamRef.current);
      systemStreamRef.current = null;
    }
    if (micStreamRef.current) {
      stopAllTracks(micStreamRef.current);
      micStreamRef.current = null;
    }
    mixerRef.current?.dispose();
    mixerRef.current = null;
    setAnalyser(null);

    // Begin transcription pipeline
    if (result) {
      setMeetingState("transcribing");

      try {
        await loadWhisper("Xenova/whisper-tiny");
        const transcriptionResult = await transcribe(result.blob);
        setTranscription(transcriptionResult);

        // Begin summarization
        setMeetingState("summarizing");
        await summarizeTranscript(transcriptionResult);
      } catch (err) {
        console.error("Transcription failed:", err);
        setError("Transcription failed. You can still download the audio.");
        setMeetingState("complete");
      }
    } else {
      setMeetingState("idle");
    }
  }, [stopRecording, loadWhisper, transcribe]);

  // ---- AI Summarization ----
  const summarizeTranscript = useCallback(
    async (transcriptionData: TranscriptionResult) => {
      setIsSummarizing(true);

      try {
        // Format transcript for the LLM
        const transcriptText = transcriptionData.segments
          .map(
            (seg) =>
              `[${formatTimestamp(seg.start)} - ${formatTimestamp(seg.end)}] ${seg.text}`,
          )
          .join("\n");

        if (!aiReady) {
          // Try loading the model
          await loadModel();
        }

        const result = await infer(
          `Here is a meeting transcript:\n\n${transcriptText}\n\nPlease provide a structured summary.`,
          PROMPTS.meetingSummarizer,
        );

        setSummary(result);
      } catch (err) {
        console.warn("AI summary failed (model may not be loaded):", err);
        // Not a critical failure -- user can skip the summary
        setSummary(null);
      } finally {
        setIsSummarizing(false);
        setMeetingState("complete");
      }
    },
    [aiReady, infer, loadModel],
  );

  // ---- Export as ZIP ----
  const handleExportZIP = useCallback(async () => {
    const recording = finalRecordingRef.current;
    if (!recording || !transcription) return;

    setIsExporting(true);

    try {
      const zipBlob = await exportMeetingBundle({
        audio: recording.blob,
        audioFormat: "webm",
        transcript: transcription,
        summary: summary ?? undefined,
        metadata: {
          date: new Date().toISOString(),
          duration: recording.duration,
          title: "Meeting Recording",
        },
      });

      downloadBlob(
        zipBlob,
        `meeting-${new Date().toISOString().slice(0, 10)}.zip`,
      );
    } catch (err) {
      console.error("ZIP export failed:", err);
      setError("Failed to export ZIP bundle. Please try downloading files individually.");
    } finally {
      setIsExporting(false);
    }
  }, [transcription, summary]);

  // ---- Individual file downloads ----
  const handleDownloadAudio = useCallback(() => {
    const recording = finalRecordingRef.current;
    if (!recording) return;
    downloadBlob(recording.blob, "meeting-audio.webm");
  }, []);

  const handleDownloadTranscript = useCallback(() => {
    if (!transcription) return;
    const blob = new Blob([transcription.text], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlob(blob, "transcript.txt");
  }, [transcription]);

  const handleDownloadSummary = useCallback(() => {
    if (!summary) return;
    const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, "summary.md");
  }, [summary]);

  // ---- Reset ----
  const handleReset = useCallback(() => {
    resetRecorder();
    setMeetingState("idle");
    setTranscription(null);
    setSummary(null);
    setError(null);
    finalRecordingRef.current = null;
  }, [resetRecorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (systemStreamRef.current) stopAllTracks(systemStreamRef.current);
      if (micStreamRef.current) stopAllTracks(micStreamRef.current);
      mixerRef.current?.dispose();
    };
  }, []);

  const isRecording =
    recorderState === "recording" || recorderState === "paused";

  if (!isSupported) {
    return (
      <div>
        <ToolPageHeader
          icon={Users}
          title="Meeting Recorder"
          description="Record, transcribe, and summarize meetings."
        />
        <BrowserSupportWarning
          feature="Audio recording"
          description="Your browser does not support the MediaRecorder API required for meeting recording."
        />
      </div>
    );
  }

  return (
    <div>
      <ToolPageHeader
        icon={Users}
        title="Meeting Recorder"
        description="Record, transcribe, and summarize meetings. Export as ZIP with audio, transcript, and summary."
      />

      {/* Error */}
      {error && (
        <div className="mb-4 border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* ---- IDLE STATE ---- */}
      {meetingState === "idle" && (
        <div className="space-y-6">
          {/* Audio source toggles */}
          <div className="bg-bg-surface border border-border p-4 space-y-3">
            <h3 className="text-sm font-medium text-text-primary">
              Audio Sources
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorSpeaker
                  className={`w-4 h-4 ${captureSystemAudioEnabled ? "text-accent" : "text-text-tertiary"}`}
                />
                <span className="text-sm text-text-primary">
                  System audio (tab/app audio)
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCaptureSystemAudioEnabled(!captureSystemAudioEnabled)
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  captureSystemAudioEnabled ? "bg-accent" : "bg-bg-elevated"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                    captureSystemAudioEnabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic
                  className={`w-4 h-4 ${captureMicEnabled ? "text-accent" : "text-text-tertiary"}`}
                />
                <span className="text-sm text-text-primary">
                  Microphone (your voice)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCaptureMicEnabled(!captureMicEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  captureMicEnabled ? "bg-accent" : "bg-bg-elevated"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                    captureMicEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Start button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleStart}
              disabled={
                !captureSystemAudioEnabled && !captureMicEnabled
              }
              className="inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-medium text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Users className="w-6 h-6" />
              Start Meeting
            </button>
            <p className="text-text-tertiary text-sm mt-3">
              Audio is captured and processed entirely on your device.
            </p>
          </div>

          {/* Pipeline preview */}
          <div className="bg-bg-surface border border-border p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              What happens after recording:
            </h3>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <Step n={1} label="Record" />
              <Arrow />
              <Step n={2} label="Transcribe" />
              <Arrow />
              <Step n={3} label="Summarize" />
              <Arrow />
              <Step n={4} label="Export" />
            </div>
          </div>
        </div>
      )}

      {/* ---- RECORDING STATE ---- */}
      {meetingState === "recording" && (
        <div className="space-y-6">
          {/* Waveform */}
          {analyser && (
            <div className="bg-bg-surface border border-border p-4">
              <WaveformVisualizer
                analyser={analyser}
                style="mirrored"
                height={100}
              />
            </div>
          )}

          {/* Controls */}
          <RecordingControls
            state={recorderState}
            duration={duration}
            onStart={handleStart}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={handleStop}
            onBookmark={() => addBookmark()}
            bookmarks={bookmarks}
          />
        </div>
      )}

      {/* ---- TRANSCRIBING STATE ---- */}
      {meetingState === "transcribing" && (
        <div className="space-y-4">
          <PipelineProgress
            steps={[
              { label: "Record", status: "done" },
              { label: "Transcribe", status: "active" },
              { label: "Summarize", status: "pending" },
              { label: "Export", status: "pending" },
            ]}
          />

          <div className="bg-bg-surface border border-border p-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-accent animate-spin" />
            <h3 className="font-heading font-semibold mb-1">
              Transcribing audio...
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {whisperProgressText || "Loading Whisper model..."}
            </p>
            <div className="w-full max-w-xs mx-auto bg-bg-elevated rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${whisperProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- SUMMARIZING STATE ---- */}
      {meetingState === "summarizing" && (
        <div className="space-y-4">
          <PipelineProgress
            steps={[
              { label: "Record", status: "done" },
              { label: "Transcribe", status: "done" },
              { label: "Summarize", status: "active" },
              { label: "Export", status: "pending" },
            ]}
          />

          <div className="bg-bg-surface border border-border p-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-accent animate-pulse" />
            <h3 className="font-heading font-semibold mb-1">
              Generating summary...
            </h3>
            <p className="text-sm text-text-secondary">
              {aiStatus === "loading" || aiStatus === "downloading"
                ? "Loading AI model (first time may take a moment)..."
                : "Analyzing transcript for key points and action items..."}
            </p>
          </div>
        </div>
      )}

      {/* ---- COMPLETE STATE ---- */}
      {meetingState === "complete" && (
        <div className="space-y-6">
          <PipelineProgress
            steps={[
              { label: "Record", status: "done" },
              { label: "Transcribe", status: transcription ? "done" : "error" },
              {
                label: "Summarize",
                status: summary ? "done" : isSummarizing ? "active" : "skipped",
              },
              { label: "Export", status: "pending" },
            ]}
          />

          {/* Transcript */}
          {transcription && (
            <div className="bg-bg-surface border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Transcript
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(transcription.text, "transcript")
                  }
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  {copiedField === "transcript" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
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
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="bg-bg-surface border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="flex items-center justify-between w-full px-4 py-3 border-b border-border"
              >
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  AI Summary
                </h3>
                {summaryExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-tertiary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                )}
              </button>
              {summaryExpanded && (
                <div className="px-4 py-3">
                  <div className="prose prose-sm max-w-none text-text-primary">
                    {summary.split("\n").map((line, i) => {
                      if (line.startsWith("## ")) {
                        return (
                          <h3
                            key={i}
                            className="font-heading font-semibold text-base mt-4 mb-2 first:mt-0"
                          >
                            {line.replace("## ", "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <p
                            key={i}
                            className="text-sm text-text-secondary pl-4 before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full before:bg-text-tertiary before:mr-2 before:align-middle"
                          >
                            {line.replace("- ", "")}
                          </p>
                        );
                      }
                      if (line.trim() === "") return <br key={i} />;
                      return (
                        <p key={i} className="text-sm text-text-primary mb-1">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                  <div className="flex justify-end mt-3 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => handleCopy(summary, "summary")}
                      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {copiedField === "summary" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy summary
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export section */}
          <div className="bg-bg-surface border border-border p-4 space-y-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-accent" />
              Export
            </h3>

            {/* ZIP export */}
            {transcription && (
              <button
                type="button"
                onClick={handleExportZIP}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent text-white font-medium text-sm transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating ZIP...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Download ZIP Bundle
                  </>
                )}
              </button>
            )}

            {/* Individual downloads */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownloadAudio}
                disabled={!finalRecordingRef.current}
                className="flex flex-col items-center gap-1 px-3 py-2.5 border border-border hover:border-border-hover text-text-primary text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Mic className="w-4 h-4 text-accent" />
                Audio
              </button>
              <button
                type="button"
                onClick={handleDownloadTranscript}
                disabled={!transcription}
                className="flex flex-col items-center gap-1 px-3 py-2.5 border border-border hover:border-border-hover text-text-primary text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 text-accent" />
                Transcript
              </button>
              <button
                type="button"
                onClick={handleDownloadSummary}
                disabled={!summary}
                className="flex flex-col items-center gap-1 px-3 py-2.5 border border-border hover:border-border-hover text-text-primary text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                Summary
              </button>
            </div>
          </div>

          {/* Recording info */}
          {finalRecordingRef.current && (
            <div className="flex items-center justify-between text-sm text-text-tertiary px-1">
              <span>
                Duration:{" "}
                {Math.round(finalRecordingRef.current.duration / 1000)}s
                {" | "}
                Size:{" "}
                {(finalRecordingRef.current.blob.size / (1024 * 1024)).toFixed(
                  1,
                )}{" "}
                MB
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 hover:text-text-secondary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New meeting
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helper sub-components ----

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-bg-elevated text-[10px] font-bold">
        {n}
      </span>
      <span>{label}</span>
    </div>
  );
}

function Arrow() {
  return (
    <span className="text-text-tertiary">
      <ChevronRight className="w-3 h-3" />
    </span>
  );
}

interface PipelineStep {
  label: string;
  status: "done" | "active" | "pending" | "error" | "skipped";
}

function PipelineProgress({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-bg-surface border border-border">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          {i > 0 && (
            <div
              className={`h-px w-6 ${
                step.status === "done" || step.status === "active"
                  ? "bg-accent"
                  : "bg-border"
              }`}
            />
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                step.status === "done"
                  ? "bg-accent text-white"
                  : step.status === "active"
                    ? "bg-accent/20 text-accent ring-2 ring-accent"
                    : step.status === "error"
                      ? "bg-red-500/20 text-red-500"
                      : step.status === "skipped"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-bg-elevated text-text-tertiary"
              }`}
            >
              {step.status === "done" ? (
                <Check className="w-3 h-3" />
              ) : step.status === "active" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`text-xs ${
                step.status === "done" || step.status === "active"
                  ? "text-text-primary font-medium"
                  : "text-text-tertiary"
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
