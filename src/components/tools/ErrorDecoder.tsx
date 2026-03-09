"use client";

import { useState, useCallback, useEffect } from "react";
import { Bug, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import { trackEvent } from "@/lib/analytics";

const FRAMEWORKS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "React",
  "Next.js",
  "Node.js",
  "Other",
] as const;

type Framework = (typeof FRAMEWORKS)[number];

export default function ErrorDecoder() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [errorMessage, setErrorMessage] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [framework, setFramework] = useState<Framework>("JavaScript");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "error_decoder" });
  }, []);

  const handleDecode = useCallback(async () => {
    if (!errorMessage.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const userPrompt = [
      `Language/Framework: ${framework}`,
      `\nError message:\n${errorMessage}`,
      stackTrace.trim() ? `\nStack trace:\n${stackTrace}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await streamInfer(
        userPrompt,
        PROMPTS.errorDecoder,
        (token) => setOutput((prev) => prev + token)
      );
      trackEvent("ai_tool_used", { tool: "error_decoder" });
    } catch {
      setOutput("Error: Failed to decode error. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [errorMessage, stackTrace, framework, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  return (
    <div>
      <ToolPageHeader
        icon={Bug}
        title="Error Decoder"
        description="Paste an error message and get a plain-English explanation with fix suggestions."
      />

      <FeatureLock requiredCapability="error_decode">
        <div className="space-y-6">
          {/* Framework selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Language / Framework
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as Framework)}
              className="w-full bg-bg-elevated border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {FRAMEWORKS.map((fw) => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
          </div>

          {/* Error message */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Error message
            </label>
            <textarea
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Paste the error message here..."
              rows={4}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Stack trace (optional) */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Stack trace{" "}
              <span className="text-text-tertiary font-normal">(optional)</span>
            </label>
            <textarea
              value={stackTrace}
              onChange={(e) => setStackTrace(e.target.value)}
              placeholder="Paste the stack trace here..."
              rows={6}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Decode button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleDecode}
              disabled={!errorMessage.trim() || isStreaming || isModelLoading}
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
                  ? "Decoding..."
                  : "Decode Error"}
            </button>
          )}

          {/* Output */}
          <AIStreamOutput content={output} isStreaming={isStreaming} />

          {/* Copy button */}
          {output && !isStreaming && (
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
