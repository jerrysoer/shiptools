"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ScanText,
  Copy,
  Check,
  Loader2,
  Clipboard,
  AlertCircle,
  Upload,
  Sparkles,
} from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import FeatureLock from "@/components/ai/FeatureLock";
import DropZone from "@/components/DropZone";
import { trackEvent } from "@/lib/analytics";
import { MAX_IMAGE_SIZE } from "@/lib/constants";

const ACCEPT = "image/png,image/jpeg,image/webp,image/bmp,image/tiff";

type ScannerMode = "extract-text" | "parse-receipt";
type ModelStatus = "idle" | "loading" | "ready" | "error";

const MODE_OPTIONS: { value: ScannerMode; label: string }[] = [
  { value: "extract-text", label: "Extract Text" },
  { value: "parse-receipt", label: "Parse Receipt" },
];

export default function ImageScanner() {
  const searchParams = useSearchParams();
  const { isReady, isSupported, loadModel: loadAI, streamInfer, status: aiStatus } = useLocalAI();

  const modeParam = searchParams.get("mode");
  const initialMode: ScannerMode =
    modeParam === "parse-receipt" ? "parse-receipt" : "extract-text";
  const [mode, setMode] = useState<ScannerMode>(initialMode);

  // OCR state
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

  // Receipt parse state
  const [parseOutput, setParseOutput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "image_scanner", mode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      setParseOutput("");
      setFormattedOutput("");

      // Run OCR
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
        trackEvent("tool_used", { tool: "image_scanner", mode: "extract-text" });
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

  const handleParseReceipt = useCallback(async () => {
    if (!resultText.trim()) return;

    if (!isReady) {
      await loadAI();
    }

    setParseOutput("");
    setFormattedOutput("");
    setIsParsing(true);

    let rawOutput = "";

    try {
      await streamInfer(
        `Parse the following receipt text into structured JSON:\n\n${resultText}`,
        PROMPTS.receiptParser,
        (token) => {
          rawOutput += token;
          setParseOutput(rawOutput);
        },
      );

      try {
        const parsed = JSON.parse(rawOutput.trim());
        setFormattedOutput(JSON.stringify(parsed, null, 2));
      } catch {
        setFormattedOutput(rawOutput);
      }

      trackEvent("ai_tool_used", { tool: "image_scanner", mode: "parse-receipt" });
    } catch {
      setParseOutput("Error: Failed to parse receipt. Please try again.");
      setFormattedOutput("");
    } finally {
      setIsParsing(false);
    }
  }, [resultText, isReady, loadAI, streamInfer]);

  const handleCopy = useCallback(async () => {
    const text = mode === "parse-receipt" && (formattedOutput || parseOutput)
      ? (formattedOutput || parseOutput)
      : resultText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mode, resultText, formattedOutput, parseOutput]);

  const handleClear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImagePreview(null);
    setResultText("");
    setConfidence(null);
    setError(null);
    setIsRecognizing(false);
    setRecognizeProgress(0);
    setParseOutput("");
    setFormattedOutput("");
  }, []);

  const isAIModelLoading = aiStatus === "downloading" || aiStatus === "loading";
  const isReceiptMode = mode === "parse-receipt";
  const displayOutput = formattedOutput || parseOutput;

  return (
    <div>
      <ToolPageHeader
        icon={ScanText}
        title="Image Scanner"
        description="Extract text from images via OCR, or parse receipts into structured data."
      />

      {/* Mode selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Mode
        </label>
        <div className="flex gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === opt.value
                  ? "bg-accent text-accent-fg"
                  : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* OCR Engine status */}
        <div className="bg-bg-elevated border border-border rounded-xl p-5">
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-text-primary text-bg-primary text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
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
            <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
              <span className="text-text-secondary">{modelError}</span>
            </div>
          )}
        </div>

        {/* Clipboard paste hint */}
        <div className="flex items-center gap-2 px-4 py-3 bg-bg-elevated border border-border rounded-xl">
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

        {/* Clear button */}
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

        {/* Drop zone */}
        <DropZone
          accept={ACCEPT}
          maxSize={MAX_IMAGE_SIZE}
          onFiles={handleFiles}
          label="Drop an image here or click to browse"
          multiple={false}
        />

        {/* OCR Progress */}
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
          <div className="flex items-start gap-2 p-3 bg-grade-f/5 border border-grade-f/20 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 text-grade-f shrink-0 mt-0.5" />
            <span className="text-text-secondary">{error}</span>
          </div>
        )}

        {/* Image preview + OCR result */}
        {imagePreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image preview */}
            <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden">
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
            <div className="bg-bg-elevated border border-border rounded-xl overflow-hidden">
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

        {/* Copy button (extract-text mode) */}
        {!isReceiptMode && resultText && !isRecognizing && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-surface text-text-primary border border-border rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-grade-a" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        )}

        {/* Receipt parsing (parse-receipt mode) */}
        {isReceiptMode && resultText && (
          <FeatureLock requiredCapability="receipt_parse">
            <div className="space-y-4">
              {!isSupported ? (
                <p className="text-text-tertiary text-sm">
                  WebGPU required. Try Chrome or Edge, or install Ollama.
                </p>
              ) : (
                <button
                  onClick={handleParseReceipt}
                  disabled={!resultText.trim() || isParsing || isAIModelLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing || isAIModelLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isAIModelLoading
                    ? "Loading AI model..."
                    : isParsing
                      ? "Parsing..."
                      : "Parse with AI"}
                </button>
              )}

              {/* Parsed output */}
              {displayOutput && (
                <div className="bg-bg-elevated border border-border rounded-xl p-4 text-sm text-text-primary leading-relaxed overflow-y-auto max-h-96">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {displayOutput}
                  </pre>
                  {isParsing && (
                    <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}

              {/* Copy button */}
              {displayOutput && !isParsing && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-grade-a" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copied" : "Copy to clipboard"}
                </button>
              )}
            </div>
          </FeatureLock>
        )}

        {/* Disclaimer */}
        <p className="text-text-tertiary text-xs">
          OCR runs entirely in your browser; no images are uploaded to any server.
        </p>
      </div>
    </div>
  );
}
