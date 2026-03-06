"use client";

import { useRef, useEffect } from "react";
import { useWaveform } from "@/hooks/useWaveform";
import type { WaveformStyle } from "@/lib/recording/types";

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  style?: WaveformStyle;
  color?: string;
  backgroundColor?: string;
  className?: string;
  height?: number;
}

export default function WaveformVisualizer({
  analyser,
  style = "bars",
  color,
  backgroundColor,
  className,
  height = 120,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useWaveform(analyser, canvasRef, { style, color, backgroundColor });

  // Sync canvas width to container width for crisp rendering
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const width = entry.contentRect.width;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={containerRef} className={`w-full ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        height={height}
        style={{ height }}
      />
    </div>
  );
}
