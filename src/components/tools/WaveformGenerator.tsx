"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, Palette, Type, Music } from "lucide-react";
import { generateWaveformFromAudio } from "@/lib/recording/waveform";
import type { WaveformStyle } from "@/lib/recording/types";
import ToolPageHeader from "./ToolPageHeader";

const WAVEFORM_STYLES: Array<{ id: WaveformStyle; label: string }> = [
  { id: "bars", label: "Bars" },
  { id: "wave", label: "Wave" },
  { id: "mirrored", label: "Mirrored" },
  { id: "circular", label: "Circular" },
];

const PRESET_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#8b5cf6",
  "#f43f5e",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#ec4899",
];

const PRESET_BG_COLORS = [
  "transparent",
  "#000000",
  "#111827",
  "#1e293b",
  "#ffffff",
  "#f3f4f6",
  "#fef3c7",
  "#ecfdf5",
];

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export default function WaveformGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [style, setStyle] = useState<WaveformStyle>("bars");
  const [waveColor, setWaveColor] = useState("#4f46e5");
  const [bgColor, setBgColor] = useState("#111827");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const renderWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const audioBuffer = audioBufferRef.current;
    if (!canvas || !audioBuffer) return;

    // Set canvas size for export quality
    canvas.width = 1200;
    canvas.height = 400;

    generateWaveformFromAudio(audioBuffer, canvas, {
      style,
      color: waveColor,
      backgroundColor: bgColor === "transparent" ? "transparent" : bgColor,
      barWidth: 3,
      barGap: 1,
    });

    // Render text overlays
    const ctx = canvas.getContext("2d");
    if (ctx && (title || artist)) {
      ctx.textAlign = "center";

      if (title) {
        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = waveColor;
        ctx.fillText(title, canvas.width / 2, 50);
      }

      if (artist) {
        ctx.font = "16px sans-serif";
        ctx.fillStyle = waveColor;
        ctx.globalAlpha = 0.7;
        ctx.fillText(artist, canvas.width / 2, title ? 80 : 50);
        ctx.globalAlpha = 1;
      }
    }
  }, [style, waveColor, bgColor, title, artist]);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      setIsLoading(true);
      setFileName(file.name);
      setIsReady(false);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        await audioCtx.close();

        audioBufferRef.current = audioBuffer;
        setIsReady(true);

        // Auto-render
        requestAnimationFrame(() => {
          renderWaveform();
        });
      } catch (err) {
        console.error("Failed to decode audio:", err);
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [renderWaveform],
  );

  // Re-render when settings change
  const handleSettingChange = useCallback(
    <T,>(setter: (v: T) => void) =>
      (value: T) => {
        setter(value);
        // Schedule re-render after state update
        requestAnimationFrame(() => {
          const canvas = canvasRef.current;
          const audioBuffer = audioBufferRef.current;
          if (canvas && audioBuffer) {
            canvas.width = 1200;
            canvas.height = 400;
            generateWaveformFromAudio(audioBuffer, canvas, {
              style,
              color: waveColor,
              backgroundColor:
                bgColor === "transparent" ? "transparent" : bgColor,
              barWidth: 3,
              barGap: 1,
            });
          }
        });
      },
    [style, waveColor, bgColor],
  );

  // Re-render whenever any setting changes
  const triggerRender = useCallback(() => {
    requestAnimationFrame(renderWaveform);
  }, [renderWaveform]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safeName = fileName?.replace(/\.[^.]+$/, "") ?? "waveform";
    downloadCanvas(canvas, `${safeName}-waveform.png`);
  }, [fileName]);

  return (
    <div>
      <ToolPageHeader
        icon={Music}
        title="Audio Waveform Generator"
        description="Generate beautiful waveform visualizations from audio files. Export as PNG."
      />

      {/* Upload zone */}
      {!isReady && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          className="border-2 border-dashed p-8 text-center cursor-pointer transition-all border-border hover:border-border-hover hover:bg-bg-surface/50"
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary text-sm">
            {isLoading
              ? "Decoding audio..."
              : "Drop an audio file here or click to browse"}
          </p>
          <p className="text-text-tertiary text-xs mt-1">
            MP3, WAV, OGG, M4A, FLAC, WebM
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Waveform preview + controls */}
      {isReady && (
        <div className="space-y-6">
          {/* Preview canvas */}
          <div className="bg-bg-surface border border-border p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-text-secondary truncate">
                {fileName}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsReady(false);
                  setFileName(null);
                  audioBufferRef.current = null;
                }}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Change file
              </button>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: 200, aspectRatio: "3/1" }}
            />
          </div>

          {/* Style selector */}
          <div className="bg-bg-surface border border-border p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent" />
                Waveform Style
              </label>
              <div className="flex gap-2 mt-2">
                {WAVEFORM_STYLES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setStyle(id);
                      requestAnimationFrame(renderWaveform);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      style === id
                        ? "bg-accent text-white"
                        : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Waveform color */}
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Waveform Color
              </label>
              <div className="flex items-center gap-2 mt-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setWaveColor(c);
                      requestAnimationFrame(renderWaveform);
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      waveColor === c
                        ? "border-accent scale-110"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={waveColor}
                  onChange={(e) => {
                    setWaveColor(e.target.value);
                    requestAnimationFrame(renderWaveform);
                  }}
                  className="w-7 h-7 rounded-full border border-border cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Background color */}
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                Background Color
              </label>
              <div className="flex items-center gap-2 mt-2">
                {PRESET_BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setBgColor(c);
                      requestAnimationFrame(renderWaveform);
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      bgColor === c
                        ? "border-accent scale-110"
                        : "border-border hover:scale-105"
                    } ${c === "transparent" ? "bg-[repeating-conic-gradient(#ddd_0_25%,transparent_0_50%)] bg-[length:8px_8px]" : ""}`}
                    style={
                      c === "transparent"
                        ? undefined
                        : { backgroundColor: c }
                    }
                    title={c === "transparent" ? "Transparent" : c}
                  />
                ))}
                <input
                  type="color"
                  value={bgColor === "transparent" ? "#000000" : bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    requestAnimationFrame(renderWaveform);
                  }}
                  className="w-7 h-7 rounded-full border border-border cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Text overlay */}
          <div className="bg-bg-surface border border-border p-4 space-y-3">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Type className="w-4 h-4 text-accent" />
              Text Overlay (optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  requestAnimationFrame(renderWaveform);
                }}
                className="px-3 py-2 bg-bg-elevated border border-border text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="Artist"
                value={artist}
                onChange={(e) => {
                  setArtist(e.target.value);
                  requestAnimationFrame(renderWaveform);
                }}
                className="px-3 py-2 bg-bg-elevated border border-border text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-accent text-white font-medium transition-colors hover:bg-accent/90"
          >
            <Download className="w-5 h-5" />
            Export as PNG
          </button>
        </div>
      )}
    </div>
  );
}
