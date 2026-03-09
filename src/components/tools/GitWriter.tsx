"use client";

import { useState, useCallback, useEffect } from "react";
import { GitCommit, GitPullRequest, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import { trackEvent } from "@/lib/analytics";

type GitWriterMode = "commit" | "pr";

export default function GitWriter() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [mode, setMode] = useState<GitWriterMode>("commit");
  const [diff, setDiff] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "git_writer" });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!diff.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const prompt =
      mode === "commit"
        ? PROMPTS.commitMessageGenerator
        : PROMPTS.prDescriptionWriter;

    const userMessage =
      mode === "commit"
        ? `Generate a commit message for the following changes:\n\n${diff}`
        : [
            `Changes:\n${diff}`,
            context.trim() ? `\nAdditional context:\n${context}` : "",
          ]
            .filter(Boolean)
            .join("\n");

    const toolName =
      mode === "commit" ? "commit_message_generator" : "pr_description_writer";

    try {
      await streamInfer(
        userMessage,
        prompt,
        (token) => setOutput((prev) => prev + token)
      );
      trackEvent("ai_tool_used", { tool: toolName });
    } catch {
      setOutput(
        mode === "commit"
          ? "Error: Failed to generate commit message. Please try again."
          : "Error: Failed to generate PR description. Please try again."
      );
    } finally {
      setIsStreaming(false);
    }
  }, [diff, context, mode, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  const capability = mode === "commit" ? "commit_message" : "pr_description";

  return (
    <div>
      <ToolPageHeader
        icon={mode === "commit" ? GitCommit : GitPullRequest}
        title="Git Writer"
        description="Generate conventional commit messages or well-structured PR descriptions from your diffs."
      />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("commit")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            mode === "commit"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated text-text-secondary hover:bg-bg-hover border border-border"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          Commit Message
        </button>
        <button
          onClick={() => setMode("pr")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            mode === "pr"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated text-text-secondary hover:bg-bg-hover border border-border"
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          PR Description
        </button>
      </div>

      <FeatureLock requiredCapability={capability}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {mode === "commit"
                ? "Diff or change description"
                : "Paste your diff or describe changes"}
            </label>
            <textarea
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder={
                mode === "commit"
                  ? "Paste your git diff or describe the changes..."
                  : "Paste your git diff or describe the changes made..."
              }
              rows={8}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {mode === "pr" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Additional context{" "}
                <span className="text-text-tertiary font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Any additional context, motivation, or related issues..."
                rows={3}
                className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
              />
            </div>
          )}

          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!diff.trim() || isStreaming || isModelLoading}
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
                  : mode === "commit"
                    ? "Generate Commit Message"
                    : "Generate PR Description"}
            </button>
          )}

          <AIStreamOutput
            content={output}
            isStreaming={isStreaming}
            className={mode === "commit" ? "font-mono" : ""}
          />

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
