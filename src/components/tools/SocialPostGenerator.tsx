"use client";

import { useState, useCallback, useEffect } from "react";
import { Share2, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import AIChip from "@/components/AIChip";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type Platform = "Twitter/X" | "LinkedIn" | "Instagram" | "Facebook";

const PLATFORM_OPTIONS: Platform[] = [
  "Twitter/X",
  "LinkedIn",
  "Instagram",
  "Facebook",
];

export default function SocialPostGenerator() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [platform, setPlatform] = useState<Platform>("Twitter/X");
  const [topic, setTopic] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "social_post_generator" });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const userMessage = [
      `Platform: ${platform}`,
      `Topic: ${topic}`,
      keyMessage.trim() ? `Key message: ${keyMessage}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await streamInfer(
        userMessage,
        PROMPTS.socialPostGenerator,
        (token) => setOutput((prev) => prev + token),
        { maxTokens: 512 },
      );
      trackEvent("ai_tool_used", { tool: "social_post_generator" });
    } catch {
      setOutput("Error: Failed to generate post. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [platform, topic, keyMessage, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  return (
    <div>
      <ToolPageHeader
        icon={Share2}
        title="Social Post Generator"
        description="Generate platform-optimized social media posts. Pick a platform, describe your topic, and get ready-to-post content with hashtags."
      />

      <FeatureLock requiredCapability="social_post">
        <div className="space-y-6">
          {/* Platform selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPlatform(opt)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    platform === opt
                      ? "bg-accent text-accent-fg"
                      : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Launch of our new AI-powered productivity tool..."
              rows={4}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Key message */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Key message (optional)
            </label>
            <textarea
              value={keyMessage}
              onChange={(e) => setKeyMessage(e.target.value)}
              placeholder="e.g., Focus on privacy-first approach and local processing..."
              rows={2}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Generate button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || isStreaming || isModelLoading}
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
                  ? "Generating..."
                  : "Generate Post"}
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
