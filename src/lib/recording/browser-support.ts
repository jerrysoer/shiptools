export interface BrowserCapabilities {
  getUserMedia: boolean;
  getDisplayMedia: boolean;
  mediaRecorder: boolean;
  audioContext: boolean;
  sharedArrayBuffer: boolean;
  supportedAudioMimeTypes: string[];
  supportedVideoMimeTypes: string[];
}

const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

const VIDEO_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
] as const;

function probeSupportedMimeTypes(candidates: readonly string[]): string[] {
  if (typeof MediaRecorder === "undefined") return [];
  return candidates.filter((type) => MediaRecorder.isTypeSupported(type));
}

export function detectCapabilities(): BrowserCapabilities {
  const hasNavigator = typeof navigator !== "undefined";
  const hasMediaDevices = hasNavigator && !!navigator.mediaDevices;

  return {
    getUserMedia: hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === "function",
    getDisplayMedia: hasMediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function",
    mediaRecorder: typeof MediaRecorder !== "undefined",
    audioContext: typeof AudioContext !== "undefined" || typeof (globalThis as Record<string, unknown>).webkitAudioContext !== "undefined",
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    supportedAudioMimeTypes: probeSupportedMimeTypes(AUDIO_MIME_TYPES),
    supportedVideoMimeTypes: probeSupportedMimeTypes(VIDEO_MIME_TYPES),
  };
}

export function getBestAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";

  for (const type of AUDIO_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  // Fallback — will likely fail at record time but avoids throwing here
  return "audio/webm";
}

export function getBestVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";

  for (const type of VIDEO_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  return "video/webm";
}

export function isRecordingSupported(): boolean {
  const caps = detectCapabilities();
  return caps.getUserMedia && caps.mediaRecorder;
}
