"use client";

import { useState, useCallback, useEffect } from "react";
import { Mail, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import AIChip from "@/components/AIChip";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type Tone =
  | "Professional"
  | "Casual"
  | "Follow-up"
  | "Apology"
  | "Thank you";

const TONE_OPTIONS: Tone[] = [
  "Professional",
  "Casual",
  "Follow-up",
  "Apology",
  "Thank you",
];

export default function EmailComposer() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [tone, setTone] = useState<Tone>("Professional");
  const [context, setContext] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "email_composer" });
  }, []);

  const handleCompose = useCallback(async () => {
    if (!context.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const userMessage = [
      `Tone: ${tone}`,
      `Context: ${context}`,
      keyPoints.trim() ? `Key points:\n${keyPoints}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await streamInfer(
        userMessage,
        PROMPTS.emailComposer,
        (token) => setOutput((prev) => prev + token),
      );
      trackEvent("ai_tool_used", { tool: "email_composer" });
    } catch {
      setOutput("Error: Failed to compose email. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [tone, context, keyPoints, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  return (
    <div>
      <ToolPageHeader
        icon={Mail}
        title="Email Composer"
        description="Describe what your email is about and let AI draft it for you. Choose a tone, add key points, and get a ready-to-send email."
      />

      <FeatureLock requiredCapability="email_compose">
        <div className="space-y-6">
          {/* Tone selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTone(opt)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    tone === opt
                      ? "bg-accent text-accent-fg"
                      : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              What is the email about?
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Requesting a meeting to discuss Q3 results with the marketing team..."
              rows={4}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Key points */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Key points (optional)
            </label>
            <textarea
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="- Mention the deadline is Friday&#10;- Ask about budget approval&#10;- Suggest a 30-minute call"
              rows={3}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Compose button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleCompose}
              disabled={!context.trim() || isStreaming || isModelLoading}
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
                  ? "Composing..."
                  : "Compose Email"}
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
