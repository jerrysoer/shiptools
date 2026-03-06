"use client";

import { useState, useCallback, useRef } from "react";
import type {
  RecordingState,
  Bookmark,
  RecordingResult,
} from "@/lib/recording/types";
import { StreamRecorder } from "@/lib/recording/recorder";

/**
 * Core recording hook -- equivalent of useConverter for recording.
 *
 * Usage:
 *   const { state, duration, startRecording, stopRecording, addBookmark } = useRecorder();
 *
 *   // Start recording from a MediaStream
 *   await startRecording(stream, { type: "audio" });
 *
 *   // Add bookmark at current position
 *   addBookmark("Intro ends");
 *
 *   // Stop and get result
 *   const result = await stopRecording();
 */
export function useRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const recorderRef = useRef<StreamRecorder | null>(null);

  const startRecording = useCallback(
    async (
      stream: MediaStream,
      options?: { mimeType?: string; type?: "audio" | "video" }
    ) => {
      const recorder = new StreamRecorder();
      recorderRef.current = recorder;
      recorder.onStateChange = setState;
      recorder.onDurationChange = setDuration;
      recorder.start(stream, options);
    },
    []
  );

  const pauseRecording = useCallback(() => recorderRef.current?.pause(), []);
  const resumeRecording = useCallback(() => recorderRef.current?.resume(), []);

  const stopRecording =
    useCallback(async (): Promise<RecordingResult | null> => {
      if (!recorderRef.current) return null;
      const res = await recorderRef.current.stop();
      setResult(res);
      setBookmarks(res.bookmarks);
      return res;
    }, []);

  const addBookmark = useCallback((label?: string) => {
    recorderRef.current?.addBookmark(label);
    if (recorderRef.current) {
      setBookmarks(recorderRef.current.bookmarks);
    }
  }, []);

  const reset = useCallback(() => {
    recorderRef.current = null;
    setState("idle");
    setDuration(0);
    setBookmarks([]);
    setResult(null);
  }, []);

  return {
    state,
    duration,
    bookmarks,
    result,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    addBookmark,
    reset,
  };
}
