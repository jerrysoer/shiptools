"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Trash2, Loader2, CircleCheck, Lock, Unlock, DownloadCloud } from "lucide-react";
import DropZone from "./DropZone";
import PrivacyBadge from "./PrivacyBadge";
import { useConverter } from "@/hooks/useConverter";
import { MAX_IMAGE_SIZE } from "@/lib/constants";
import type { ImageFormat } from "@/lib/types";

const OUTPUT_FORMATS: ImageFormat[] = ["webp", "png", "jpg", "avif"];
const ACCEPT = ".png,.jpg,.jpeg,.webp,.avif,.gif,.bmp,.tiff,.tif,.heic,.heif,.svg,image/*,image/svg+xml";

const RESIZE_PRESETS = [
  { label: "Original", w: 0, h: 0 },
  { label: "1920×1080", w: 1920, h: 1080 },
  { label: "1280×720", w: 1280, h: 720 },
  { label: "800×600", w: 800, h: 600 },
  { label: "400×400", w: 400, h: 400 },
  { label: "Custom", w: -1, h: -1 },
] as const;

function isHeic(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    ext === "heic" ||
    ext === "heif" ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

function isSvg(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "svg" || file.type === "image/svg+xml";
}

async function decodeHeic(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas failed"))),
        "image/jpeg",
        0.92
      )
    );
  } catch {
    // Not Safari — fall through to libheif-js
  }

  const libheif = (await import("libheif-js/wasm-bundle")).default;
  const decoder = new libheif.HeifDecoder();
  const buffer = await file.arrayBuffer();
  const images = decoder.decode(new Uint8Array(buffer));
  if (!images.length) throw new Error("No images found in HEIC file");

  const image = images[0];
  const w = image.get_width();
  const h = image.get_height();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(w, h);
  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData: ImageData | null) => {
      if (!displayData) reject(new Error("HEIC display error"));
      else resolve();
    });
  });
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas conversion failed"))),
      "image/jpeg",
      0.92
    )
  );
}

/**
 * Parse SVG to get its natural dimensions from viewBox or width/height attributes.
 */
function parseSvgDimensions(svgText: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return { width: 300, height: 150 };

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const w = parseFloat(svg.getAttribute("width") || "300");
  const h = parseFloat(svg.getAttribute("height") || "150");
  return { width: w || 300, height: h || 150 };
}

async function convertImage(
  file: File,
  outputFormat: string,
  options?: { quality?: number; width?: number; height?: number },
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  // SVG input: parse and render via Image + Canvas
  if (isSvg(file)) {
    const svgText = await file.text();
    const dims = parseSvgDimensions(svgText);
    onProgress?.(30);

    const targetW = options?.width || dims.width;
    const targetH = options?.height || dims.height;

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const img = new window.Image();
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, targetW, targetH);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to render SVG"));
      };
      img.src = url;
    });

    onProgress?.(70);

    const mimeType =
      outputFormat === "jpg" || outputFormat === "jpeg"
        ? "image/jpeg"
        : `image/${outputFormat}`;

    const quality =
      options?.quality && ["jpg", "jpeg", "webp", "avif"].includes(outputFormat)
        ? options.quality / 100
        : undefined;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            onProgress?.(100);
            resolve(blob);
          } else {
            reject(
              new Error(
                outputFormat === "avif"
                  ? "AVIF output is not supported in this browser. Try Chrome 94+ or Firefox 113+."
                  : "Canvas conversion failed"
              )
            );
          }
        },
        mimeType,
        quality
      );
    });
  }

  // HEIC input: decode first
  let inputBlob: Blob = file;
  if (isHeic(file)) {
    try {
      inputBlob = await decodeHeic(file);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null
            ? JSON.stringify(err)
            : String(err);
      throw new Error(`HEIC decode failed: ${msg}`);
    }
    onProgress?.(30);
  }

  onProgress?.(40);

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objUrl = URL.createObjectURL(inputBlob);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);

      let targetW = img.width;
      let targetH = img.height;

      if (options?.width || options?.height) {
        if (options.width && options.height) {
          targetW = options.width;
          targetH = options.height;
        } else if (options.width) {
          const scale = options.width / img.width;
          targetW = options.width;
          targetH = Math.round(img.height * scale);
        } else if (options.height) {
          const scale = options.height / img.height;
          targetW = Math.round(img.width * scale);
          targetH = options.height;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, targetW, targetH);
      onProgress?.(70);

      const mimeType =
        outputFormat === "jpg" || outputFormat === "jpeg"
          ? "image/jpeg"
          : `image/${outputFormat}`;

      const quality =
        options?.quality && ["jpg", "jpeg", "webp", "avif"].includes(outputFormat)
          ? options.quality / 100
          : undefined;

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            onProgress?.(100);
            resolve(blob);
          } else {
            reject(
              new Error(
                outputFormat === "avif"
                  ? "AVIF output is not supported in this browser. Try Chrome 94+ or Firefox 113+."
                  : "Canvas conversion failed"
              )
            );
          }
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objUrl;
  });
}

