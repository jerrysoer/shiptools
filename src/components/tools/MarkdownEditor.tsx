"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileText,
  Bold,
  Italic,
  Heading1,
  Link,
  Code,
  List,
  Quote,
  Minus,
} from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

// ── Simple regex-based markdown renderer ────────────────
function renderMarkdown(md: string): string {
  // Escape HTML
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ... ```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre class="md-code-block"><code>${code.trim()}</code></pre>`
  );

  // Split into lines for block-level processing
  const lines = html.split("\n");
  const processed: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip lines inside code blocks (already processed)
    if (line.includes('<pre class="md-code-block">')) {
      // Find the closing </pre> and pass through as-is
      processed.push(line);
      while (!line.includes("</pre>") && i < lines.length - 1) {
        i++;
        line = lines[i];
        processed.push(line);
      }
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) {
        processed.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }
      processed.push("<hr />");
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) {
        processed.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }
      const level = headingMatch[1].length;
      processed.push(`<h${level}>${applyInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("&gt; ")) {
      if (inList) {
        processed.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
        listType = null;
      }
      processed.push(
        `<blockquote>${applyInline(line.slice(5))}</blockquote>`
      );
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) processed.push(listType === "ol" ? "</ol>" : "</ul>");
        processed.push("<ul>");
        inList = true;
        listType = "ul";
      }
      processed.push(`<li>${applyInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) processed.push(listType === "ol" ? "</ol>" : "</ul>");
        processed.push("<ol>");
        inList = true;
        listType = "ol";
      }
      processed.push(`<li>${applyInline(olMatch[1])}</li>`);
      continue;
    }

    // Close list if we've left it
    if (inList && line.trim() === "") {
      processed.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = null;
    }

    // Regular paragraph
    if (line.trim()) {
      processed.push(`<p>${applyInline(line)}</p>`);
    } else {
      processed.push("");
    }
  }

  if (inList) {
    processed.push(listType === "ol" ? "</ol>" : "</ul>");
  }

  return processed.join("\n");
}

/** Apply inline formatting: bold, italic, inline code, links, images */
function applyInline(text: string): string {
  // Inline code (must come before bold/italic to avoid conflicts)
  text = text.replace(
    /`([^`]+)`/g,
    '<code class="md-inline-code">$1</code>'
  );
  // Images ![alt](url) — only allow safe protocols
  text = text.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m: string, alt: string, url: string) => {
      const safe = /^(https?:|\/|data:image\/)/i.test(url) ? url : "#";
      return `<img alt="${alt}" src="${safe}" class="md-img" />`;
    }
  );
  // Links [text](url) — only allow safe protocols
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m: string, label: string, url: string) => {
      const safe = /^(https?:|mailto:|#|\/)/i.test(url) ? url : "#";
      return `<a href="${safe}" class="md-link" target="_blank" rel="noopener">${label}</a>`;
    }
  );
  // Bold **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");
  // Italic *text* or _text_
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");
  return text;
}

// ── Toolbar helper ──────────────────────────────────────
type ToolbarAction = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
};

const TOOLBAR: ToolbarAction[] = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italic", prefix: "*", suffix: "*" },
  { icon: Heading1, label: "Heading", prefix: "## ", suffix: "", block: true },
  { icon: Link, label: "Link", prefix: "[", suffix: "](url)" },
  { icon: Code, label: "Code", prefix: "`", suffix: "`" },
  { icon: List, label: "List", prefix: "- ", suffix: "", block: true },
  { icon: Quote, label: "Quote", prefix: "> ", suffix: "", block: true },
  { icon: Minus, label: "Rule", prefix: "\n---\n", suffix: "", block: true },
];

const SAMPLE = `# Welcome to Markdown

This is a **bold** and *italic* example.

## Features

- Headings, bold, italic
- [Links](https://example.com)
- \`inline code\` and code blocks

\`\`\`js
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> Blockquotes look like this.

---

1. Ordered lists
2. Work too
`;

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(SAMPLE);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasTrackedUse = useRef(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "markdown" });
  }, []);

  const preview = useMemo(() => renderMarkdown(markdown), [markdown]);

  const handleToolbar = useCallback((action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);

    let insert: string;
    if (action.block && !selected) {
      insert = action.prefix + "text" + action.suffix;
    } else {
      insert = action.prefix + (selected || "text") + action.suffix;
    }

    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    const newVal = before + insert + after;
    setMarkdown(newVal);

    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + insert.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMarkdown(e.target.value);
      if (!hasTrackedUse.current) {
        trackEvent("tool_used", { tool: "markdown" });
        hasTrackedUse.current = true;
      }
    },
    []
  );

  return (
    <div>
      <ToolPageHeader
        icon={FileText}
        title="Markdown Editor"
        description="Write Markdown with a live preview. Toolbar included."
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-bg-surface border border-border rounded-xl mb-4">
        {TOOLBAR.map((action) => (
          <button
            key={action.label}
            onClick={() => handleToolbar(action)}
            title={action.label}
            className="p-2 rounded-lg hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
          >
            <action.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor pane */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
            Markdown
          </label>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={handleChange}
            spellCheck={false}
            className="w-full h-[500px] bg-transparent text-sm font-mono resize-none outline-none placeholder:text-text-tertiary"
          />
        </div>

        {/* Preview pane */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
            Preview
          </label>
          <div
            className="md-preview prose prose-sm max-w-none h-[500px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>

      {/* Preview styles */}
      <style jsx global>{`
        .md-preview h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0 0.3em; }
        .md-preview h2 { font-size: 1.3em; font-weight: 600; margin: 0.5em 0 0.3em; }
        .md-preview h3 { font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.3em; }
        .md-preview h4, .md-preview h5, .md-preview h6 { font-size: 1em; font-weight: 600; margin: 0.5em 0 0.3em; }
        .md-preview p { margin: 0.4em 0; line-height: 1.6; }
        .md-preview strong { font-weight: 700; }
        .md-preview em { font-style: italic; }
        .md-preview ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .md-preview ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .md-preview li { margin: 0.15em 0; line-height: 1.5; }
        .md-preview blockquote {
          border-left: 3px solid var(--color-accent, #6366f1);
          padding: 0.3em 0.8em;
          margin: 0.5em 0;
          color: var(--color-text-secondary, #888);
        }
        .md-preview hr { border: none; border-top: 1px solid var(--color-border, #333); margin: 1em 0; }
        .md-preview .md-code-block {
          background: var(--color-bg-elevated, #1a1a2e);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          overflow-x: auto;
          font-size: 0.85em;
          margin: 0.5em 0;
        }
        .md-preview .md-code-block code { font-family: var(--font-mono, monospace); }
        .md-preview .md-inline-code {
          background: var(--color-bg-elevated, #1a1a2e);
          padding: 0.15em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: var(--font-mono, monospace);
        }
        .md-preview .md-link { color: var(--color-accent, #6366f1); text-decoration: underline; }
        .md-preview .md-img { max-width: 100%; border-radius: 0.5rem; margin: 0.5em 0; }
      `}</style>
    </div>
  );
}
