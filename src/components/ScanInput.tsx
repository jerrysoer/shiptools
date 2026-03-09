"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface ScanInputProps {
  onScan: (url: string) => void;
  isScanning: boolean;
}

export default function ScanInput({ onScan, isScanning }: ScanInputProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isScanning) return;
    onScan(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter a URL to audit (e.g., ilovepdf.com)"
          disabled={isScanning}
          className="w-full bg-bg-surface border border-border px-5 py-4 pr-14 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono text-sm disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={isScanning || !url.trim()}
          className="absolute right-2 p-2.5 bg-accent hover:bg-accent-hover text-accent-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Start scan"
        >
          {isScanning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}
