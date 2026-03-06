"use client";

import { useEffect, useRef } from "react";
import { drawWaveform, drawLevelMeter } from "@/lib/recording/waveform";
import type { WaveformOptions } from "@/lib/recording/types";

/**
 * Connects AnalyserNode to a canvas ref with RAF loop for real-time visualization.
 *
 * Usage:
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   useWaveform(analyser, canvasRef, { color: "#4A7C59" });
 */
export function useWaveform(
  analyser: AnalyserNode | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: Partial<WaveformOptions>
) {
  const rafRef = useRef<number>(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let running = true;

    const animate = () => {
      if (!running) return;
      drawWaveform(analyser, canvas, optionsRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, canvasRef]);
}

/**
 * Level meter variant -- shows peak dB level.
 *
 * Usage:
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   useLevelMeter(analyser, canvasRef, { color: "#22c55e" });
 */
export function useLevelMeter(
  analyser: AnalyserNode | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: { color?: string; backgroundColor?: string }
) {
  const rafRef = useRef<number>(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    let running = true;

    const animate = () => {
      if (!running) return;
      drawLevelMeter(analyser, canvas, optionsRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, canvasRef]);
}
