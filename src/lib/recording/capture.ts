export interface MicrophoneOptions {
  deviceId?: string;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
}

/**
 * Capture audio from a microphone.
 */
export async function captureMicrophone(
  options: MicrophoneOptions = {},
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      ...(options.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
      noiseSuppression: options.noiseSuppression ?? true,
      echoCancellation: options.echoCancellation ?? true,
      autoGainControl: options.autoGainControl ?? true,
      ...(options.sampleRate ? { sampleRate: options.sampleRate } : {}),
    },
  };

  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Capture system audio via getDisplayMedia.
 *
 * The user will see a screen/tab share dialog. The video track is removed,
 * leaving an audio-only MediaStream. Throws if the user cancels or if no
 * audio track is available.
 */
export async function captureSystemAudio(): Promise<MediaStream> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true, // video required by most browsers to show the picker
  });

  // Remove video tracks — we only want audio
  for (const track of displayStream.getVideoTracks()) {
    track.stop();
    displayStream.removeTrack(track);
  }

  if (displayStream.getAudioTracks().length === 0) {
    throw new Error(
      "No system audio track available. The user may have deselected audio sharing.",
    );
  }

  return displayStream;
}

/**
 * Capture the screen (or a specific window/tab) with optional audio.
 */
export async function captureScreen(
  options: { audio?: boolean; video?: boolean } = {},
): Promise<MediaStream> {
  const { audio = false, video = true } = options;

  return navigator.mediaDevices.getDisplayMedia({
    audio,
    video,
  });
}

/**
 * Capture video from a camera.
 *
 * Defaults to rear camera ("environment") for document scanning.
 * Pass facingMode: "user" for selfie/webcam.
 */
export async function captureCamera(options?: {
  deviceId?: string;
  facingMode?: "user" | "environment";
}): Promise<MediaStream> {
  const videoConstraints: MediaTrackConstraints = options?.deviceId
    ? { deviceId: { exact: options.deviceId } }
    : { facingMode: options?.facingMode ?? "environment" };

  return navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
  });
}

/**
 * Stop every track on the given stream.
 */
export function stopAllTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
