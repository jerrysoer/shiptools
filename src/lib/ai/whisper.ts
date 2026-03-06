// Singleton Whisper pipeline
let pipeline: ReturnType<typeof Object> | null = null;
let loadingPromise: Promise<void> | null = null;

export interface TranscriptionSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

export type WhisperModel = "Xenova/whisper-tiny" | "Xenova/whisper-base";

export interface WhisperProgress {
  status: string;
  progress: number;
  text: string;
}

/**
 * Load the Whisper model for automatic speech recognition.
 *
 * Downloads the model on first call (~40 MB for tiny, ~140 MB for base).
 * Subsequent calls are no-ops unless the model was unloaded.
 */
export async function loadWhisper(
  model: WhisperModel = "Xenova/whisper-tiny",
  onProgress?: (progress: WhisperProgress) => void,
): Promise<void> {
  if (pipeline) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    const { pipeline: createPipeline } = await import("@xenova/transformers");
    pipeline = await createPipeline("automatic-speech-recognition", model, {
      progress_callback: (data: Record<string, unknown>) => {
        if (data.status === "progress") {
          onProgress?.({
            status: "downloading",
            progress: Math.round(data.progress as number),
            text: `Downloading model: ${Math.round(data.progress as number)}%`,
          });
        }
      },
    });
  })();

  try {
    await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    pipeline = null;
    throw err;
  }
  loadingPromise = null;
}

/**
 * Transcribe an audio Blob using the loaded Whisper model.
 *
 * The audio is decoded and resampled to 16 kHz mono (Whisper's expected input).
 * Returns the full text plus timestamped segments.
 */
export async function transcribe(
  audioBlob: Blob,
  onProgress?: (progress: WhisperProgress) => void,
): Promise<TranscriptionResult> {
  if (!pipeline) {
    throw new Error("Whisper not loaded. Call loadWhisper() first.");
  }

  onProgress?.({ status: "processing", progress: 0, text: "Decoding audio..." });

  // Decode the audio blob into raw PCM
  const arrayBuffer = await audioBlob.arrayBuffer();

  // Decode audio — use a regular AudioContext (more cross-browser compatible)
  const tempCtx = new AudioContext();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  await tempCtx.close();

  onProgress?.({ status: "processing", progress: 15, text: "Resampling to 16 kHz..." });

  // Resample to 16 kHz mono
  const targetSampleRate = 16000;
  const outputLength = Math.ceil(audioBuffer.duration * targetSampleRate);
  const offlineCtx = new OfflineAudioContext(1, outputLength, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const resampled = await offlineCtx.startRendering();
  const audioData = resampled.getChannelData(0);

  onProgress?.({ status: "processing", progress: 30, text: "Transcribing..." });

  // Run inference
  const result = await (pipeline as CallableFunction)(audioData, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  onProgress?.({ status: "complete", progress: 100, text: "Transcription complete" });

  const chunks: Array<{
    timestamp: [number, number] | null;
    text: string;
  }> = result.chunks ?? [];

  return {
    text: (result.text as string)?.trim() ?? "",
    segments: chunks.map((chunk) => ({
      start: chunk.timestamp?.[0] ?? 0,
      end: chunk.timestamp?.[1] ?? 0,
      text: chunk.text?.trim() ?? "",
    })),
    language: "en",
  };
}

/** Check if the Whisper model is currently loaded. */
export function isWhisperLoaded(): boolean {
  return pipeline !== null;
}

/** Unload the Whisper model from memory. */
export function unloadWhisper(): void {
  pipeline = null;
  loadingPromise = null;
}
