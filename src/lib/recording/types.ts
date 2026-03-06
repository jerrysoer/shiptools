export type RecordingState =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "processing";

export interface CaptureSource {
  type: "microphone" | "system-audio" | "screen" | "camera";
  stream: MediaStream;
  label: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface VideoDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface Bookmark {
  id: string;
  timestamp: number; // ms from recording start
  label?: string;
}

export interface RecordingResult {
  blob: Blob;
  duration: number; // ms
  mimeType: string;
  bookmarks: Bookmark[];
}

export type WaveformStyle = "bars" | "wave" | "mirrored" | "circular";

export interface WaveformOptions {
  style: WaveformStyle;
  barWidth?: number;
  barGap?: number;
  color?: string;
  backgroundColor?: string;
  mirror?: boolean;
}

export interface TrimRange {
  start: number; // seconds
  end: number; // seconds
}

export interface ExportOptions {
  format: "mp3" | "wav" | "ogg" | "webm" | "mp4" | "gif";
  bitrate?: number;
  sampleRate?: number;
  trim?: TrimRange;
}
