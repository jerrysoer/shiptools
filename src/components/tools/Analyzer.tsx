"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FileSearch, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIStreamOutput from "@/components/AIStreamOutput";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import FileTextInput from "@/components/FileTextInput";
import { trackEvent } from "@/lib/analytics";
import type { ModelCapability } from "@/lib/ai/registry";

// ── Mode config ─────────────────────────────────────────────────────────

type AnalyzerMode = "contract" | "job" | "meeting" | "sentiment" | "keywords" | "swot" | "custom";

interface AnalyzerModeConfig {
  value: AnalyzerMode;
  label: string;
  capability: ModelCapability;
  promptKey: keyof typeof PROMPTS;
  userPromptPrefix: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputRows: number;
  buttonLabel: string;
  streamingLabel: string;
  showIndustryInput: boolean;
  disclaimer?: string;
}

const MODE_CONFIGS: AnalyzerModeConfig[] = [
  {
    value: "contract",
    label: "Contract",
    capability: "contract_analyze",
    promptKey: "contractAnalyzer",
    userPromptPrefix: "Analyze the following contract or legal agreement:\n\n",
    inputLabel: "Contract text",
    inputPlaceholder: "Paste the contract or legal agreement text here...",
    inputRows: 10,
    buttonLabel: "Analyze Contract",
    streamingLabel: "Analyzing...",
    showIndustryInput: false,
    disclaimer: "This is not legal advice. Consult a qualified attorney for important decisions.",
  },
  {
    value: "job",
    label: "Job Posting",
    capability: "job_analyze",
    promptKey: "jobDescriptionAnalyzer",
    userPromptPrefix: "Analyze the following job description:\n\n",
    inputLabel: "Job description",
    inputPlaceholder: "Paste the full job description here...",
    inputRows: 10,
    buttonLabel: "Analyze Job Description",
    streamingLabel: "Analyzing...",
    showIndustryInput: false,
  },
  {
    value: "meeting",
    label: "Meeting Notes",
    capability: "meeting_minutes",
    promptKey: "meetingMinutesGenerator",
    userPromptPrefix: "Generate structured meeting minutes from the following transcript or notes:\n\n",
    inputLabel: "Meeting transcript or notes",
    inputPlaceholder: "Paste your meeting transcript, rough notes, or bullet points here...",
    inputRows: 10,
    buttonLabel: "Generate Minutes",
    streamingLabel: "Generating...",
    showIndustryInput: false,
  },
  {
    value: "sentiment",
    label: "Sentiment",
    capability: "sentiment",
    promptKey: "sentimentAnalyzer",
    userPromptPrefix: "Analyze the sentiment of the following text:\n\n",
    inputLabel: "Text to analyze",
    inputPlaceholder: "Paste the text you want to analyze for sentiment...",
    inputRows: 8,
    buttonLabel: "Analyze Sentiment",
    streamingLabel: "Analyzing...",
    showIndustryInput: false,
  },
  {
    value: "keywords",
    label: "Keywords",
    capability: "keywords",
    promptKey: "keywordExtractor",
    userPromptPrefix: "Extract keywords from the following text:\n\n",
    inputLabel: "Text to extract keywords from",
    inputPlaceholder: "Paste your text here...",
    inputRows: 8,
    buttonLabel: "Extract Keywords",
    streamingLabel: "Extracting...",
    showIndustryInput: false,
  },
  {
    value: "swot",
    label: "SWOT",
    capability: "swot",
    promptKey: "swotAnalyzer",
    userPromptPrefix: "Business/project description:\n",
    inputLabel: "Business or project description",
    inputPlaceholder: "Describe your business, product, or project in detail...",
    inputRows: 6,
    buttonLabel: "Analyze",
    streamingLabel: "Analyzing...",
    showIndustryInput: true,
  },
  {
    value: "custom",
    label: "Custom",
    capability: "sentiment",
    promptKey: "sentimentAnalyzer",
    userPromptPrefix: "",
    inputLabel: "Text to analyze",
    inputPlaceholder: "Paste text here...",
    inputRows: 8,
    buttonLabel: "Analyze",
    streamingLabel: "Analyzing...",
    showIndustryInput: false,
  },
];

// ── Component ───────────────────────────────────────────────────────────

export default function Analyzer() {
  const searchParams = useSearchParams();
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();

  const initialMode = (searchParams.get("mode") ?? "contract") as AnalyzerMode;
  const validMode = MODE_CONFIGS.some((c) => c.value === initialMode) ? initialMode : "contract";

  const [mode, setMode] = useState<AnalyzerMode>(validMode);
  const [input, setInput] = useState("");
  const [industry, setIndustry] = useState("");
  const [instruction, setInstruction] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = MODE_CONFIGS.find((c) => c.value === mode)!;

  useEffect(() => {
    trackEvent("tool_opened", { tool: "analyzer", mode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = useCallback(async () => {
    if (!input.trim()) return;
    if (mode === "custom" && !instruction.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setIsStreaming(true);

    let userMessage: string;
    if (mode === "custom") {
      userMessage = `${instruction}\n\n${input}`;
    } else if (mode === "swot") {
      userMessage = [
        `${config.userPromptPrefix}${input}`,
        industry.trim() ? `\nIndustry/context: ${industry}` : "",
      ].filter(Boolean).join("\n");
    } else {
      userMessage = `${config.userPromptPrefix}${input}`;
    }

    try {
      await streamInfer(
        userMessage,
        PROMPTS[config.promptKey],
        (token) => setOutput((prev) => prev + token),
      );
      trackEvent("ai_tool_used", { tool: "analyzer", mode });
    } catch {
      setOutput("Error: Failed to analyze. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, industry, instruction, mode, config, isReady, loadModel, streamInfer]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isModelLoading = status === "downloading" || status === "loading";

  const disableButton = mode === "custom"
    ? !input.trim() || !instruction.trim() || isStreaming || isModelLoading
    : !input.trim() || isStreaming || isModelLoading;

  return (
    <div>
      <ToolPageHeader
        icon={FileSearch}
        title="Analyzer"
        description="Analyze contracts, job postings, meeting notes, sentiment, keywords, and SWOT — all locally in your browser."
      />

      <FeatureLock requiredCapability={config.capability}>
        <div className="space-y-6">
          {/* Mode selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Mode</label>
            <div className="flex flex-wrap gap-2">
              {MODE_CONFIGS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setMode(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mode === c.value
                      ? "bg-accent text-accent-fg"
                      : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* File upload */}
          <FileTextInput onTextExtracted={(text) => setInput(text)} />

          {/* Primary input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {config.inputLabel}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={config.inputPlaceholder}
              rows={config.inputRows}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
            <p className="text-text-tertiary text-xs mt-1">
              {input.length.toLocaleString()} characters
            </p>
          </div>

          {/* Industry input (SWOT only) */}
          {config.showIndustryInput && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Industry / context{" "}
                <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., SaaS, Healthcare, E-commerce, Education"
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          )}

          {/* Custom instruction (custom mode only) */}
          {mode === "custom" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Instruction
              </label>
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='e.g., "Identify all risks and liabilities"'
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          )}

          {/* Analyze button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={disableButton}
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
                  ? config.streamingLabel
                  : config.buttonLabel}
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

          {/* Legal disclaimer (contract mode only) */}
          {config.disclaimer && (
            <div className="p-3 bg-bg-elevated border border-border rounded-lg">
              <p className="text-text-tertiary text-xs">{config.disclaimer}</p>
            </div>
          )}

          <p className="text-text-tertiary text-xs">Generated by local AI — may contain errors.</p>
        </div>
      </FeatureLock>
    </div>
  );
}
