"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Binary, Copy, Check, FileUp, Type, ArrowRightLeft } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type Direction = "encode" | "decode" | "auto";
type InputMode = "text" | "file";

function isValidBase64(str: string): boolean {
  if (str.length === 0) return false;
  // Strip whitespace for validation
  const cleaned = str.replace(/\s/g, "");
  if (cleaned.length === 0) return false;
  try {
    const decoded = atob(cleaned);
    // Check it re-encodes to the same thing (round-trip)
    return btoa(decoded) === cleaned;
  } catch {
    return false;
  }
}

function utf8ToBase64(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const cleaned = b64.replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

export default function Base64Tool() {
  useEffect(() => { trackEvent("tool_opened", { tool: "base64" }); }, []);

  const [direction, setDirection] = useState<Direction>("auto");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [actualDirection, setActualDirection] = useState<
    "encode" | "decode" | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = useCallback(
    (text: string, dir: Direction) => {
      if (!text.trim()) {
        setOutput("");
        setActualDirection(null);
        setError(null);
        return;
      }

      setError(null);

      let resolvedDir: "encode" | "decode";
      if (dir === "auto") {
        resolvedDir = isValidBase64(text) ? "decode" : "encode";
      } else {
        resolvedDir = dir;
      }

      try {
        if (resolvedDir === "encode") {
          setOutput(utf8ToBase64(text));
        } else {
          setOutput(base64ToUtf8(text));
        }
        setActualDirection(resolvedDir);
        trackEvent("tool_used", { tool: "base64" });
      } catch {
        setError(
          resolvedDir === "decode"
            ? "Invalid Base64 input."
            : "Encoding failed."
        );
        setOutput("");
        setActualDirection(null);
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      processText(text, direction);
    },
    [direction, processText]
  );

  const handleDirectionChange = useCallback(
    (dir: Direction) => {
      setDirection(dir);
      processText(input, dir);
    },
    [input, processText]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // readAsDataURL gives "data:<mime>;base64,<data>"
        const base64 = dataUrl.split(",")[1] ?? "";
        setInput(`[File: ${file.name}]`);
        setOutput(base64);
        setActualDirection("encode");
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      };
      reader.readAsDataURL(file);

      // Reset so same file can be re-selected
      e.target.value = "";
    },
    []
  );

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const handleSwap = useCallback(() => {
    if (!output || inputMode === "file") return;
    setInput(output);
    processText(output, direction);
  }, [output, inputMode, direction, processText]);

  return (
    <div>
      <ToolPageHeader
        icon={Binary}
        title="Base64 Encode / Decode"
        description="Encode and decode Base64 for text and files. Supports UTF-8 and auto-detects direction."
      />
      <div className="space-y-5">

      {/* Controls row */}
      <div className="flex flex-wrap gap-3">
        {/* Input mode toggle */}
        <div className="flex gap-1 p-1 bg-bg-surface border border-border">
          <button
            onClick={() => {
              setInputMode("text");
              setInput("");
              setOutput("");
              setFileName(null);
              setError(null);
              setActualDirection(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              inputMode === "text"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Text
          </button>
          <button
            onClick={() => {
              setInputMode("file");
              setInput("");
              setOutput("");
              setFileName(null);
              setError(null);
              setActualDirection(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              inputMode === "file"
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            File
          </button>
        </div>

        {/* Direction selector (text mode only) */}
        {inputMode === "text" && (
          <div className="flex gap-1 p-1 bg-bg-surface border border-border">
            {(["auto", "encode", "decode"] as Direction[]).map((dir) => (
              <button
                key={dir}
                onClick={() => handleDirectionChange(dir)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  direction === dir
                    ? "bg-accent text-accent-fg"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {inputMode === "text" ? (
        <div>
          <label
            htmlFor="base64-input"
            className="block text-sm font-medium mb-1.5"
          >
            Input
          </label>
          <textarea
            id="base64-input"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste text or Base64 string..."
            rows={6}
            className="w-full bg-bg-surface border border-border px-4 py-3 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-y"
          />
        </div>
      ) : (
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-bg-elevated border border-border px-4 py-2 text-sm font-medium hover:border-border-hover transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              {fileName ? fileName : "Choose a file"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Swap button (text mode) */}
      {inputMode === "text" && output && (
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            className="text-text-tertiary hover:text-accent transition-colors p-1"
            title="Swap input and output"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Output */}
      {(output || error) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium">
              Output
              {actualDirection && (
                <span className="text-text-tertiary font-normal ml-2">
                  ({actualDirection === "encode" ? "Encoded" : "Decoded"})
                </span>
              )}
            </label>
            {output && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-grade-a" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {error ? (
            <p className="text-grade-f text-sm">{error}</p>
          ) : (
            <textarea
              readOnly
              value={output}
              rows={6}
              className="w-full bg-bg-surface border border-border px-4 py-3 text-sm font-mono text-text-secondary focus:outline-none resize-y"
            />
          )}
        </div>
      )}
      </div>
    </div>
  );
}
