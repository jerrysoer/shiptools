"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Image, Download, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type InputMode = "image" | "emoji";

const SIZES = [16, 32, 48, 180, 192, 512] as const;
const ICO_SIZES = [16, 32, 48] as const;

interface FaviconResult {
  size: number;
  dataUrl: string;
  blob: Blob;
}

function renderToCanvas(
  source: HTMLImageElement | string,
  size: number
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    if (typeof source === "string") {
      // Emoji / text rendering
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.floor(size * 0.7)}px sans-serif`;
      ctx.fillText(source, size / 2, size / 2);
    } else {
      ctx.drawImage(source, 0, 0, size, size);
    }

    const dataUrl = canvas.toDataURL("image/png");
    canvas.toBlob((blob) => {
      resolve({ dataUrl, blob: blob! });
    }, "image/png");
  });
}

/** Build ICO file from multiple PNG blobs (ICO = header + directory entries + PNG data) */
async function buildIco(pngs: { size: number; blob: Blob }[]): Promise<Blob> {
  const buffers = await Promise.all(pngs.map((p) => p.blob.arrayBuffer()));

  // ICO header: 6 bytes
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * pngs.length;
  let dataOffset = headerSize + dirSize;

  const totalSize =
    headerSize + dirSize + buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const ico = new ArrayBuffer(totalSize);
  const view = new DataView(ico);

  // Header
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: 1 = ICO
  view.setUint16(4, pngs.length, true); // image count

  // Directory entries + image data
  for (let i = 0; i < pngs.length; i++) {
    const s = pngs[i].size;
    const imgSize = buffers[i].byteLength;
    const entryOffset = headerSize + i * dirEntrySize;

    view.setUint8(entryOffset, s < 256 ? s : 0); // width
    view.setUint8(entryOffset + 1, s < 256 ? s : 0); // height
    view.setUint8(entryOffset + 2, 0); // color palette
    view.setUint8(entryOffset + 3, 0); // reserved
    view.setUint16(entryOffset + 4, 1, true); // color planes
    view.setUint16(entryOffset + 6, 32, true); // bits per pixel
    view.setUint32(entryOffset + 8, imgSize, true); // image size
    view.setUint32(entryOffset + 12, dataOffset, true); // data offset

    new Uint8Array(ico, dataOffset, imgSize).set(new Uint8Array(buffers[i]));
    dataOffset += imgSize;
  }

  return new Blob([ico], { type: "image/x-icon" });
}

export default function FaviconGenerator() {
  const [mode, setMode] = useState<InputMode>("emoji");
  const [emoji, setEmoji] = useState("");
  const [results, setResults] = useState<FaviconResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "favicon" });
  }, []);

  const generate = useCallback(
    async (source: HTMLImageElement | string) => {
      setGenerating(true);
      const items: FaviconResult[] = [];
      for (const size of SIZES) {
        const { dataUrl, blob } = await renderToCanvas(source, size);
        items.push({ size, dataUrl, blob });
      }
      setResults(items);
      setGenerating(false);
      trackEvent("tool_used", { tool: "favicon" });
    },
    []
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        generate(img);
      };
      img.src = URL.createObjectURL(file);
    },
    [generate]
  );

  const handleEmojiGenerate = useCallback(() => {
    if (!emoji.trim()) return;
    generate(emoji.trim());
  }, [emoji, generate]);

  const downloadOne = useCallback((result: FaviconResult) => {
    const a = document.createElement("a");
    a.href = result.dataUrl;
    a.download = `favicon-${result.size}x${result.size}.png`;
    a.click();
  }, []);

  const downloadIco = useCallback(async () => {
    const icoPngs = results.filter((r) =>
      (ICO_SIZES as readonly number[]).includes(r.size)
    );
    if (icoPngs.length === 0) return;
    const ico = await buildIco(icoPngs);
    const url = URL.createObjectURL(ico);
    const a = document.createElement("a");
    a.href = url;
    a.download = "favicon.ico";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const downloadAll = useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const r of results) {
      zip.file(`favicon-${r.size}x${r.size}.png`, r.blob);
    }
    // Also include ICO
    const icoPngs = results.filter((r) =>
      (ICO_SIZES as readonly number[]).includes(r.size)
    );
    if (icoPngs.length > 0) {
      const ico = await buildIco(icoPngs);
      zip.file("favicon.ico", ico);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "favicons.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const handleCopyDataUrl = useCallback(
    async (idx: number) => {
      await navigator.clipboard.writeText(results[idx].dataUrl);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    },
    [results]
  );

  return (
    <div>
      <ToolPageHeader
        icon={Image}
        title="Favicon Generator"
        description="Generate favicons from an image or emoji at all standard sizes."
      />

      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-bg-surface border border-border mb-6 max-w-xs mx-auto">
        <button
          onClick={() => setMode("emoji")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "emoji"
              ? "bg-accent text-accent-fg"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Emoji / Text
        </button>
        <button
          onClick={() => setMode("image")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "image"
              ? "bg-accent text-accent-fg"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Upload Image
        </button>
      </div>

      {/* Input */}
      <div className="bg-bg-surface border border-border p-6 mb-6">
        {mode === "emoji" ? (
          <div className="flex gap-3">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="Type an emoji or character..."
              className="flex-1 bg-bg-elevated border border-border px-4 py-2.5 text-2xl text-center outline-none focus:border-accent"
              maxLength={4}
            />
            <button
              onClick={handleEmojiGenerate}
              disabled={!emoji.trim() || generating}
              className="px-6 py-2.5 bg-accent text-accent-fg font-medium hover:bg-accent/90 transition-colors disabled:opacity-40"
            >
              Generate
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border p-8 cursor-pointer hover:border-accent/50 transition-colors">
            <Image className="w-8 h-8 text-text-tertiary mb-2" />
            <span className="text-sm text-text-secondary">
              Click to upload an image
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Download All buttons */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={downloadAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-fg font-medium hover:bg-accent/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download All (ZIP)
            </button>
            <button
              onClick={downloadIco}
              className="flex items-center gap-2 px-5 py-2.5 border border-border text-text-secondary font-medium hover:bg-bg-elevated transition-colors"
            >
              <Download className="w-4 h-4" />
              Download .ico
            </button>
          </div>

          {/* Size previews */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {results.map((r, idx) => (
              <div
                key={r.size}
                className="bg-bg-surface border border-border p-4 flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 flex items-center justify-center bg-bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.dataUrl}
                    alt={`${r.size}x${r.size}`}
                    width={Math.min(r.size, 48)}
                    height={Math.min(r.size, 48)}
                    style={{ imageRendering: r.size <= 32 ? "pixelated" : "auto" }}
                  />
                </div>
                <span className="text-sm font-mono text-text-secondary">
                  {r.size}x{r.size}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => downloadOne(r)}
                    title="Download PNG"
                    className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                  <button
                    onClick={() => handleCopyDataUrl(idx)}
                    title="Copy data URL"
                    className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
                  >
                    {copiedIdx === idx ? (
                      <Check className="w-3.5 h-3.5 text-grade-a" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {generating && (
        <p className="text-center text-sm text-text-tertiary mt-6">
          Generating favicons...
        </p>
      )}
    </div>
  );
}
