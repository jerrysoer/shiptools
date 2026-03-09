"use client";

import { useState, useCallback, useEffect } from "react";
import { Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type Tone = "More formal" | "Simpler" | "Shorter" | "More detailed";

const TONE_OPTIONS: Tone[] = ["More formal", "Simpler", "Shorter", "More detailed"];

export default function AIRewriter() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tone, setTone] = useState<Tone>("Simpler");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "ai_rewriter" });
  }, []);

  const handleRewrite = useCallback(async () => {
    if (!input.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const instruction = customInstruction.trim()
      ? `Rewrite the following text with this instruction: "${customInstruction}"\n\n${input}`
      : `Rewrite the following text in a "${tone}" style:\n\n${input}`;

    try {
      await streamInfer(
        instruction,
        PROMPTS.rewriter,
        (token) => setOutput((prev) => prev + token)
      );
      trackEvent("tool_used", { tool: "ai_rewriter", tone });
    } catch {
      setOutput("Error: Failed to rewrite. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, tone, customInstruction, isReady, loadModel, streamInfer]);

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
        title="Text Rewriter"
        description="Rewrite text in a different tone or style. Adjust formality, simplify language, shorten, or expand — all locally in your browser."
      />

      <FeatureLock requiredCapability="rewrite">
        <div className="space-y-6">
          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Text to rewrite
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your text here..."
              rows={6}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Tone selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setTone(opt);
                    setCustomInstruction("");
                  }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    tone === opt && !customInstruction
                      ? "bg-accent text-accent-fg"
                      : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Custom instruction (optional)
            </label>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder='e.g., "Make it sound like a pirate"'
              className="w-full bg-bg-elevated border border-border px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* Rewrite button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleRewrite}
              disabled={!input.trim() || isStreaming || isModelLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming || isModelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isModelLoading ? "Loading AI model..." : isStreaming ? "Rewriting..." : "Rewrite"}
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

          <p className="text-xs text-text-tertiary">Generated by local AI — may contain errors.</p>
        </div>
      </FeatureLock>
    </div>
  );
}
