// Singleton ONNX session for LaMa inpainting (watermark removal)
// Uses onnxruntime-web with the opencv/inpainting_lama model (92.6 MB)

import { LAMA_MODEL_URL } from "@/lib/constants";

type InferenceSession = import("onnxruntime-web").InferenceSession;

let session: InferenceSession | null = null;
let loadingPromise: Promise<void> | null = null;

export interface LaMaProgress {
  status: string;
  progress: number;
  text: string;
}

export async function loadLaMa(
  onProgress?: (progress: LaMaProgress) => void,
): Promise<void> {
  if (session) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    onProgress?.({ status: "downloading", progress: 0, text: "Downloading inpainting model..." });

    const ort = await import("onnxruntime-web");

    // Use WASM backend — most compatible
    ort.env.wasm.numThreads = 1;

    onProgress?.({ status: "downloading", progress: 10, text: "Fetching LaMa model (~93 MB)..." });

    // Fetch model with progress tracking
    const response = await fetch(LAMA_MODEL_URL);
    if (!response.ok) throw new Error(`Failed to fetch LaMa model: ${response.status}`);

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Failed to read model response");

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;

      if (total > 0) {
        // Map download progress to 10-90% range
        const pct = Math.round(10 + (loaded / total) * 80);
        onProgress?.({
          status: "downloading",
          progress: pct,
          text: `Downloading model: ${Math.round((loaded / 1024 / 1024))}/${Math.round(total / 1024 / 1024)} MB`,
        });
      }
    }

    // Concatenate chunks into single ArrayBuffer
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const modelBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      modelBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    onProgress?.({ status: "loading", progress: 92, text: "Initializing model..." });

    session = await ort.InferenceSession.create(modelBuffer.buffer, {
      executionProviders: ["wasm"],
    });

    onProgress?.({ status: "ready", progress: 100, text: "Model ready" });
  })();

  try {
    await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    session = null;
    throw err;
  }
  loadingPromise = null;
}

/**
 * Run LaMa inpainting: fill masked regions of the image.
 * @param image  Original image as Blob
 * @param mask   Mask as Blob (white = areas to inpaint, black = keep)
 * @returns      Inpainted image as PNG Blob
 */
export async function inpaint(image: Blob, mask: Blob): Promise<Blob> {
  if (!session) throw new Error("LaMa not loaded. Call loadLaMa() first.");

  const ort = await import("onnxruntime-web");
  const SIZE = 512; // LaMa fixed input size

  // Load image and mask as ImageData
  const [imgData, maskData, origDims] = await Promise.all([
    blobToImageData(image, SIZE, SIZE),
    blobToImageData(mask, SIZE, SIZE),
    getImageDimensions(image),
  ]);

  // Build image tensor: [1, 3, 512, 512] normalized to [0, 1]
  const imgFloat = new Float32Array(1 * 3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    imgFloat[i] = imgData.data[i * 4] / 255;                   // R
    imgFloat[SIZE * SIZE + i] = imgData.data[i * 4 + 1] / 255; // G
    imgFloat[2 * SIZE * SIZE + i] = imgData.data[i * 4 + 2] / 255; // B
  }

  // Build mask tensor: [1, 1, 512, 512] binary (threshold at 128)
  const maskFloat = new Float32Array(1 * 1 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    // White in mask = inpaint (1.0), black = keep (0.0)
    maskFloat[i] = maskData.data[i * 4] > 128 ? 1.0 : 0.0;
  }

  const imgTensor = new ort.Tensor("float32", imgFloat, [1, 3, SIZE, SIZE]);
  const maskTensor = new ort.Tensor("float32", maskFloat, [1, 1, SIZE, SIZE]);

  // Run inference
  const results = await session.run({ image: imgTensor, mask: maskTensor });

  // Extract output tensor — LaMa outputs [1, 3, 512, 512] in [0, 1]
  const outputKey = session.outputNames[0];
  const output = results[outputKey];
  const outputData = output.data as Float32Array;

  // Convert output tensor to ImageData
  const outImgData = new ImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    outImgData.data[i * 4] = Math.round(Math.min(1, Math.max(0, outputData[i])) * 255);                         // R
    outImgData.data[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, outputData[SIZE * SIZE + i])) * 255);       // G
    outImgData.data[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, outputData[2 * SIZE * SIZE + i])) * 255);   // B
    outImgData.data[i * 4 + 3] = 255; // fully opaque
  }

  // Resize back to original dimensions and return as Blob
  return imageDataToBlob(outImgData, origDims.width, origDims.height);
}

export function isLaMaLoaded(): boolean {
  return session !== null;
}

export function unloadLaMa(): void {
  session = null;
  loadingPromise = null;
}

// ── Helpers ───────────────────────────────────────────────────────

function blobToImageData(blob: Blob, width: number, height: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { reject(new Error("Failed to load image")); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(blob);
  });
}

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { reject(new Error("Failed to load image")); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(blob);
  });
}

function imageDataToBlob(data: ImageData, targetWidth: number, targetHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // First draw the 512x512 output
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = data.width;
    srcCanvas.height = data.height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) { reject(new Error("Canvas 2D context unavailable")); return; }
    srcCtx.putImageData(data, 0, 0);

    // Then resize to original dimensions
    const outCanvas = document.createElement("canvas");
    outCanvas.width = targetWidth;
    outCanvas.height = targetHeight;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) { reject(new Error("Canvas 2D context unavailable")); return; }
    outCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

    outCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create output blob"));
    }, "image/png");
  });
}
