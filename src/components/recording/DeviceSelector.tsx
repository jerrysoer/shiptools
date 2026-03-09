"use client";

import { Mic, Camera, RefreshCw } from "lucide-react";
import type { AudioDevice, VideoDevice } from "@/lib/recording/types";

interface DeviceSelectorProps {
  type: "audio" | "video";
  devices: AudioDevice[] | VideoDevice[];
  selectedDeviceId: string;
  onSelect: (deviceId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export default function DeviceSelector({
  type,
  devices,
  selectedDeviceId,
  onSelect,
  onRefresh,
  className,
}: DeviceSelectorProps) {
  const Icon = type === "audio" ? Mic : Camera;
  const fallbackPrefix = type === "audio" ? "Microphone" : "Camera";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Icon className="w-4 h-4 text-text-tertiary shrink-0" />
      <select
        value={selectedDeviceId}
        onChange={(e) => onSelect(e.target.value)}
        className="flex-1 min-w-0 border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors truncate"
      >
        {devices.length === 0 && (
          <option value="" disabled>
            No {type === "audio" ? "microphones" : "cameras"} found
          </option>
        )}
        {devices.map((device, i) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `${fallbackPrefix} ${i + 1}`}
          </option>
        ))}
      </select>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated transition-colors"
          title="Refresh device list"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
