"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ScanText,
  Copy,
  Check,
  Loader2,
  Clipboard,
  AlertCircle,
  Upload,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import DropZone from "@/components/DropZone";
import { trackEvent } from "@/lib/analytics";
import { MAX_IMAGE_SIZE } from "@/lib/constants";

const ACCEPT = "image/png,image/jpeg,image/webp,image/bmp,image/tiff";

type ModelStatus = "idle" | "loading" | "ready" | "error";

export default function OCRTool() {
  useEffect(() => {
    trackEvent("tool_opened", { tool: "ocr" });
  }, []);

  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizeProgress, setRecognizeProgress] = useState(0);
  const [resultText, setResultText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const previewUrlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Clipboard paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) processImage(blob);
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  });

  const loadModel = useCallback(async () => {
    setModelStatus("loading");
    setModelError(null);
    setModelProgress(0);

    try {
      const { loadOCR, isOCRLoaded } = await import("@/lib/recording/ocr");
      if (isOCRLoaded()) {
        setModelStatus("ready");
        return;
      }

      await loadOCR((p) => {
        setModelProgress(p.progress);
      });
      setModelStatus("ready");
    } catch (err) {
      setModelStatus("error");
      setModelError(err instanceof Error ? err.message : "Failed to load OCR model");
    }
  }, []);

  const processImage = useCallback(
    async (blob: Blob) => {
      // Set preview
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setImagePreview(url);
      setResultText("");
      setConfidence(null);
      setError(null);

      // Ensure model is loaded
      setIsRecognizing(true);
      setRecognizeProgress(0);

      try {
        const { loadOCR, isOCRLoaded, recognizeText } = await import("@/lib/recording/ocr");

        if (!isOCRLoaded()) {
          setModelStatus("loading");
          await loadOCR((p) => {
            setModelProgress(p.progress);
            setRecognizeProgress(Math.round(p.progress * 0.5));
          });
          setModelStatus("ready");
        }

        setRecognizeProgress(50);

        const result = await recognizeText(blob);

        setResultText(result.text);
        setConfidence(result.confidence);
        setRecognizeProgress(100);
        trackEvent("tool_used", { tool: "ocr" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Recognition failed");
      } finally {
        setIsRecognizing(false);
      }
    },
    [],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file) processImage(file);
    },
    [processImage],
  );

  const handleCopy = useCallback(async () => {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [resultText]);

  const handleClear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImagePreview(null);
    setResultText("");
    setConfidence(null);
    setError(null);
    setIsRecognizing(false);
    setRecognizeProgress(0);
  }, []);

  return (
    <div ref={containerRef}>
      <ToolPageHeader
        icon={ScanText}
        title="OCR — Text Recognition"
        description="Extract text from images using local OCR. Paste from clipboard or drop an image file."
      />

      <div className="space-y-6">
        {/* Model status */}
        <div className="bg-bg-elevated border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">OCR Engine</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {modelStatus === "ready"
                  ? "Tesseract.js ready"
                  : "Tesseract.js — downloads ~15 MB on first use"}
              </p>
            </div>
            {modelStatus === "ready" && (
              <div className="flex items-center gap-1.5 text-xs text-grade-a">
                <div className="w-2 h-2 rounded-full bg-grade-a animate-pulse" />
                Ready
              </div>
            )}
          </div>

          {modelStatus === "idle" && (
            <button
              onClick={loadModel}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary text-bg-primary text-sm font-medium transition-opacity hover:opacity-90"
            >
              <Upload className="w-4 h-4" />
              Load OCR Engine
            </button>
          )}

          {modelStatus === "loading" && (
            <div>
              <div className="flex justify-between text-xs text-text-secondary mb-2">
                <span>Loading OCR engine...</span>
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

          {modelStatus === "error" && modelError && (
            <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 text-sm">
              <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
              <span className="text-text-secondary">{modelError}</span>
            </div>
          )}
        </div>

        {/* Clipboard paste hint */}
        <div className="flex items-center gap-2 px-4 py-3 bg-bg-elevated border border-border">
          <Clipboard className="w-4 h-4 text-text-tertiary shrink-0" />
          <p className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Tip:</span> Press{" "}
            <kbd className="px-1.5 py-0.5 bg-bg-surface border border-border rounded text-[10px] font-mono">
              Ctrl+V
            </kbd>{" "}
            /{" "}
            <kbd className="px-1.5 py-0.5 bg-bg-surface border border-border rounded text-[10px] font-mono">
              Cmd+V
            </kbd>{" "}
            to paste a screenshot directly
          </p>
        </div>

        {/* Drop zone */}
        {imagePreview && (
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
          label="Drop an image here or click to browse"
          multiple={false}
        />

        {/* Progress */}
        {isRecognizing && (
          <div>
            <div className="flex justify-between text-xs text-text-secondary mb-2">
              <span>Recognizing text...</span>
              <span>{recognizeProgress}%</span>
            </div>
            <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${recognizeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 text-sm">
            <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
            <span className="text-text-secondary">{error}</span>
          </div>
        )}

        {/* Image preview + result */}
        {imagePreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image preview */}
            <div className="bg-bg-elevated border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Image
                </span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <img
                  src={imagePreview}
                  alt="Input"
                  className="max-w-full max-h-[400px] object-contain rounded"
                />
              </div>
            </div>

            {/* Text output */}
            <div className="bg-bg-elevated border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Recognized Text
                </span>
                {confidence !== null && (
                  <span
                    className={`text-xs font-mono ${
                      confidence >= 80
                        ? "text-grade-a"
                        : confidence >= 50
                          ? "text-grade-c"
                          : "text-grade-f"
                    }`}
                  >
                    {confidence.toFixed(1)}% confidence
                  </span>
                )}
              </div>
              <div className="p-4 min-h-[200px]">
                {isRecognizing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-text-tertiary min-h-[160px]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs">Recognizing...</span>
                  </div>
                ) : resultText ? (
                  <textarea
                    readOnly
                    value={resultText}
                    className="w-full h-full min-h-[160px] bg-transparent text-sm text-text-primary font-mono resize-y focus:outline-none"
                  />
                ) : (
                  <p className="text-text-tertiary text-xs text-center pt-16">
                    Text will appear here
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Copy button */}
        {resultText && !isRecognizing && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border text-sm font-medium transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-grade-a" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        )}

        {/* Disclaimer */}
        <p className="text-text-tertiary text-xs">
          Generated by local AI — may contain errors. OCR runs entirely in
          your browser; no images are uploaded to any server.
        </p>
      </div>
    </div>
  );
}
