"use client";

import type { RefObject } from "react";
import type { PipPosition, PipSize } from "./WebcamPreview";

interface PlaybackWebcamOverlayProps {
  webcamUrl: string;
  webcamRef: RefObject<HTMLVideoElement | null>;
  position: PipPosition;
  size: PipSize;
  onPositionChange: (position: PipPosition) => void;
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

export default function PlaybackWebcamOverlay({
  webcamUrl,
  webcamRef,
  position,
  size,
  onPositionChange,
}: PlaybackWebcamOverlayProps) {
  return (
    <div
      className={`absolute ${POSITION_MAP[position]} ${SIZE_MAP[size]} z-10 transition-all duration-300`}
    >
      <button
        type="button"
        onClick={() => onPositionChange(NEXT_POSITION[position])}
        className="relative w-full h-full overflow-hidden rounded-full border-2 border-white/80 shadow-lg shadow-black/30 cursor-pointer hover:border-white transition-colors group"
        title="Click to reposition webcam"
      >
        <video
          ref={webcamRef}
          src={webcamUrl}
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </button>
    </div>
  );
}
