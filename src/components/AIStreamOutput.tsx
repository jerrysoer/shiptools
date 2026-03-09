"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

interface AIStreamOutputProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

/** Strip lone surrogates that small quantized models emit as broken emoji. */
function sanitizeStreamText(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  h2: ({ children }) => (
    <h2 className="font-semibold text-base mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-semibold text-sm mt-2 mb-1">{children}</h3>
  ),
  code: ({ children }) => (
    <code className="bg-bg-surface px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
};

/**
 * Reusable streaming text output component.
 * Shows token-by-token rendering with a blinking cursor during streaming.
 */
export default function AIStreamOutput({
  content,
  isStreaming,
  className = "",
}: AIStreamOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  if (!content && !isStreaming) return null;

  return (
    <div
      ref={containerRef}
      className={`bg-bg-elevated border border-border p-4 text-sm text-text-primary leading-relaxed overflow-y-auto max-h-96 ${className}`}
    >
      <ReactMarkdown components={mdComponents}>
        {sanitizeStreamText(content)}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}
