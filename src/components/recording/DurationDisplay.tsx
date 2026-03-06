"use client";

import { Bookmark as BookmarkIcon } from "lucide-react";
import type { Bookmark } from "@/lib/recording/types";

interface DurationDisplayProps {
  duration: number; // milliseconds
  bookmarks?: Bookmark[];
  className?: string;
  showHours?: boolean;
}

export function formatDuration(ms: number, showHours = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (showHours || hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function DurationDisplay({
  duration,
  bookmarks,
  className,
  showHours,
}: DurationDisplayProps) {
  const hasBookmarks = bookmarks && bookmarks.length > 0;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="font-mono text-2xl tabular-nums text-text-primary">
        {formatDuration(duration, showHours)}
      </span>
      {hasBookmarks && (
        <span className="flex items-center gap-1 text-xs text-text-tertiary">
          <BookmarkIcon className="w-3 h-3" />
          {bookmarks.length}
        </span>
      )}
    </div>
  );
}
