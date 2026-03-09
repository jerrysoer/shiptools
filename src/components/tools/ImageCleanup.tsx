"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ImageOff,
  Download,
  Loader2,
  Upload,
  AlertCircle,
  Eraser,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import DropZone from "@/components/DropZone";
import BrushMaskCanvas from "@/components/tools/BrushMaskCanvas";
import { trackEvent } from "@/lib/analytics";
import { MAX_IMAGE_SIZE } from "@/lib/constants";

const ACCEPT = "image/png,image/jpeg,image/webp";

type ModelStatus = "idle" | "loading" | "ready" | "error";
type ProcessStatus = "idle" | "processing" | "done" | "error";
type Mode = "background" | "watermark";

export default function ImageCleanup() {
  const [mode, setMode] = useState<Mode>("background");

  useEffect(() => {
    trackEvent("tool_opened", { tool: "image_cleanup" });
  }, []);

  // ── Model state (shared UI, separate backends) ──────────────────
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelProgressText, setModelProgressText] = useState("");
  const [modelError, setModelError] = useState<string | null>(null);

  // Track which model is loaded
  const [rmbgReady, setRmbgReady] = useState(false);
  const [lamaReady, setLamaReady] = useState(false);

  // ── Image state ─────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("idle");
  const [processError, setProcessError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  // ── Watermark-specific state ────────────────────────────────────
  const [maskBlob, setMaskBlob] = useState<Blob | null>(null);
  const [brushSize, setBrushSize] = useState(20);

  const resultUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Derive current model status for display
  const currentModelReady = mode === "background" ? rmbgReady : lamaReady;
  const currentModelStatus = currentModelReady ? "ready" : modelStatus;

  const handleLoadModel = useCallback(async () => {
    setModelStatus("loading");
    setModelError(null);
    setModelProgress(0);

    try {
      if (mode === "background") {
        const { loadRMBG } = await import("@/lib/ai/rmbg");
        await loadRMBG((p) => {
          setModelProgress(p.progress);
          setModelProgressText(p.text);
        });
        setRmbgReady(true);
      } else {
        const { loadLaMa } = await import("@/lib/ai/lama");
        await loadLaMa((p) => {
          setModelProgress(p.progress);
          setModelProgressText(p.text);
        });
        setLamaReady(true);
      }
      setModelStatus("ready");
    } catch (err) {
      setModelStatus("error");
      setModelError(err instanceof Error ? err.message : "Failed to load model");
    }
  }, [mode]);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Cleanup previous previews
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;

    // Get image dimensions for the mask canvas
    const img = new Image();
    img.onload = () => setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;

    setImageFile(file);
    setImagePreview(url);
    setResultBlob(null);
    setResultPreview(null);
    setProcessStatus("idle");
    setProcessError(null);
    setMaskBlob(null);
    resultUrlRef.current = null;
  }, []);

  const handleRemoveBackground = useCallback(async () => {
    if (!imageFile) return;

    setProcessStatus("processing");
    setProcessError(null);

    try {
      const { isRMBGLoaded, loadRMBG, removeBackground } = await import("@/lib/ai/rmbg");

      if (!isRMBGLoaded()) {
        setModelStatus("loading");
        await loadRMBG((p) => {
          setModelProgress(p.progress);
          setModelProgressText(p.text);
        });
        setRmbgReady(true);
        setModelStatus("ready");
      }

      const blob = await removeBackground(imageFile);

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      setResultBlob(blob);
      setResultPreview(url);
      setProcessStatus("done");
      trackEvent("tool_used", { tool: "background_removal" });
    } catch (err) {
      setProcessStatus("error");
      setProcessError(err instanceof Error ? err.message : "Processing failed");
    }
  }, [imageFile]);

  const handleRemoveWatermark = useCallback(async () => {
    if (!imageFile || !maskBlob) return;

    setProcessStatus("processing");
    setProcessError(null);

    try {
      const { isLaMaLoaded, loadLaMa, inpaint } = await import("@/lib/ai/lama");

      if (!isLaMaLoaded()) {
        setModelStatus("loading");
        await loadLaMa((p) => {
          setModelProgress(p.progress);
          setModelProgressText(p.text);
        });
        setLamaReady(true);
        setModelStatus("ready");
      }

      const blob = await inpaint(imageFile, maskBlob);

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      setResultBlob(blob);
      setResultPreview(url);
      setProcessStatus("done");
      trackEvent("tool_used", { tool: "watermark_removal" });
    } catch (err) {
      setProcessStatus("error");
      setProcessError(err instanceof Error ? err.message : "Processing failed");
    }
  }, [imageFile, maskBlob]);

  const handleProcess = mode === "background" ? handleRemoveBackground : handleRemoveWatermark;

  const handleDownload = useCallback(() => {
    if (!resultBlob || !imageFile) return;

    const baseName = imageFile.name.replace(/\.[^.]+$/, "");
    const suffix = mode === "background" ? "_nobg" : "_clean";
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}${suffix}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resultBlob, imageFile, mode]);

  const handleClear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

    setImageFile(null);
    setImagePreview(null);
    setImageDims(null);
    setResultBlob(null);
    setResultPreview(null);
    setProcessStatus("idle");
    setProcessError(null);
    setMaskBlob(null);
    previewUrlRef.current = null;
    resultUrlRef.current = null;
  }, []);

  const handleModeSwitch = useCallback((newMode: Mode) => {
    setMode(newMode);
    // Reset process state when switching modes, keep image
    setResultBlob(null);
    setResultPreview(null);
    setProcessStatus("idle");
    setProcessError(null);
    setMaskBlob(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  const modelName = mode === "background" ? "RMBG-1.4" : "LaMa Inpainting";
  const modelSize = mode === "background" ? "~180 MB" : "~93 MB";

  return (
    <div>
      <ToolPageHeader
        icon={mode === "background" ? ImageOff : Eraser}
        title="Image Cleanup"
        description="Remove backgrounds or watermarks from images using local AI models. Runs entirely in your browser — no uploads."
      />

      <div className="space-y-6">
        {/* Mode tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => handleModeSwitch("background")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              mode === "background"
                ? "border-accent text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <span className="flex items-center gap-2">
              <ImageOff className="w-4 h-4" />
              Remove Background
            </span>
          </button>
          <button
            onClick={() => handleModeSwitch("watermark")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              mode === "watermark"
                ? "border-accent text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <span className="flex items-center gap-2">
              <Eraser className="w-4 h-4" />
              Remove Watermark
            </span>
          </button>
        </div>

        {/* Model status card */}
        <div className="bg-bg-elevated border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">AI Model</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {currentModelReady
                  ? `${modelName} ready`
                  : `${modelName} — downloads ${modelSize} on first use`}
              </p>
            </div>
            {currentModelReady && (
              <div className="flex items-center gap-1.5 text-xs text-grade-a">
                <div className="w-2 h-2 rounded-full bg-grade-a animate-pulse" />
                Ready
              </div>
            )}
          </div>

          {!currentModelReady && currentModelStatus === "idle" && (
            <button
              onClick={handleLoadModel}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary text-bg-primary text-sm font-medium transition-opacity hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              Load Model
            </button>
          )}

          {!currentModelReady && currentModelStatus === "loading" && (
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-2">
                <span>{modelProgressText}</span>
                <span>{modelProgress}%</span>
              </div>
              <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${modelProgress}%` }}
                />
              </div>
            </div>
          )}

          {currentModelStatus === "error" && modelError && (
            <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 text-sm">
              <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
              <span className="text-text-secondary">{modelError}</span>
            </div>
          )}
        </div>

        {/* Drop zone */}
        {imageFile && (
          <div className="flex justify-end">
            <button
              onClick={handleClear}
              className="text-text-tertiary hover:text-text-primary text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        <DropZone
          accept={ACCEPT}
          maxSize={MAX_IMAGE_SIZE}
          onFiles={handleFiles}
          label={
            mode === "background"
              ? "Drop an image here to remove its background"
              : "Drop an image here to remove watermarks"
          }
          multiple={false}
        />

        {/* Brush size slider (watermark mode only) */}
        {mode === "watermark" && imageFile && processStatus !== "done" && (
          <div className="flex items-center gap-3 px-1">
            <label className="text-xs text-text-secondary whitespace-nowrap">
              Brush size
            </label>
            <input
              type="range"
              min={10}
              max={50}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="text-xs text-text-tertiary w-8 text-right">
              {brushSize}px
            </span>
          </div>
        )}

        {/* Process button */}
        {imageFile && processStatus !== "done" && (
          <button
            onClick={handleProcess}
            disabled={processStatus === "processing" || (mode === "watermark" && !maskBlob)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processStatus === "processing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "background" ? "Removing background..." : "Removing watermark..."}
              </>
            ) : (
              <>
                {mode === "background" ? (
                  <ImageOff className="w-4 h-4" />
                ) : (
                  <Eraser className="w-4 h-4" />
                )}
                {mode === "background" ? "Remove Background" : "Remove Watermark"}
              </>
            )}
          </button>
        )}

        {/* Watermark hint */}
        {mode === "watermark" && imageFile && !maskBlob && processStatus === "idle" && (
          <p className="text-text-tertiary text-xs text-center">
            Paint over the watermark on the image below, then click &ldquo;Remove Watermark&rdquo;.
          </p>
        )}

        {/* Error */}
        {processStatus === "error" && processError && (
          <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 text-sm">
            <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
            <span className="text-text-secondary">{processError}</span>
          </div>
        )}

        {/* Before / After comparison */}
        {imagePreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original (with mask canvas overlay in watermark mode) */}
            <div className="bg-bg-elevated border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Original
                  {mode === "watermark" && processStatus !== "done" && " — paint over watermark"}
                </span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                {mode === "watermark" && imageDims && processStatus !== "done" ? (
                  <BrushMaskCanvas
                    imageUrl={imagePreview}
                    brushSize={brushSize}
                    onMaskChange={setMaskBlob}
                    width={imageDims.width}
                    height={imageDims.height}
                  />
                ) : (
                  <img
                    src={imagePreview}
                    alt="Original"
                    className="max-w-full max-h-[400px] object-contain rounded"
                  />
                )}
              </div>
            </div>

            {/* Result */}
            <div className="bg-bg-elevated border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Result
                </span>
                {resultBlob && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                )}
              </div>
              <div
                className="p-4 flex items-center justify-center min-h-[200px]"
                style={
                  mode === "background"
                    ? {
                        backgroundImage:
                          "linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                      }
                    : undefined
                }
              >
                {processStatus === "processing" && (
                  <div className="flex flex-col items-center gap-2 text-text-tertiary">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs">Processing...</span>
                  </div>
                )}
                {processStatus === "idle" && (
                  <span className="text-text-tertiary text-xs">
                    Result will appear here
                  </span>
                )}
                {resultPreview && (
                  <img
                    src={resultPreview}
                    alt={mode === "background" ? "Background removed" : "Watermark removed"}
                    className="max-w-full max-h-[400px] object-contain rounded"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-text-tertiary text-xs">
          Generated by local AI — may contain errors. The model runs entirely
          in your browser; no images are uploaded to any server.
        </p>
      </div>
    </div>
  );
}
