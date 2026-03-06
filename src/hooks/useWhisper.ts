"use client";

import { useState, useCallback } from "react";
import type { TranscriptionResult, WhisperModel } from "@/lib/ai/whisper";

/**
 * Hook for in-browser Whisper transcription.
 *
 * Usage:
 *   const { isLoaded, isTranscribing, progress, loadWhisper, transcribe, unload } = useWhisper();
 *
 *   // Load model (downloads on first use)
 *   await loadWhisper("base");
 *
 *   // Transcribe a recording
 *   const result = await transcribe(audioBlob);
 *   console.log(result.text);
 */
export function useWhisper() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const loadWhisperModel = useCallback(async (model?: WhisperModel) => {
    const { loadWhisper, isWhisperLoaded } = await import("@/lib/ai/whisper");
    if (isWhisperLoaded()) {
      setIsLoaded(true);
      return;
    }

    await loadWhisper(model, (p) => {
      setProgress(p.progress);
      setProgressText(p.text);
    });
    setIsLoaded(true);
  }, []);

  const transcribe = useCallback(
    async (audioBlob: Blob): Promise<TranscriptionResult> => {
      const { transcribe: whisperTranscribe } = await import(
        "@/lib/ai/whisper"
      );
      setIsTranscribing(true);
      try {
        const result = await whisperTranscribe(audioBlob, (p) => {
          setProgress(p.progress);
          setProgressText(p.text);
        });
        return result;
      } finally {
        setIsTranscribing(false);
      }
    },
    []
  );

  const unload = useCallback(async () => {
    const { unloadWhisper } = await import("@/lib/ai/whisper");
    unloadWhisper();
    setIsLoaded(false);
    setProgress(0);
    setProgressText("");
  }, []);

  return {
    isLoaded,
    isTranscribing,
    progress,
    progressText,
    loadWhisper: loadWhisperModel,
    transcribe,
    unload,
  };
}
