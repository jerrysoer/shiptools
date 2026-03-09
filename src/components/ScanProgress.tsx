"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

interface ScanProgressProps {
  domain: string;
  isActive: boolean;
}

const SCAN_MESSAGES = [
  "Initializing headless browser...",
  "Navigating to target URL...",
  "Intercepting network requests...",
  "Cataloging third-party domains...",
  "Extracting cookies...",
  "Identifying tracker fingerprints...",
  "Checking for session recorders...",
  "Detecting ad networks...",
  "Analyzing server-side processing...",
  "Computing privacy grade...",
];

export default function ScanProgress({ domain, isActive }: ScanProgressProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!isActive) return;

    setLines([`$ uploadless audit ${domain}`]);
    setProgress(0);

    let idx = 0;
    intervalRef.current = setInterval(() => {
      if (idx < SCAN_MESSAGES.length) {
        setLines((prev) => [...prev, `[scan] ${SCAN_MESSAGES[idx]}`]);
        setProgress(Math.round(((idx + 1) / SCAN_MESSAGES.length) * 100));
        idx++;
      }
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [isActive, domain]);

  if (!isActive) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="bg-bg-surface border border-border overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-elevated">
          <Terminal className="w-4 h-4 text-text-tertiary" />
          <span className="text-xs text-text-tertiary font-mono">
            Scanning {domain}
          </span>
          <div className="ml-auto flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-grade-f/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-grade-c/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-grade-a/60" />
          </div>
        </div>

        {/* Terminal body */}
        <div className="p-4 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`scan-line-enter ${
                line.startsWith("$")
                  ? "text-accent"
                  : "text-text-secondary"
              }`}
            >
              {line}
            </div>
          ))}
          <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1" />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-elevated">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
