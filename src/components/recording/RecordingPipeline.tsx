"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  Sparkles,
  ChevronRight,
  Check,
  SkipForward,
  Copy,
  Loader2,
  Cpu,
} from "lucide-react";
import { useWhisper } from "@/hooks/useWhisper";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import type { TranscriptionResult, TranscriptionSegment } from "@/lib/ai/whisper";

interface RecordingPipelineProps {
  audioBlob: Blob;
  className?: string;
}

type PipelineStep = "idle" | "transcribe" | "summarize" | "complete";

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  });
}

export default function RecordingPipeline({
  audioBlob,
  className,
}: RecordingPipelineProps) {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [transcriptCopied, setTranscriptCopied] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isLoaded: whisperLoaded,
    isTranscribing,
    progress: whisperProgress,
    progressText: whisperProgressText,
    loadWhisper,
    transcribe,
  } = useWhisper();

  const {
    isReady: aiReady,
    status: aiStatus,
    progress: aiProgress,
    progressText: aiProgressText,
    loadModel,
    streamInfer,
  } = useLocalAI();

  // ---- Step definitions for visual indicator ----
  const steps: Array<{
    key: PipelineStep;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "transcribe", label: "Transcribe", icon: FileText },
    { key: "summarize", label: "Summarize", icon: Sparkles },
    { key: "complete", label: "Done", icon: Check },
  ];

  // ---- Determine step state ----
  const getStepState = useCallback(
    (
      stepKey: PipelineStep,
    ): "pending" | "active" | "complete" => {
      const order: PipelineStep[] = [
        "idle",
        "transcribe",
        "summarize",
        "complete",
      ];
      const currentIdx = order.indexOf(step);
      const stepIdx = order.indexOf(stepKey);

      if (stepIdx < currentIdx) return "complete";
      if (stepIdx === currentIdx) return "active";
      return "pending";
    },
    [step],
  );

  // ---- Start transcription ----
  const handleTranscribe = useCallback(async () => {
    setError(null);
    setStep("transcribe");

    try {
      if (!whisperLoaded) {
        await loadWhisper("Xenova/whisper-tiny");
      }

      const result = await transcribe(audioBlob);
      setTranscription(result);
      setStep("summarize");
    } catch (err) {
      setError(
        `Transcription failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      setStep("idle");
    }
  }, [audioBlob, whisperLoaded, loadWhisper, transcribe]);

  // ---- Start summarization ----
  const handleSummarize = useCallback(async () => {
    if (!transcription) return;
    setError(null);
    setIsSummarizing(true);

    try {
      if (!aiReady) {
        await loadModel();
      }

      // Build prompt with transcript
      const transcriptText = transcription.segments
        .map(
          (seg: TranscriptionSegment) =>
            `[${formatTimestamp(seg.start)}] ${seg.text}`,
        )
        .join("\n");

      const userPrompt = `Here is the transcript:\n\n${transcriptText}`;

      let accumulated = "";
      await streamInfer(
        userPrompt,
        PROMPTS.meetingSummarizer,
        (token: string) => {
          accumulated += token;
          setSummary(accumulated);
        },
      );

      setStep("complete");
    } catch (err) {
      setError(
        `Summarization failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsSummarizing(false);
    }
  }, [transcription, aiReady, loadModel, streamInfer]);

  // ---- Skip summarize ----
  const handleSkipSummarize = useCallback(() => {
    setStep("complete");
  }, []);

  // ---- Copy helpers ----
  const handleCopyTranscript = useCallback(() => {
    if (!transcription) return;
    const text = transcription.segments
      .map(
        (seg: TranscriptionSegment) =>
          `[${formatTimestamp(seg.start)} - ${formatTimestamp(seg.end)}] ${seg.text}`,
      )
      .join("\n");
    copyToClipboard(text);
    setTranscriptCopied(true);
    setTimeout(() => setTranscriptCopied(false), 2000);
  }, [transcription]);

  const handleCopySummary = useCallback(() => {
    copyToClipboard(summary);
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2000);
  }, [summary]);

  // ---- Idle state: show enable button ----
  if (step === "idle" && !transcription) {
    return (
      <div className={`bg-bg-surface border border-border p-4 ${className ?? ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-text-tertiary" />
          <h3 className="text-sm font-medium text-text-secondary">
            AI Pipeline
          </h3>
        </div>
        <p className="text-xs text-text-tertiary mb-4">
          Transcribe your recording with Whisper, then generate a structured
          summary using local AI. All processing runs in your browser.
        </p>
        <button
          onClick={handleTranscribe}
          className="flex items-center gap-2 py-2.5 px-5 bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Transcribe Recording
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-bg-surface border border-border p-4 ${className ?? ""}`}>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-5">
        {steps.map((s, i) => {
          const state = getStepState(s.key);
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium transition-colors ${
                  state === "complete"
                    ? "bg-green-500/10 text-green-500"
                    : state === "active"
                      ? "bg-accent/10 text-accent"
                      : "text-text-tertiary"
                }`}
              >
                {state === "complete" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-text-tertiary" />
              )}
            </div>
          );
        })}
      </div>

      {/* Transcription step */}
      {step === "transcribe" && !transcription && (
        <div className="space-y-3">
          {isTranscribing || !whisperLoaded ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-text-primary">
                  {whisperProgressText || "Loading Whisper model..."}
                </p>
                {whisperProgress > 0 && (
                  <div className="mt-1.5 h-1 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-[width] duration-300 rounded-full"
                      style={{ width: `${whisperProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Transcript display */}
      {transcription && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Transcript
            </h4>
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            >
              {transcriptCopied ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto bg-bg-elevated p-3 space-y-1.5">
            {transcription.segments.length > 0 ? (
              transcription.segments.map(
                (seg: TranscriptionSegment, i: number) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="flex-shrink-0 font-mono text-xs text-text-tertiary tabular-nums pt-0.5">
                      {formatTimestamp(seg.start)}
                    </span>
                    <span className="text-text-primary">{seg.text}</span>
                  </div>
                ),
              )
            ) : (
              <p className="text-sm text-text-secondary">
                {transcription.text || "No speech detected."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summarize step */}
      {step === "summarize" && transcription && !summary && !isSummarizing && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSummarize}
            className="flex items-center gap-2 py-2.5 px-5 bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Summarize
          </button>
          <button
            onClick={handleSkipSummarize}
            className="flex items-center gap-2 py-2.5 px-4 text-text-tertiary text-sm hover:text-text-secondary transition-colors cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
        </div>
      )}

      {/* Summarizing progress */}
      {isSummarizing && !summary && (
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-text-primary">
              {aiStatus === "loading" || aiStatus === "downloading"
                ? aiProgressText || "Loading AI model..."
                : "Generating summary..."}
            </p>
            {aiProgress > 0 &&
              (aiStatus === "loading" || aiStatus === "downloading") && (
                <div className="mt-1.5 h-1 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-[width] duration-300 rounded-full"
                    style={{ width: `${aiProgress}%` }}
                  />
                </div>
              )}
          </div>
        </div>
      )}

      {/* Summary display */}
      {summary && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Summary
            </h4>
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
            >
              {summaryCopied ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-bg-elevated p-3 max-h-64 overflow-y-auto">
            <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {summary}
              {isSummarizing && (
                <span className="inline-block w-1.5 h-4 bg-accent/50 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
