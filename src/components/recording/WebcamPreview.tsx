"use client";

import { useRef, useEffect } from "react";

type PipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type PipSize = "small" | "medium" | "large";
type PipShape = "circle" | "rounded";

interface WebcamPreviewProps {
  stream: MediaStream | null;
  position?: PipPosition;
  size?: PipSize;
  shape?: PipShape;
  onPositionChange?: (position: PipPosition) => void;
  className?: string;
}

const SIZE_MAP: Record<PipSize, string> = {
  small: "w-24 h-24",
  medium: "w-36 h-36",
  large: "w-48 h-48",
};

const POSITION_MAP: Record<PipPosition, string> = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
};

const NEXT_POSITION: Record<PipPosition, PipPosition> = {
  "top-left": "top-right",
  "top-right": "bottom-right",
  "bottom-right": "bottom-left",
  "bottom-left": "top-left",
};

export default function WebcamPreview({
  stream,
  position = "bottom-right",
  size = "medium",
  shape = "circle",
  onPositionChange,
  className,
}: WebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
    } else {
      video.srcObject = null;
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  if (!stream) return null;

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div
      className={`absolute ${POSITION_MAP[position]} ${SIZE_MAP[size]} z-10 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => onPositionChange?.(NEXT_POSITION[position])}
        className={`relative w-full h-full overflow-hidden ${shapeClass} border-2 border-white/80 shadow-lg shadow-black/30 cursor-pointer hover:border-white transition-colors group`}
        title="Click to reposition"
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </button>
    </div>
  );
}

export type { PipPosition, PipSize, PipShape };
