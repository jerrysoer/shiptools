/**
 * Shared FFmpeg.wasm singleton.
 * Both AudioConverter and VideoConverter share one instance to avoid
 * downloading the ~32MB WASM binary twice.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ffmpegInstance: any = null;
let loadingPromise: Promise<unknown> | null = null;

export async function getFFmpeg(onProgress?: (p: number) => void) {
  if (ffmpegInstance) return ffmpegInstance;

  // Prevent concurrent loads — if another caller is loading, wait for it
  if (loadingPromise) {
    try {
      await loadingPromise;
    } catch {
      // Previous load failed — fall through to retry
    }
    if (ffmpegInstance) return ffmpegInstance;
  }

  loadingPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    onProgress?.(10);

    // Load from CDN via blob URLs (bypasses COEP restrictions)
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    onProgress?.(30);
    ffmpegInstance = ffmpeg;
  })();

  try {
    await loadingPromise;
  } catch (err) {
    // Reset so next caller can retry
    loadingPromise = null;
    ffmpegInstance = null;
    throw err;
  }
  loadingPromise = null;
  return ffmpegInstance;
}

export function isFFmpegLoaded(): boolean {
  return ffmpegInstance !== null;
}
