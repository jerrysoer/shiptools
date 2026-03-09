"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { FileText, Eraser } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

interface Stats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTime: string;
  speakingTime: string;
}

function formatTime(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  const m = Math.ceil(minutes);
  return `${m} min`;
}

function computeStats(text: string): Stats {
  if (!text.trim()) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingTime: "0 min",
      speakingTime: "0 min",
    };
  }

  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.!?]+(?=\s|$)/g) || []).length || (words > 0 ? 1 : 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const lines = text.split("\n").length;

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingTime: formatTime(words / 200),
    speakingTime: formatTime(words / 130),
  };
}

const STAT_LABELS: { key: keyof Stats; label: string }[] = [
  { key: "words", label: "Words" },
  { key: "characters", label: "Characters" },
  { key: "charactersNoSpaces", label: "Chars (no spaces)" },
  { key: "sentences", label: "Sentences" },
  { key: "paragraphs", label: "Paragraphs" },
  { key: "lines", label: "Lines" },
  { key: "readingTime", label: "Reading Time" },
  { key: "speakingTime", label: "Speaking Time" },
];

export default function WordCounter() {
  useEffect(() => { trackEvent("tool_opened", { tool: "wordcount" }); }, []);

  const firedRef = useRef(false);
  const [text, setText] = useState("");
  const stats = useMemo(() => computeStats(text), [text]);

  useEffect(() => {
    if (text.trim() && !firedRef.current) {
      firedRef.current = true;
      trackEvent("tool_used", { tool: "wordcount" });
    }
  }, [text]);

  return (
    <div>
      <ToolPageHeader
        icon={FileText}
        title="Word & Character Counter"
        description="Count words, characters, sentences, paragraphs, and estimate reading time."
      />

      {/* Input */}
      <div className="bg-bg-surface border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-secondary">
            Type or paste your text
          </label>
          {text && (
            <button
              onClick={() => setText("")}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing or paste text here..."
          rows={8}
          className="w-full bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-y"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="bg-bg-surface border border-border p-4 text-center"
          >
            <div className="text-2xl font-bold font-heading text-text-primary">
              {stats[key]}
            </div>
            <div className="text-xs text-text-tertiary mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
