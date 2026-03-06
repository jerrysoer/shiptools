"use client";

import { Mic, Pause, Play, Square, Bookmark } from "lucide-react";
import type { RecordingState } from "@/lib/recording/types";
import DurationDisplay from "./DurationDisplay";
import type { Bookmark as BookmarkType } from "@/lib/recording/types";

interface RecordingControlsProps {
  state: RecordingState;
  duration: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onBookmark?: () => void;
  bookmarks?: BookmarkType[];
  disabled?: boolean;
}

export default function RecordingControls({
  state,
  duration,
  onStart,
  onPause,
  onResume,
  onStop,
  onBookmark,
  bookmarks,
  disabled,
}: RecordingControlsProps) {
  const isIdle = state === "idle" || state === "stopped";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isActive = isRecording || isPaused;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Duration display */}
      <DurationDisplay
        duration={duration}
        bookmarks={bookmarks}
        showHours={duration >= 3600000}
      />

      {/* Controls row */}
      <div className="flex items-center gap-4">
        {/* Pause / Resume button (visible only when active) */}
        {isActive && (
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-bg-surface hover:bg-bg-elevated text-text-primary transition-colors"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="w-5 h-5 ml-0.5" />
            ) : (
              <Pause className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Main record / stop button */}
        {isIdle ? (
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start recording"
          >
            <Mic className="w-8 h-8" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500 text-white transition-colors"
            title="Stop recording"
          >
            {/* Pulsing ring animation when recording */}
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
            )}
            <Square className="w-8 h-8 relative" />
          </button>
        )}

        {/* Bookmark button (visible only when active) */}
        {isActive && onBookmark && (
          <button
            type="button"
            onClick={onBookmark}
            className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-bg-surface hover:bg-bg-elevated text-text-primary transition-colors"
            title="Add bookmark"
          >
            <Bookmark className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* State label */}
      <p className="text-xs text-text-tertiary">
        {isIdle && state === "idle" && "Ready to record"}
        {isIdle && state === "stopped" && "Recording stopped"}
        {isRecording && "Recording..."}
        {isPaused && "Paused"}
        {state === "requesting" && "Requesting access..."}
        {state === "processing" && "Processing..."}
      </p>
    </div>
  );
}
