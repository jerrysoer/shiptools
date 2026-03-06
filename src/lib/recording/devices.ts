import type { AudioDevice, VideoDevice } from "./types";

/**
 * Enumerate audio input devices (microphones).
 *
 * Before permission is granted, device labels are empty strings.
 * Call `requestMicrophonePermission()` first if you need labels.
 */
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${i + 1}`,
      groupId: d.groupId,
    }));
}

/**
 * Enumerate video input devices (cameras).
 *
 * Before permission is granted, device labels are empty strings.
 */
export async function getVideoInputDevices(): Promise<VideoDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `Camera ${i + 1}`,
      groupId: d.groupId,
    }));
}

/**
 * Request microphone permission by briefly opening and closing an audio stream.
 *
 * Returns `true` if permission was granted, `false` otherwise.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}
