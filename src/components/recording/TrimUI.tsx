"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type RefObject } from "react";
import { Play, Pause, Scissors } from "lucide-react";
import { generateWaveformFromAudio } from "@/lib/recording/waveform";
import { formatDuration } from "./DurationDisplay";
import type { TrimRange, Bookmark } from "@/lib/recording/types";

interface TrimUIProps {
  audioBlob: Blob;
  bookmarks?: Bookmark[];
  onTrimChange: (range: TrimRange) => void;
  className?: string;
}

export default function TrimUI({
  audioBlob,
  bookmarks,
  onTrimChange,
  className,
}: TrimUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const audioUrl = useMemo(() => URL.createObjectURL(audioBlob), [audioBlob]);

  // Stable ref for onTrimChange to avoid re-decode on callback identity change
  const onTrimChangeRef = useRef(onTrimChange);
  onTrimChangeRef.current = onTrimChange;

  // Decode audio and draw waveform
  useEffect(() => {
    let cancelled = false;

    async function decode() {
      const ctx = new AudioContext();
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);

        if (cancelled) return;

        setAudioBuffer(buffer);
        setAudioDuration(buffer.duration);
        setTrimStart(0);
        setTrimEnd(buffer.duration);
        onTrimChangeRef.current({ start: 0, end: buffer.duration });

        // Draw static waveform
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          const drawCtx = canvas.getContext("2d");
          if (drawCtx) {
            drawCtx.scale(dpr, dpr);
          }
          generateWaveformFromAudio(buffer, canvas, {
            style: "bars",
            color: "var(--color-text-tertiary)",
            barWidth: 2,
            barGap: 1,
          });
        }
      } catch {
        // Decoding error — waveform unavailable
      } finally {
        await ctx.close();
      }
    }

    decode();

    return () => {
      cancelled = true;
    };
  }, [audioBlob]);

  // Cleanup URL
  useEffect(() => {
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // Playback tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let raf: number;

    const tick = () => {
      if (audio.paused) return;

      setPlaybackTime(audio.currentTime);

      // Clamp playback to trim region
      if (audio.currentTime >= trimEnd) {
        audio.pause();
        audio.currentTime = trimStart;
        setIsPlaying(false);
        setPlaybackTime(trimStart);
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      setIsPlaying(true);
      tick();
    };
    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(raf);
    };
    const onEnded = () => {
      setIsPlaying(false);
      cancelAnimationFrame(raf);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [trimStart, trimEnd]);

  // Toggle playback
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Start from trim start if we're outside the trim region
      if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart;
      }
      audio.play();
    }
  }, [isPlaying, trimStart, trimEnd]);

  // Convert position to time
  const positionToTime = useCallback(
    (clientX: number) => {
      if (!containerRef.current || audioDuration === 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * audioDuration;
    },
    [audioDuration],
  );

  // Convert time to percentage
  const timeToPercent = useCallback(
    (time: number) => {
      if (audioDuration === 0) return 0;
      return (time / audioDuration) * 100;
    },
    [audioDuration],
  );

  // Pointer events for dragging handles
  const handlePointerDown = useCallback(
    (handle: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;

      const time = positionToTime(e.clientX);
      const MIN_DURATION = 0.1; // minimum 100ms selection

      if (dragging === "start") {
        const newStart = Math.min(time, trimEnd - MIN_DURATION);
        setTrimStart(Math.max(0, newStart));
        onTrimChange({ start: Math.max(0, newStart), end: trimEnd });
      } else {
        const newEnd = Math.max(time, trimStart + MIN_DURATION);
        setTrimEnd(Math.min(audioDuration, newEnd));
        onTrimChange({ start: trimStart, end: Math.min(audioDuration, newEnd) });
      }
    },
    [dragging, positionToTime, trimStart, trimEnd, audioDuration, onTrimChange],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const startPercent = timeToPercent(trimStart);
  const endPercent = timeToPercent(trimEnd);
  const playPercent = timeToPercent(playbackTime);

  return (
    <div className={`bg-bg-surface border border-border rounded-xl p-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Scissors className="w-4 h-4 text-text-tertiary" />
        <h3 className="text-sm font-medium text-text-secondary">Trim</h3>
      </div>

      {/* Audio element (hidden) */}
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Waveform container with trim handles */}
      <div
        ref={containerRef}
        className="relative h-[80px] mb-3 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Static waveform canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-lg"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Dimmed regions outside selection */}
        <div
          className="absolute inset-y-0 left-0 bg-bg-primary/60 rounded-l-lg pointer-events-none"
          style={{ width: `${startPercent}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-bg-primary/60 rounded-r-lg pointer-events-none"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Selected region highlight */}
        <div
          className="absolute inset-y-0 border-y-2 border-accent/30 pointer-events-none"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />

        {/* Start handle */}
        <div
          onPointerDown={handlePointerDown("start")}
          className="absolute inset-y-0 w-3 cursor-col-resize z-10 group"
          style={{ left: `calc(${startPercent}% - 6px)` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-accent group-hover:w-1 transition-all" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-6 bg-accent rounded-sm opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* End handle */}
        <div
          onPointerDown={handlePointerDown("end")}
          className="absolute inset-y-0 w-3 cursor-col-resize z-10 group"
          style={{ left: `calc(${endPercent}% - 6px)` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-accent group-hover:w-1 transition-all" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-6 bg-accent rounded-sm opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Playback cursor */}
        {isPlaying && (
          <div
            className="absolute inset-y-0 w-px bg-text-primary z-20 pointer-events-none"
            style={{ left: `${playPercent}%` }}
          />
        )}

        {/* Bookmark markers */}
        {bookmarks?.map((bm) => {
          const bmPercent = timeToPercent(bm.timestamp / 1000);
          return (
            <div
              key={bm.id}
              className="absolute top-0 w-px h-full bg-accent-secondary/60 pointer-events-none z-5"
              style={{ left: `${bmPercent}%` }}
              title={bm.label ?? `Bookmark at ${formatDuration(bm.timestamp)}`}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-accent-secondary rounded-full" />
            </div>
          );
        })}
      </div>

      {/* Time labels + play button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-8 h-8 bg-bg-elevated rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-text-primary" />
            ) : (
              <Play className="w-4 h-4 text-text-primary ml-0.5" />
            )}
          </button>
          <span className="text-xs text-text-tertiary font-mono tabular-nums">
            Preview trimmed region
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-text-secondary">
          <span>{trimStart.toFixed(1)}s</span>
          <span className="text-text-tertiary">-</span>
          <span>{trimEnd.toFixed(1)}s</span>
          <span className="text-text-tertiary ml-1">
            ({(trimEnd - trimStart).toFixed(1)}s)
          </span>
        </div>
      </div>
    </div>
  );
}
