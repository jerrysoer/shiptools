"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { onAnalyticsEvent } from "@/lib/analytics";
import type { AnalyticsEvent } from "@/lib/types";

interface LogEntry {
  id: number;
  event: AnalyticsEvent;
  wouldSend: boolean;
  time: string;
}

let nextId = 0;

export default function TelemetryPreview() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAnalyticsEvent((event: AnalyticsEvent, wouldSend: boolean) => {
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setEntries((prev) => {
        const next = [...prev, { id: nextId++, event, wouldSend, time }];
        return next.slice(-20); // Cap at 20
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="bg-bg-surface border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Terminal className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-semibold text-sm">Live Event Log</h3>
        <span className="text-text-tertiary text-xs ml-auto">
          {entries.length} event{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto p-3 space-y-1.5 font-mono text-xs"
      >
        {entries.length === 0 && (
          <div className="text-text-tertiary text-center py-8">
            Navigate around the site to see live analytics events...
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2">
            <span className="text-text-tertiary shrink-0">{entry.time}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                entry.wouldSend
                  ? "bg-grade-a/10 text-grade-a"
                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              }`}
            >
              {entry.wouldSend ? "sent" : "blocked"}
            </span>
            <span className="text-accent font-semibold">{entry.event.event}</span>
            {entry.event.properties &&
              Object.keys(entry.event.properties).length > 0 && (
                <span className="text-text-tertiary break-all">
                  {JSON.stringify(entry.event.properties)}
                </span>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
