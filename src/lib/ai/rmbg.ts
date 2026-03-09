// Singleton pipeline for background removal using RMBG-1.4
// Uses @huggingface/transformers v3 background-removal pipeline
import type { BackgroundRemovalPipeline } from "@huggingface/transformers";

let pipe: BackgroundRemovalPipeline | null = null;
let loadingPromise: Promise<void> | null = null;

export interface RMBGProgress {
  status: string;
  progress: number;
  text: string;
}

export async function loadRMBG(
  onProgress?: (progress: RMBGProgress) => void,
): Promise<void> {
  if (pipe) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    onProgress?.({ status: "downloading", progress: 0, text: "Downloading background removal model..." });
    const { pipeline: createPipeline } = await import("@huggingface/transformers");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pipeline() union type is too complex for TS
    pipe = await (createPipeline as any)("background-removal", "briaai/RMBG-1.4", {
      device: "wasm",
      progress_callback: (data: { status: string; progress: number }) => {
        if (data.status === "progress") {
          const pct = Math.round(data.progress);
          onProgress?.({
            status: "downloading",
            progress: pct,
            text: `Downloading model: ${pct}%`,
          });
        }
      },
    }) as BackgroundRemovalPipeline;
  })();

  try {
    await loadingPromise;
    onProgress?.({ status: "ready", progress: 100, text: "Model ready" });
  } catch (err) {
    loadingPromise = null;
    pipe = null;
    throw err;
  }
  loadingPromise = null;
}

export async function removeBackground(imageBlob: Blob): Promise<Blob> {
  if (!pipe) throw new Error("RMBG not loaded. Call loadRMBG() first.");

  // Pipeline accepts Blob directly, returns RawImage[] with alpha channel applied
  const results = await pipe(imageBlob);
  const result = results[0];

  // RawImage.toBlob() converts to PNG with transparency
  return await result.toBlob("image/png");
}

export function isRMBGLoaded(): boolean {
  return pipe !== null;
}

export function unloadRMBG(): void {
  pipe = null;
  loadingPromise = null;
}
