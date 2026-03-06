"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Palette, Copy, Check, Upload } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

// ── Simplified k-means color clustering ─────────────────
interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbToHex({ r, g, b }: RGB): string {
  return (
    "#" +
    [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")
  );
}

function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function kMeans(pixels: RGB[], k: number, maxIter = 20): RGB[] {
  if (pixels.length === 0) return [];

  // Initialize centroids using evenly-spaced sample
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids: RGB[] = Array.from({ length: k }, (_, i) => ({
    ...pixels[Math.min(i * step, pixels.length - 1)],
  }));

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign pixels to nearest centroid
    const clusters: RGB[][] = Array.from({ length: k }, () => []);

    for (const px of pixels) {
      let minDist = Infinity;
      let nearest = 0;
      for (let c = 0; c < k; c++) {
        const d = colorDistance(px, centroids[c]);
        if (d < minDist) {
          minDist = d;
          nearest = c;
        }
      }
      clusters[nearest].push(px);
    }

    // Recompute centroids
    let converged = true;
    const newCentroids: RGB[] = centroids.map((old, c) => {
      const cluster = clusters[c];
      if (cluster.length === 0) return old;

      const avg: RGB = {
        r: cluster.reduce((s, p) => s + p.r, 0) / cluster.length,
        g: cluster.reduce((s, p) => s + p.g, 0) / cluster.length,
        b: cluster.reduce((s, p) => s + p.b, 0) / cluster.length,
      };

      if (colorDistance(avg, old) > 1) converged = false;
      return avg;
    });

    centroids = newCentroids;
    if (converged) break;
  }

  // Sort by brightness (dark to light)
  centroids.sort(
    (a, b) => a.r * 0.299 + a.g * 0.587 + a.b * 0.114 - (b.r * 0.299 + b.g * 0.587 + b.b * 0.114)
  );

  return centroids;
}

function extractPixels(canvas: HTMLCanvasElement): RGB[] {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const pixels: RGB[] = [];

  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue; // Skip transparent
    pixels.push({ r, g, b });
  }

  return pixels;
}

interface PaletteColor {
  hex: string;
  rgb: RGB;
}

export default function ColorPalette() {
  const [colors, setColors] = useState<PaletteColor[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [count, setCount] = useState(6);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "palette" });
  }, []);

  const processImage = useCallback(
    (img: HTMLImageElement) => {
      setProcessing(true);
      const canvas = canvasRef.current!;

      // Downsample large images for speed
      const maxDim = 200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pixels = extractPixels(canvas);
      const centroids = kMeans(pixels, count);

      setColors(
        centroids.map((c) => ({
          hex: rgbToHex(c),
          rgb: { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) },
        }))
      );
      setProcessing(false);
      trackEvent("tool_used", { tool: "palette" });
    },
    [count]
  );

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      setImageSrc(url);

      const img = new window.Image();
      img.onload = () => processImage(img);
      img.src = url;
    },
    [processImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const url = URL.createObjectURL(file);
      setImageSrc(url);

      const img = new window.Image();
      img.onload = () => processImage(img);
      img.src = url;
    },
    [processImage]
  );

  const handleCopy = useCallback(
    async (idx: number, text: string) => {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    },
    []
  );

  return (
    <div>
      <ToolPageHeader
        icon={Palette}
        title="Color Palette from Image"
        description="Extract dominant colors from any image using k-means clustering."
      />

      {/* Hidden canvas for pixel extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Color count selector */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <label className="text-sm text-text-secondary">Colors:</label>
        <div className="flex gap-1 p-1 bg-bg-surface border border-border rounded-lg">
          {[5, 6, 7, 8].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                count === n
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <label
        className="flex flex-col items-center justify-center bg-bg-surface border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-accent/50 transition-colors mb-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-text-tertiary mb-2" />
        <span className="text-sm text-text-secondary">
          Drop an image or click to upload
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {processing && (
        <p className="text-center text-sm text-text-tertiary mb-6">
          Extracting colors...
        </p>
      )}

      {/* Results */}
      {colors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source image */}
          {imageSrc && (
            <div className="bg-bg-surface border border-border rounded-xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Source"
                className="w-full rounded-lg object-contain max-h-[300px]"
              />
            </div>
          )}

          {/* Palette */}
          <div className="space-y-2">
            {colors.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-bg-surface border border-border rounded-xl p-3"
              >
                <div
                  className="w-12 h-12 rounded-lg shrink-0 border border-border"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-text-primary">
                    {c.hex.toUpperCase()}
                  </p>
                  <p className="font-mono text-xs text-text-tertiary">
                    rgb({c.rgb.r}, {c.rgb.g}, {c.rgb.b})
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(idx, c.hex)}
                  title="Copy hex"
                  className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
                >
                  {copiedIdx === idx ? (
                    <Check className="w-3.5 h-3.5 text-grade-a" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                  )}
                </button>
              </div>
            ))}

            {/* Full palette bar */}
            <div className="flex rounded-xl overflow-hidden h-12 border border-border mt-3">
              {colors.map((c, idx) => (
                <div
                  key={idx}
                  className="flex-1"
                  style={{ backgroundColor: c.hex }}
                  title={c.hex}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
