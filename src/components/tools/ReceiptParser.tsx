"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Receipt, Copy, Check, Sparkles, Loader2, Upload, Image } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIChip from "@/components/AIChip";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

export default function ReceiptParser() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "receipt_parser" });
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setImageFile(file);
      setOcrText("");
      setOutput("");
      setFormattedOutput("");

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleOCR = useCallback(async () => {
    if (!imagePreview) return;
    setIsOcrLoading(true);
    setOcrProgress(0);

    try {
      const { loadOCR, recognizeText } = await import(
        "@/lib/recording/ocr"
      );
      await loadOCR((progress) => {
        setOcrProgress(progress.progress);
      });

      const result = await recognizeText(imagePreview);
      setOcrText(result.text);
    } catch {
      setOcrText("Error: Failed to extract text from image.");
    } finally {
      setIsOcrLoading(false);
      setOcrProgress(0);
    }
  }, [imagePreview]);

  const handleParse = useCallback(async () => {
    if (!ocrText.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setFormattedOutput("");
    setIsStreaming(true);

    let rawOutput = "";

    try {
      await streamInfer(
        `Parse the following receipt text into structured JSON:\n\n${ocrText}`,
        PROMPTS.receiptParser,
        (token) => {
          rawOutput += token;
          setOutput(rawOutput);
        },
      );

      // Try to format the JSON output
      try {
        const parsed = JSON.parse(rawOutput.trim());
        setFormattedOutput(JSON.stringify(parsed, null, 2));
      } catch {
        setFormattedOutput(rawOutput);
      }

      trackEvent("ai_tool_used", { tool: "receipt_parser" });
    } catch {
      setOutput("Error: Failed to parse receipt. Please try again.");
      setFormattedOutput("");
    } finally {
      setIsStreaming(false);
    }
  }, [ocrText, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formattedOutput || output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [formattedOutput, output]);

  const isModelLoading = status === "downloading" || status === "loading";
  const displayOutput = formattedOutput || output;

  return (
    <div>
      <ToolPageHeader
        icon={Receipt}
        title="Receipt Parser"
        description="Upload a receipt image to extract text via OCR, then parse it into structured JSON with AI."
      />

      <FeatureLock requiredCapability="receipt_parse">
        <div className="space-y-6">
          {/* Step 1: Image upload */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Step 1: Upload receipt image
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              }`}
            >
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="max-h-48 mx-auto"
                  />
                  <p className="text-text-tertiary text-xs">
                    {imageFile?.name} — Click or drop to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-text-tertiary mx-auto" />
                  <p className="text-text-secondary text-sm">
                    Drop a receipt image here or click to browse
                  </p>
                  <p className="text-text-tertiary text-xs">
                    Supports PNG, JPG, WebP
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Extract Text button */}
          {imagePreview && !ocrText && (
            <div>
              <button
                onClick={handleOCR}
                disabled={isOcrLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOcrLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
                {isOcrLoading ? "Extracting text..." : "Extract Text (OCR)"}
              </button>

              {/* OCR Progress */}
              {isOcrLoading && ocrProgress > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>Recognizing text...</span>
                    <span>{ocrProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-accent"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: OCR text (readonly) */}
          {ocrText && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Step 2: Extracted text
              </label>
              <textarea
                value={ocrText}
                readOnly
                rows={8}
                className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary resize-y font-mono opacity-80"
              />
            </div>
          )}

          {/* Parse Receipt button */}
          {ocrText && (
            <>
              {!isSupported ? (
                <p className="text-text-tertiary text-sm">
                  WebGPU required. Try Chrome or Edge, or install Ollama.
                </p>
              ) : (
                <button
                  onClick={handleParse}
                  disabled={!ocrText.trim() || isStreaming || isModelLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStreaming || isModelLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isModelLoading
                    ? "Loading AI model..."
                    : isStreaming
                      ? "Parsing..."
                      : "Parse Receipt"}
                </button>
              )}

              {/* AI Progress */}
              {isStreaming && (
                <div className="mt-1">
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-accent animate-pulse w-full" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Output */}
          {displayOutput && (
            <div className="bg-bg-elevated border border-border p-4 text-sm text-text-primary leading-relaxed overflow-y-auto max-h-96">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {displayOutput}
              </pre>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}

          {/* Copy button */}
          {displayOutput && !isStreaming && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-text-primary border border-border text-sm font-medium transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-grade-a" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
          )}

          <p className="text-text-tertiary text-xs mt-6">
            Generated by local AI — may contain errors.
          </p>
        </div>
      </FeatureLock>
    </div>
  );
}
