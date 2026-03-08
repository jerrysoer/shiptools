"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import FileTextInput from "@/components/FileTextInput";
import { trackEvent } from "@/lib/analytics";

type SummaryMode = "general" | "privacy-policy";
type SummaryLength = "1 sentence" | "1 paragraph" | "Key points";

const LENGTH_OPTIONS: SummaryLength[] = ["1 sentence", "1 paragraph", "Key points"];

const MODE_OPTIONS: { value: SummaryMode; label: string }[] = [
  { value: "general", label: "General" },
  { value: "privacy-policy", label: "Privacy Policy" },
];

export default function AISummarizer() {
  const searchParams = useSearchParams();
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();

  const initialMode = searchParams.get("mode") === "privacy-policy" ? "privacy-policy" : "general";
  const [mode, setMode] = useState<SummaryMode>(initialMode);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [length, setLength] = useState<SummaryLength>("1 paragraph");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "ai_summarizer", mode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isPrivacyMode = mode === "privacy-policy";

  const handleSummarize = useCallback(async () => {
    if (!input.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    try {
      if (isPrivacyMode) {
        await streamInfer(
          `Analyze the following privacy policy and provide a structured summary:\n\n${input}`,
          PROMPTS.privacyPolicySummarizer,
          (token) => setOutput((prev) => prev + token),
        );
        trackEvent("ai_tool_used", { tool: "ai_summarizer", mode: "privacy-policy" });
      } else {
        await streamInfer(
          `Summarize the following text in ${length}:\n\n${input}`,
          PROMPTS.summarizer,
          (token) => setOutput((prev) => prev + token),
        );
        trackEvent("tool_used", { tool: "ai_summarizer", length });
      }
    } catch {
      setOutput("Error: Failed to generate summary. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, length, isPrivacyMode, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  return (
    <div>
      <ToolPageHeader
        icon={Sparkles}
        title="Text Summarizer"
        description="Condense any text into key points, a single sentence, or a short paragraph. Switch to Privacy Policy mode to analyze terms of service and data practices."
      />

      <FeatureLock requiredCapability={isPrivacyMode ? "privacy_policy" : "summarize_short"}>
        <div className="space-y-6">
          {/* Mode selector */}
          <div>
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

          {/* File upload */}
          <FileTextInput onTextExtracted={(text) => setInput(text)} />

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {isPrivacyMode ? "Privacy policy text" : "Text to summarize"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isPrivacyMode
                ? "Paste a privacy policy or terms of service..."
                : "Paste your text here..."
              }
              rows={8}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
            <p className="text-text-tertiary text-xs mt-1">
              {input.length.toLocaleString()} characters
            </p>
          </div>

          {/* Length selector (general mode only) */}
          {!isPrivacyMode && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Summary length
              </label>
              <div className="flex gap-2">
                {LENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLength(opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      length === opt
                        ? "bg-accent text-accent-fg"
                        : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summarize button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleSummarize}
              disabled={!input.trim() || isStreaming || isModelLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming || isModelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isModelLoading
                ? "Loading AI model..."
                : isStreaming
                  ? "Summarizing..."
                  : isPrivacyMode
                    ? "Summarize Policy"
                    : "Summarize"}
            </button>
          )}

          {/* Output */}
          <AIStreamOutput content={output} isStreaming={isStreaming} />

          {/* Copy button */}
          {output && !isStreaming && (
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

          <p className="text-xs text-text-tertiary">Generated by local AI — may contain errors.</p>
        </div>
      </FeatureLock>
    </div>
  );
}
