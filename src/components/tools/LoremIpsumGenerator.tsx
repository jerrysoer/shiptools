"use client";

import { useState, useEffect, useCallback } from "react";
import { Type, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Word pool ───────────────────────────────── */

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
  "accusamus", "dignissimos", "ducimus", "blanditiis", "praesentium", "voluptatum",
  "deleniti", "atque", "corrupti", "quos", "dolores", "quas", "molestias",
  "excepturi", "obcaecati", "cupiditate", "provident", "similique", "explicabo",
  "nemo", "ipsam", "voluptatem", "quia", "voluptas", "aspernatur", "aut",
  "odit", "fugit", "consequuntur", "magni", "ratione", "sequi", "nesciunt",
  "neque", "porro", "quisquam", "numquam", "eius", "modi", "tempora",
  "corporis", "suscipit", "laboriosam", "nihil", "impedit", "quo", "minus",
];

const FIRST_SENTENCE = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

/* ── Generators ──────────────────────────────── */

function randomWord(): string {
  return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]!;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateSentence(minWords = 6, maxWords = 14): string {
  const len = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const words = Array.from({ length: len }, () => randomWord());
  words[0] = capitalize(words[0]!);
  // Insert comma randomly in longer sentences
  if (len > 8) {
    const commaPos = 3 + Math.floor(Math.random() * (len - 5));
    words[commaPos] = words[commaPos] + ",";
  }
  return words.join(" ") + ".";
}

function generateParagraph(sentenceCount = 4): string {
  const sentences = Array.from({ length: sentenceCount }, () => generateSentence());
  return sentences.join(" ");
}

function generateWords(count: number): string {
  const words = Array.from({ length: count }, () => randomWord());
  words[0] = capitalize(words[0]!);
  return words.join(" ");
}

function generateSentences(count: number, startWithLorem: boolean): string {
  const sentences: string[] = [];
  if (startWithLorem && count > 0) {
    sentences.push(FIRST_SENTENCE);
    count--;
  }
  for (let i = 0; i < count; i++) {
    sentences.push(generateSentence());
  }
  return sentences.join(" ");
}

function generateParagraphs(count: number, startWithLorem: boolean): string {
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0 && startWithLorem) {
      paragraphs.push(FIRST_SENTENCE + " " + generateParagraph(3));
    } else {
      paragraphs.push(generateParagraph());
    }
  }
  return paragraphs.join("\n\n");
}

/* ── Component ───────────────────────────────── */

type Unit = "paragraphs" | "sentences" | "words";

export default function LoremIpsumGenerator() {
  const [unit, setUnit] = useState<Unit>("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "lorem" });
  }, []);

  const generate = useCallback(() => {
    let text = "";
    switch (unit) {
      case "paragraphs":
        text = generateParagraphs(count, startWithLorem);
        break;
      case "sentences":
        text = generateSentences(count, startWithLorem);
        break;
      case "words":
        text = generateWords(count);
        break;
    }
    setOutput(text);
    trackEvent("tool_used", { tool: "lorem" });
  }, [unit, count, startWithLorem]);

  // Auto-generate on mount and when settings change
  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const wordCount = output.split(/\s+/).filter(Boolean).length;
  const charCount = output.length;

  return (
    <div>
      <ToolPageHeader
        icon={Type}
        title="Lorem Ipsum Generator"
        description="Generate classic lorem ipsum placeholder text by paragraphs, sentences, or words."
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Count */}
        <div>
          <label htmlFor="lorem-count" className="block text-xs text-text-tertiary mb-1 font-medium uppercase tracking-wider">
            Count
          </label>
          <input
            id="lorem-count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-20 bg-bg-surface border border-border px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
          />
        </div>

        {/* Unit toggle */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1 font-medium uppercase tracking-wider">
            Unit
          </label>
          <div className="flex gap-1 p-1 bg-bg-surface border border-border">
            {(["paragraphs", "sentences", "words"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  unit === u
                    ? "bg-accent text-accent-fg"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Start with "Lorem ipsum" */}
        {unit !== "words" && (
          <div className="flex items-end h-full">
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={startWithLorem}
                onChange={(e) => setStartWithLorem(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-xs text-text-secondary">
                Start with &quot;Lorem ipsum...&quot;
              </span>
            </label>
          </div>
        )}

        {/* Regenerate */}
        <div className="flex items-end ml-auto">
          <button
            onClick={generate}
            className="bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 transition-colors text-sm font-medium"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium">Output</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">
              {wordCount} words / {charCount} chars
            </span>
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
          </div>
        </div>
        <textarea
          readOnly
          value={output}
          rows={12}
          className="w-full bg-bg-surface border border-border px-4 py-3 text-sm text-text-secondary focus:outline-none resize-y"
        />
      </div>
    </div>
  );
}
