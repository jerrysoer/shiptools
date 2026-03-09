"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PenTool, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import FileTextInput from "@/components/FileTextInput";
import { trackEvent } from "@/lib/analytics";
import type { ModelCapability } from "@/lib/ai/registry";

// ── Mode definitions ────────────────────────────────────────────────────

type WriterMode = "email" | "social" | "rewrite" | "custom" | "techdocs";

const MODE_OPTIONS: { value: WriterMode; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "social", label: "Social" },
  { value: "rewrite", label: "Rewrite" },
  { value: "custom", label: "Custom" },
  { value: "techdocs", label: "Tech Docs" },
];

const CAPABILITY_MAP: Record<WriterMode, ModelCapability> = {
  email: "email_compose",
  social: "social_post",
  rewrite: "rewrite",
  custom: "rewrite",
  techdocs: "tech_writing",
};

const PROMPT_MAP: Record<WriterMode, keyof typeof PROMPTS> = {
  email: "emailComposer",
  social: "socialPostGenerator",
  rewrite: "rewriter",
  custom: "rewriter",
  techdocs: "techWritingAssistant",
};

// ── Per-mode selector options ───────────────────────────────────────────

type EmailTone = "Professional" | "Casual" | "Follow-up" | "Apology" | "Thank you";
const EMAIL_TONES: EmailTone[] = ["Professional", "Casual", "Follow-up", "Apology", "Thank you"];

type Platform = "Twitter/X" | "LinkedIn" | "Instagram" | "Facebook";
const PLATFORMS: Platform[] = ["Twitter/X", "LinkedIn", "Instagram", "Facebook"];

type RewriteTone = "More formal" | "Simpler" | "Shorter" | "More detailed";
const REWRITE_TONES: RewriteTone[] = ["More formal", "Simpler", "Shorter", "More detailed"];

type AudienceLevel = "Beginner" | "Intermediate" | "Advanced";
const AUDIENCE_LEVELS: AudienceLevel[] = ["Beginner", "Intermediate", "Advanced"];

type ContentType = "Tutorial" | "API Reference" | "How-to Guide" | "Explanation" | "Troubleshooting";
const CONTENT_TYPES: ContentType[] = ["Tutorial", "API Reference", "How-to Guide", "Explanation", "Troubleshooting"];

// ── Component ───────────────────────────────────────────────────────────