export default function ImageConverter() {
  const [outputFormat, setOutputFormat] = useState<ImageFormat>("webp");
  const [quality, setQuality] = useState(80);
  const [resizePreset, setResizePreset] = useState("Original");
  const [customWidth, setCustomWidth] = useState<number | "">("");
  const [customHeight, setCustomHeight] = useState<number | "">("");
  const [aspectLock, setAspectLock] = useState(true);
  const aspectRatio = useRef<number>(1);

  const {
    jobs, addFiles, processAll, downloadResult, removeJob, clearJobs,
    pendingCount, doneCount, processingCount, isBatchComplete, downloadAll,
  } = useConverter(convertImage);

  const getResizeDimensions = useCallback((): { width?: number; height?: number } => {
    if (resizePreset === "Original") return {};
    if (resizePreset === "Custom") {
      return {
        width: typeof customWidth === "number" ? customWidth : undefined,
        height: typeof customHeight === "number" ? customHeight : undefined,
      };
    }
    const preset = RESIZE_PRESETS.find((p) => p.label === resizePreset);
    if (preset && preset.w > 0) return { width: preset.w, height: preset.h };
    return {};
  }, [resizePreset, customWidth, customHeight]);

  const handleFiles = useCallback(
    (files: File[]) => {
      // Detect aspect ratio from first file for custom resize
      if (files[0]) {
        const img = new window.Image();
        const objUrl = URL.createObjectURL(files[0]);
        img.onload = () => {
          aspectRatio.current = img.width / img.height;
          URL.revokeObjectURL(objUrl);
        };
        img.onerror = () => URL.revokeObjectURL(objUrl);
        img.src = objUrl;
      }

      const dims = getResizeDimensions();
      addFiles(files, outputFormat, { quality, ...dims });
    },
    [addFiles, outputFormat, quality, getResizeDimensions]
  );

  const handleCustomWidth = (val: string) => {
    const w = val === "" ? "" : Math.max(1, parseInt(val) || 1);
    setCustomWidth(w);
    if (aspectLock && typeof w === "number" && aspectRatio.current > 0) {
      setCustomHeight(Math.round(w / aspectRatio.current));
    }
  };

  const handleCustomHeight = (val: string) => {
    const h = val === "" ? "" : Math.max(1, parseInt(val) || 1);
    setCustomHeight(h);
    if (aspectLock && typeof h === "number" && aspectRatio.current > 0) {
      setCustomWidth(Math.round(h * aspectRatio.current));
    }
  };

  const totalActive = pendingCount + processingCount + doneCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PrivacyBadge />
        {jobs.length > 0 && (
          <button
            onClick={clearJobs}
            className="text-text-tertiary hover:text-text-primary text-xs transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-text-secondary text-xs block mb-1">Output format</label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as ImageFormat)}
            className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {["jpg", "webp", "avif"].includes(outputFormat) && (
          <div>
            <label className="text-text-secondary text-xs block mb-1">
              Quality: {quality}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-32"
            />
          </div>
        )}

        <div>
          <label className="text-text-secondary text-xs block mb-1">Resize</label>
          <select
            value={resizePreset}
            onChange={(e) => setResizePreset(e.target.value)}
            className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            {RESIZE_PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {resizePreset === "Custom" && (
          <div className="flex items-end gap-2">
            <div>
              <label className="text-text-secondary text-xs block mb-1">Width</label>
              <input
                type="number"
                min={1}
                value={customWidth}
                onChange={(e) => handleCustomWidth(e.target.value)}
                placeholder="px"
                className="w-20 bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <button
              onClick={() => setAspectLock(!aspectLock)}
              className={`p-2 rounded-lg border transition-colors ${
                aspectLock
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-text-tertiary hover:text-text-primary"
              }`}
              title={aspectLock ? "Aspect ratio locked" : "Aspect ratio unlocked"}
            >
              {aspectLock ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            <div>
              <label className="text-text-secondary text-xs block mb-1">Height</label>
              <input
                type="number"
                min={1}
                value={customHeight}
                onChange={(e) => handleCustomHeight(e.target.value)}
                placeholder="px"
                className="w-20 bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
              />
            </div>
          </div>
        )}
      </div>

      <DropZone
        accept={ACCEPT}
        maxSize={MAX_IMAGE_SIZE}
        onFiles={handleFiles}
        label="Drop images here or click to browse"
      />

      {/* Batch progress bar */}
      {processingCount > 0 && totalActive > 1 && (
        <div className="space-y-1.5 fade-in">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Converting {doneCount + 1} of {totalActive}...</span>
            <span>{Math.round(((doneCount) / totalActive) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(2, (doneCount / totalActive) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch completion banner */}
      {isBatchComplete && doneCount > 1 && (
        <div className="flex items-center justify-between bg-grade-a/10 border border-grade-a/25 rounded-xl px-4 py-3 fade-in">
          <div className="flex items-center gap-2">
            <CircleCheck className="w-4 h-4 text-grade-a done-check" />
            <span className="text-sm text-grade-a font-medium">
              All {doneCount} files converted
            </span>
          </div>
          <button
            onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-grade-a/15 hover:bg-grade-a/25 text-grade-a rounded-lg text-xs font-medium transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            Download All
          </button>
        </div>
      )}

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                job.status === "done"
                  ? "bg-grade-a/5 border border-grade-a/25 border-l-2 border-l-grade-a"
                  : job.status === "error"
                    ? "bg-grade-f/5 border border-grade-f/25 border-l-2 border-l-grade-f"
                    : "bg-bg-surface border border-border"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{job.file.name}</p>
                <p className="text-xs text-text-tertiary">
                  {job.inputFormat.toUpperCase()} → {job.outputFormat.toUpperCase()}
                  {job.status === "processing" && ` · ${job.progress}%`}
                  {job.status === "done" && job.result && (
                    <span className="text-grade-a"> · Done · {(job.result.size / 1024).toFixed(0)} KB</span>
                  )}
                  {job.status === "error" && (
                    <span className="text-grade-f"> · {job.error}</span>
                  )}
                </p>
              </div>

              {job.status === "processing" && (
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
              )}
              {job.status === "done" && (
                <>
                  <CircleCheck className="w-4 h-4 text-grade-a shrink-0 done-check" />
                  <button
                    onClick={() => downloadResult(job)}
                    className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-grade-a"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => removeJob(job.id)}
                className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-tertiary"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {pendingCount > 0 && (
            <button
              onClick={processAll}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Convert {pendingCount} file{pendingCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
