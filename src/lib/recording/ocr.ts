let worker: ReturnType<typeof Object> | null = null;
let loadingPromise: Promise<void> | null = null;

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

/**
 * Load the Tesseract.js OCR worker.
 *
 * Downloads language data (~15 MB for English) on first call. Subsequent
 * calls are no-ops unless the worker was unloaded.
 */
export async function loadOCR(
  onProgress?: (progress: { status: string; progress: number }) => void,
): Promise<void> {
  if (worker) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    const Tesseract = await import("tesseract.js");
    worker = await Tesseract.createWorker("eng", undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") {
          onProgress?.({
            status: "recognizing",
            progress: Math.round(m.progress * 100),
          });
        }
      },
    });
  })();

  try {
    await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    worker = null;
    throw err;
  }
  loadingPromise = null;
}

/**
 * Recognize text from an image source.
 *
 * Accepts an HTMLCanvasElement, Blob, or data URL string.
 */
export async function recognizeText(
  image: HTMLCanvasElement | Blob | string,
): Promise<OCRResult> {
  if (!worker) {
    throw new Error("OCR not loaded. Call loadOCR() first.");
  }

  const typedWorker = worker as {
    recognize: (
      image: HTMLCanvasElement | Blob | string,
      options?: Record<string, unknown>,
      output?: { text?: boolean; blocks?: boolean },
    ) => Promise<{
      data: {
        text: string;
        confidence: number;
        blocks: Array<{
          paragraphs: Array<{
            lines: Array<{
              words: Array<{
                text: string;
                confidence: number;
                bbox: { x0: number; y0: number; x1: number; y1: number };
              }>;
            }>;
          }>;
        }> | null;
      };
    }>;
  };

  const { data } = await typedWorker.recognize(image, {}, { text: true, blocks: true });

  // Flatten words from the nested block structure (Tesseract.js v7)
  const words: OCRResult["words"] = [];
  if (data.blocks) {
    for (const block of data.blocks) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const w of line.words) {
            words.push({
              text: w.text,
              confidence: w.confidence,
              bbox: w.bbox,
            });
          }
        }
      }
    }
  }

  return {
    text: data.text,
    confidence: data.confidence,
    words,
  };
}

/** Check if the OCR worker is currently loaded. */
export function isOCRLoaded(): boolean {
  return worker !== null;
}

/** Terminate the OCR worker and free memory. */
export async function unloadOCR(): Promise<void> {
  if (worker) {
    const typedWorker = worker as { terminate: () => Promise<void> };
    await typedWorker.terminate();
    worker = null;
  }
  loadingPromise = null;
}
