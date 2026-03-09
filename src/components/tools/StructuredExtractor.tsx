"use client";

import { useState, useCallback, useEffect } from "react";
import { FileJson, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { PROMPTS } from "@/lib/ai/prompts";
import AIChip from "@/components/AIChip";
import FeatureLock from "@/components/ai/FeatureLock";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

export default function StructuredExtractor() {
  const { isReady, isSupported, loadModel, streamInfer, status } = useLocalAI();
  const [schema, setSchema] = useState("");
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "structured_extractor" });
  }, []);

  const handleExtract = useCallback(async () => {
    if (!inputText.trim() || !schema.trim()) return;

    if (!isReady) {
      await loadModel();
    }

    setOutput("");
    setFormattedOutput("");
    setIsStreaming(true);

    let rawOutput = "";

    const userMessage = `JSON Schema:\n${schema}\n\nText to extract from:\n${inputText}`;

    try {
      await streamInfer(
        userMessage,
        PROMPTS.structuredExtractor,
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

      trackEvent("ai_tool_used", { tool: "structured_extractor" });
    } catch {
      setOutput("Error: Failed to extract data. Please try again.");
      setFormattedOutput("");
    } finally {
      setIsStreaming(false);
    }
  }, [schema, inputText, isReady, loadModel, streamInfer]);

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
        icon={FileJson}
        title="Structured Extractor"
        description="Define a JSON schema and paste unstructured text. AI extracts matching data into structured JSON."
      />

      <FeatureLock requiredCapability="extract_json">
        <div className="space-y-6">
          {/* Schema input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              JSON schema (what you want to extract)
            </label>
            <textarea
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder={'{\n  "name": "string",\n  "email": "string",\n  "company": "string",\n  "role": "string"\n}'}
              rows={6}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y font-mono"
            />
          </div>

          {/* Input text */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Text to extract from
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the unstructured text you want to extract data from..."
              rows={6}
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
            />
            <p className="text-text-tertiary text-xs mt-1">
              {inputText.length.toLocaleString()} characters
            </p>
          </div>

          {/* Extract button */}
          {!isSupported ? (
            <p className="text-text-tertiary text-sm">
              WebGPU required. Try Chrome or Edge, or install Ollama.
            </p>
          ) : (
            <button
              onClick={handleExtract}
              disabled={
                !inputText.trim() ||
                !schema.trim() ||
                isStreaming ||
                isModelLoading
              }
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
                  ? "Extracting..."
                  : "Extract Data"}
            </button>
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
