"use client";

import { useState, useCallback, useEffect } from "react";
import { SearchCode, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import OllamaGate from "@/components/ai/OllamaGate";
import { trackEvent } from "@/lib/analytics";

const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "Ruby",
  "PHP",
  "SQL",
  "Other",
] as const;

type Language = (typeof LANGUAGES)[number];

export default function CodeReviewer() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [comprehensive, setComprehensive] = useState(false);
  const [language, setLanguage] = useState<Language>("JavaScript");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "code_reviewer" });
  }, []);

  const handleReview = useCallback(async () => {
    if (!input.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const toolName = comprehensive ? "full_code_review" : "code_reviewer";
    const prompt = comprehensive
      ? PROMPTS.fullCodeReview
      : PROMPTS.codeReviewer;
    const userMessage = comprehensive
      ? `Language: ${language}\n\nPerform a comprehensive code review:\n\n${input}`
      : `Language: ${language}\n\nReview the following code:\n\n${input}`;

    try {
      await streamInfer(
        userMessage,
        prompt,
        (token) => setOutput((prev) => prev + token)
      );
      trackEvent("ai_tool_used", { tool: toolName });
    } catch {
      setOutput("Error: Failed to review code. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, language, comprehensive, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  const reviewContent = (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full bg-bg-elevated border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Code to review
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            comprehensive
              ? "Paste your code here for a comprehensive review..."
              : "Paste your code here..."
          }
          rows={comprehensive ? 15 : 10}
          className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
        />
      </div>

      {!isSupported ? (
        <p className="text-text-tertiary text-sm">
          WebGPU required. Try Chrome or Edge, or install Ollama.
        </p>
      ) : (
        <button
          onClick={handleReview}
          disabled={!input.trim() || isStreaming || isModelLoading}
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
              ? "Reviewing..."
              : comprehensive
                ? "Full Review"
                : "Review Code"}
        </button>
      )}

      <AIStreamOutput content={output} isStreaming={isStreaming} />

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
  );

  return (
    <div>
      <ToolPageHeader
        icon={SearchCode}
        title="Code Reviewer"
        description="Review code for bugs, security, performance, and style. Toggle comprehensive mode for in-depth analysis with Ollama."
      />

      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={comprehensive}
            onChange={(e) => setComprehensive(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-text-secondary">
            Comprehensive review (requires Ollama)
          </span>
        </label>
      </div>

      {comprehensive ? (
        <OllamaGate fallbackMessage="Comprehensive code review requires a larger model running via Ollama.">
          {reviewContent}
        </OllamaGate>
      ) : (
        <FeatureLock requiredCapability="code_review">
          {reviewContent}
        </FeatureLock>
      )}
    </div>
  );
}