export default function Writer() {
  const searchParams = useSearchParams();
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();

  const initialMode = (searchParams.get("mode") ?? "email") as WriterMode;
  const validMode = MODE_OPTIONS.some((o) => o.value === initialMode) ? initialMode : "email";

  const [mode, setMode] = useState<WriterMode>(validMode);
  const [input, setInput] = useState("");
  const [secondary, setSecondary] = useState("");
  const [instruction, setInstruction] = useState("");
  const [emailTone, setEmailTone] = useState<EmailTone>("Professional");
  const [platform, setPlatform] = useState<Platform>("Twitter/X");
  const [rewriteTone, setRewriteTone] = useState<RewriteTone>("Simpler");
  const [audience, setAudience] = useState<AudienceLevel>("Intermediate");
  const [contentType, setContentType] = useState<ContentType>("Tutorial");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "writer", mode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build user message per mode ──────────────────────────────────────

  const buildUserMessage = useCallback((): string => {
    switch (mode) {
      case "email":
        return [
          `Tone: ${emailTone}`,
          `Context: ${input}`,
          secondary.trim() ? `Key points:\n${secondary}` : "",
        ].filter(Boolean).join("\n\n");

      case "social":
        return [
          `Platform: ${platform}`,
          `Topic: ${input}`,
          secondary.trim() ? `Key message: ${secondary}` : "",
        ].filter(Boolean).join("\n\n");

      case "rewrite":
        return instruction.trim()
          ? `Rewrite the following text with this instruction: "${instruction}"\n\n${input}`
          : `Rewrite the following text in a "${rewriteTone}" style:\n\n${input}`;

      case "custom":
        return `${instruction}\n\n${input}`;

      case "techdocs":
        return [
          `Topic: ${input}`,
          `Audience level: ${audience}`,
          `Content type: ${contentType}`,
          secondary.trim() ? `\nNotes/outline:\n${secondary}` : "",
        ].filter(Boolean).join("\n");
    }
  }, [mode, input, secondary, instruction, emailTone, platform, rewriteTone, audience, contentType]);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    if (mode === "custom" && !instruction.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    const options = mode === "social" ? { maxTokens: 512 } : undefined;

    try {
      await streamInfer(
        buildUserMessage(),
        PROMPTS[PROMPT_MAP[mode]],
        (token) => setOutput((prev) => prev + token),
        options,
      );
      trackEvent("ai_tool_used", { tool: "writer", mode });
    } catch {
      setOutput("Error: Failed to generate text. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, instruction, mode, isReady, loadModel, streamInfer, buildUserMessage]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  // ── Derived labels per mode ──────────────────────────────────────────

  const inputLabel = mode === "email" ? "What is the email about?"
    : mode === "social" ? "Topic"
    : mode === "rewrite" ? "Text to rewrite"
    : mode === "techdocs" ? "Topic"
    : "Your text";

  const inputPlaceholder = mode === "email" ? "e.g., Requesting a meeting to discuss Q3 results with the marketing team..."
    : mode === "social" ? "e.g., Launch of our new AI-powered productivity tool..."
    : mode === "rewrite" ? "Paste your text here..."
    : mode === "techdocs" ? "e.g., Setting up authentication with Supabase in Next.js"
    : "Paste or type your text here...";

  const buttonLabel = isModelLoading ? "Loading AI model..."
    : isStreaming ? (mode === "email" ? "Composing..." : mode === "social" ? "Generating..." : mode === "rewrite" ? "Rewriting..." : mode === "techdocs" ? "Writing..." : "Writing...")
    : mode === "email" ? "Compose Email"
    : mode === "social" ? "Generate Post"
    : mode === "rewrite" ? "Rewrite"
    : mode === "techdocs" ? "Write Docs"
    : "Generate";

  const disableButton = mode === "custom"
    ? !input.trim() || !instruction.trim() || isStreaming || isModelLoading
    : !input.trim() || isStreaming || isModelLoading;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      <ToolPageHeader
        icon={PenTool}
        title="Writer"
        description="Compose emails, social posts, tech docs, rewrite text, or write with custom instructions — all locally in your browser."
      />

      <FeatureLock requiredCapability={CAPABILITY_MAP[mode]}>
        <div className="space-y-6">
          {/* Mode selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Mode</label>
            <div className="flex flex-wrap gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
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

          {/* Per-mode selector buttons */}
          {mode === "email" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {EMAIL_TONES.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setEmailTone(opt)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      emailTone === opt
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

          {mode === "social" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((opt) => (
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
          )}

          {mode === "rewrite" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {REWRITE_TONES.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setRewriteTone(opt);
                      setInstruction("");
                    }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      rewriteTone === opt && !instruction
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

          {mode === "techdocs" && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Audience Level</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_LEVELS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAudience(opt)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        audience === opt
                          ? "bg-accent text-accent-fg"
                          : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Content Type</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setContentType(opt)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        contentType === opt
                          ? "bg-accent text-accent-fg"
                          : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* File upload */}
          <FileTextInput onTextExtracted={(text) => setInput(text)} />

          {/* Primary input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {inputLabel}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              rows={mode === "rewrite" || mode === "custom" ? 6 : 4}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
          </div>

          {/* Secondary input (email, social & techdocs) */}
          {(mode === "email" || mode === "social" || mode === "techdocs") && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {mode === "email" ? "Key points (optional)" : mode === "techdocs" ? "Notes / outline (optional)" : "Key message (optional)"}
              </label>
              <textarea
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                placeholder={mode === "email"
                  ? "- Mention the deadline is Friday\n- Ask about budget approval"
                  : mode === "techdocs"
                  ? "- Cover setup steps\n- Include code examples\n- Mention common pitfalls"
                  : "e.g., Focus on privacy-first approach and local processing..."
                }
                rows={mode === "email" ? 3 : mode === "techdocs" ? 4 : 2}
                className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
              />
            </div>
          )}

          {/* Custom instruction (rewrite & custom modes) */}
          {(mode === "rewrite" || mode === "custom") && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {mode === "custom" ? "Instruction" : "Custom instruction (optional)"}
              </label>
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={mode === "custom"
                  ? 'e.g., "Summarize this for a 5th grader"'
                  : 'e.g., "Make it sound like a pirate"'
                }
                className="w-full bg-bg-elevated border border-border px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          )}

          {/* Generate button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={disableButton}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-accent-fg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStreaming || isModelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {buttonLabel}
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

          <p className="text-text-tertiary text-xs">Generated by local AI — may contain errors.</p>
        </div>
      </FeatureLock>
    </div>
  );
}
