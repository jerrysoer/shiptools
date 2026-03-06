"use client";

import { useRef } from "react";
import { useLevelMeter } from "@/hooks/useWaveform";

interface LevelMeterProps {
  analyser: AnalyserNode | null;
  className?: string;
  height?: number;
}

export default function LevelMeter({
  analyser,
  className,
  height = 8,
}: LevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLevelMeter(analyser, canvasRef);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-full ${className ?? ""}`}
      height={height}
      style={{ height }}
    />
  );
}
