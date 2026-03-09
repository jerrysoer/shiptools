"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Mic,
  Download,
  Copy,
  Check,
  Loader2,
  Upload,
  AlertCircle,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import DropZone from "@/components/DropZone";
import { useWhisper } from "@/hooks/useWhisper";
import type { TranscriptionResult, WhisperModel } from "@/lib/ai/whisper";
import { trackEvent } from "@/lib/analytics";
import { MAX_AUDIO_SIZE } from "@/lib/constants";

const ACCEPT = "audio/wav,audio/mp3,audio/mpeg,audio/ogg,audio/webm,audio/m4a,audio/mp4,.wav,.mp3,.ogg,.webm,.m4a";

type ModelSize = "tiny" | "base";

const MODEL_MAP: Record<ModelSize, WhisperModel> = {
  tiny: "Xenova/whisper-tiny",
  base: "Xenova/whisper-base",
};

const MODEL_LABELS: Record<ModelSize, string> = {
  tiny: "Tiny (~40 MB)",
  base: "Base (~140 MB)",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TranscriptionTool() {
  useEffect(() => {
    trackEvent("tool_opened", { tool: "transcription" });
  }, []);

  const {
    isLoaded,
    isTranscribing,
    progress,
    progressText,
    loadWhisper: loadWhisperModel,
    transcribe,
  } = useWhisper();

  const [modelSize, setModelSize] = useState<ModelSize>("tiny");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const audioUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const handleLoadModel = useCallback(async () => {
    setIsModelLoading(true);
    setModelError(null);

    try {
      await loadWhisperModel(MODEL_MAP[modelSize]);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : "Failed to load model");
    } finally {
      setIsModelLoading(false);
    }
  }, [loadWhisperModel, modelSize]);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = URL.createObjectURL(file);

    setAudioFile(file);
    setResult(null);
    setTranscriptionError(null);
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!audioFile) return;

    setTranscriptionError(null);
    setResult(null);

    try {
      // Auto-load model if not loaded
      if (!isLoaded) {
        setIsModelLoading(true);
        await loadWhisperModel(MODEL_MAP[modelSize]);
        setIsModelLoading(false);
      }

      const transcriptionResult = await transcribe(audioFile);
      setResult(transcriptionResult);
      trackEvent("tool_used", { tool: "transcription" });
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : "Transcription failed");
      setIsModelLoading(false);
    }
  }, [audioFile, isLoaded, loadWhisperModel, modelSize, transcribe]);

  const handleCopyText = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const downloadFile = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadSRT = useCallback(async () => {
    if (!result || !audioFile) return;
    const { toSRT } = await import("@/lib/ai/subtitle-export");
    const baseName = audioFile.name.replace(/\.[^.]+$/, "");
    downloadFile(toSRT(result.segments), `${baseName}.srt`);
  }, [result, audioFile, downloadFile]);

  const handleDownloadVTT = useCallback(async () => {
    if (!result || !audioFile) return;
    const { toVTT } = await import("@/lib/ai/subtitle-export");
    const baseName = audioFile.name.replace(/\.[^.]+$/, "");
    downloadFile(toVTT(result.segments), `${baseName}.vtt`);
  }, [result, audioFile, downloadFile]);

  const handleClear = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioFile(null);
    setResult(null);
    setTranscriptionError(null);
  }, []);

  return (
    <div>
      <ToolPageHeader
        icon={Mic}
        title="Audio Transcription"
        description="Transcribe audio files to text using Whisper. Runs locally in your browser — no uploads."
      />

      <div className="space-y-6">
        {/* Model card */}
        <div className="bg-bg-elevated border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">Whisper Model</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {isLoaded
                  ? `${MODEL_LABELS[modelSize]} ready`
                  : "Select a model size and load it"}
              </p>
            </div>
            {isLoaded && (
              <div className="flex items-center gap-1.5 text-xs text-grade-a">
                <div className="w-2 h-2 rounded-full bg-grade-a animate-pulse" />
                Ready
              </div>
            )}
          </div>

          {/* Model size selector */}
          {!isLoaded && !isModelLoading && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Model size
              </label>
              <div className="flex gap-2">
                {(Object.keys(MODEL_MAP) as ModelSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setModelSize(size)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      modelSize === size
                        ? "bg-accent text-accent-fg"
                        : "bg-bg-surface text-text-secondary hover:text-text-primary border border-border"
                    }`}
                  >
                    {MODEL_LABELS[size]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Load button */}
          {!isLoaded && !isModelLoading && (
            <button
              onClick={handleLoadModel}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary text-bg-primary text-sm font-medium transition-opacity hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              Load Model
            </button>
          )}

          {/* Loading progress */}
          {(isModelLoading || (progress > 0 && progress < 100 && !isTranscribing)) && (
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-2">
                <span>{progressText || "Loading model..."}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Model error */}
          {modelError && (
            <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 text-sm">
              <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
              <span className="text-text-secondary">{modelError}</span>
            </div>
          )}
        </div>

        {/* File upload */}
        {audioFile && (
          <div className="flex justify-end">
            <button
              onClick={handleClear}
              className="text-text-tertiary hover:text-text-primary text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        <DropZone
          accept={ACCEPT}
          maxSize={MAX_AUDIO_SIZE}
          onFiles={handleFiles}
          label="Drop an audio file here to transcribe"
          multiple={false}
        />

        {/* File info */}
        {audioFile && (
          <div className="flex items-center gap-3 bg-bg-elevated border border-border px-4 py-3">
            <Mic className="w-4 h-4 text-text-tertiary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate font-medium">
                {audioFile.name}
              </p>
              <p className="text-xs text-text-tertiary">
                {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            {audioUrlRef.current && (
              <audio
                src={audioUrlRef.current}
                controls
                className="h-8 max-w-[200px]"
              />
            )}
          </div>
        )}

        {/* Transcribe button */}
        {audioFile && !result && (
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Transcribe
              </>
            )}
          </button>
        )}

        {/* Transcription progress */}
        {isTranscribing && (
          <div>
            <div className="flex justify-between text-xs text-text-secondary mb-2">
              <span>{progressText || "Processing audio..."}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Transcription error */}
        {transcriptionError && (
          <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 text-sm">
            <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
            <span className="text-text-secondary">{transcriptionError}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Full text output */}
            <div className="bg-bg-elevated border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Full Transcript
                </span>
              </div>
              <div className="p-4">
                <textarea
                  readOnly
                  value={result.text}
                  rows={6}
                  className="w-full bg-transparent text-sm text-text-primary font-mono resize-y focus:outline-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border text-sm font-medium transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-grade-a" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied" : "Copy text"}
              </button>

              <button
                onClick={handleDownloadSRT}
                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download SRT
              </button>

              <button
                onClick={handleDownloadVTT}
                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download VTT
              </button>
            </div>

            {/* Timestamped segments */}
            {result.segments.length > 0 && (
              <div className="bg-bg-elevated border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Timestamped Segments ({result.segments.length})
                  </span>
                </div>
                <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
                  {result.segments.map((seg, i) => (
                    <div key={i} className="flex gap-3 px-4 py-2.5">
                      <span className="text-xs font-mono text-text-tertiary shrink-0 pt-0.5 min-w-[100px]">
                        {formatTime(seg.start)} — {formatTime(seg.end)}
                      </span>
                      <span className="text-sm text-text-primary">
                        {seg.text.trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-text-tertiary text-xs">
          Generated by local AI — may contain errors. Whisper runs entirely in
          your browser; no audio is uploaded to any server.
        </p>
      </div>
    </div>
  );
}
