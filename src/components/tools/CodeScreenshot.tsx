"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Download, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

// ── Theme definitions ───────────────────────────────────
type ThemeName = "dark" | "light" | "monokai";

interface Theme {
  bg: string;
  text: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  border: string;
  label: string;
}

const THEMES: Record<ThemeName, Theme> = {
  dark: {
    bg: "#1e1e2e",
    text: "#cdd6f4",
    keyword: "#cba6f7",
    string: "#a6e3a1",
    comment: "#6c7086",
    number: "#fab387",
    function: "#89b4fa",
    border: "#313244",
    label: "Dark",
  },
  light: {
    bg: "#ffffff",
    text: "#1e1e2e",
    keyword: "#8839ef",
    string: "#40a02b",
    comment: "#9ca0b0",
    number: "#fe640b",
    function: "#1e66f5",
    border: "#dce0e8",
    label: "Light",
  },
  monokai: {
    bg: "#272822",
    text: "#f8f8f2",
    keyword: "#f92672",
    string: "#e6db74",
    comment: "#75715e",
    number: "#ae81ff",
    function: "#a6e22e",
    border: "#3e3d32",
    label: "Monokai",
  },
};

// ── Language definitions ────────────────────────────────
type LangName = "javascript" | "typescript" | "python" | "css" | "html";

interface LangDef {
  keywords: string[];
  lineComment: string;
  blockCommentStart?: string;
  blockCommentEnd?: string;
  label: string;
}

const LANGUAGES: Record<LangName, LangDef> = {
  javascript: {
    keywords: [
      "const", "let", "var", "function", "return", "if", "else", "for",
      "while", "do", "switch", "case", "break", "continue", "new", "this",
      "class", "extends", "import", "export", "from", "default", "async",
      "await", "try", "catch", "throw", "typeof", "instanceof", "null",
      "undefined", "true", "false", "of", "in",
    ],
    lineComment: "//",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    label: "JavaScript",
  },
  typescript: {
    keywords: [
      "const", "let", "var", "function", "return", "if", "else", "for",
      "while", "do", "switch", "case", "break", "continue", "new", "this",
      "class", "extends", "import", "export", "from", "default", "async",
      "await", "try", "catch", "throw", "typeof", "instanceof", "null",
      "undefined", "true", "false", "of", "in", "type", "interface",
      "enum", "implements", "readonly", "as", "is", "keyof",
    ],
    lineComment: "//",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    label: "TypeScript",
  },
  python: {
    keywords: [
      "def", "class", "return", "if", "elif", "else", "for", "while",
      "import", "from", "as", "try", "except", "finally", "raise", "with",
      "lambda", "yield", "pass", "break", "continue", "and", "or", "not",
      "in", "is", "None", "True", "False", "self", "async", "await",
    ],
    lineComment: "#",
    label: "Python",
  },
  css: {
    keywords: [
      "@media", "@keyframes", "@import", "@font-face", "@supports",
      "!important", "inherit", "initial", "unset", "var",
    ],
    lineComment: "",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    label: "CSS",
  },
  html: {
    keywords: [
      "DOCTYPE", "html", "head", "body", "div", "span", "p", "a", "img",
      "script", "style", "link", "meta", "title", "section", "main",
      "header", "footer", "nav", "ul", "li", "ol", "table", "tr", "td",
      "th", "form", "input", "button", "label", "select", "option",
    ],
    lineComment: "",
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",
    label: "HTML",
  },
};

// ── Simple syntax highlighter ───────────────────────────
function highlightCode(code: string, lang: LangName, theme: Theme): string {
  const def = LANGUAGES[lang];
  const lines = code.split("\n");

  return lines
    .map((line) => {
      let result = escapeHtml(line);

      // Comments (line)
      if (def.lineComment && result.trimStart().startsWith(escapeHtml(def.lineComment))) {
        return `<span style="color:${theme.comment}">${result}</span>`;
      }

      // Strings (double and single quotes)
      result = result.replace(
        /(&quot;|&#39;|"|')((?:(?!\1).)*?)\1/g,
        `<span style="color:${theme.string}">$1$2$1</span>`
      );

      // Numbers
      result = result.replace(
        /\b(\d+\.?\d*)\b/g,
        `<span style="color:${theme.number}">$1</span>`
      );

      // Keywords
      for (const kw of def.keywords) {
        const regex = new RegExp(`\\b(${escapeRegex(kw)})\\b`, "g");
        result = result.replace(
          regex,
          `<span style="color:${theme.keyword}">$1</span>`
        );
      }

      // Function calls (word followed by parenthesis)
      result = result.replace(
        /\b([a-zA-Z_]\w*)\s*(?=\()/g,
        `<span style="color:${theme.function}">$1</span>`
      );

      return result;
    })
    .join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SAMPLE_CODE = `// A simple greeting function
function greet(name) {
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

greet("World");`;

const PADDING_OPTIONS = [16, 32, 48, 64] as const;

export default function CodeScreenshot() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [lang, setLang] = useState<LangName>("javascript");
  const [padding, setPadding] = useState<number>(32);
  const [bgColor, setBgColor] = useState("#667eea");
  const [borderRadius, setBorderRadius] = useState(12);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "code-screenshot" });
  }, []);

  const t = THEMES[theme];

  const highlighted = highlightCode(code, lang, t);
  const lineCount = code.split("\n").length;

  const handleDownload = useCallback(async () => {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "code-screenshot.png";
      a.click();
      trackEvent("tool_used", { tool: "code-screenshot" });
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleCopyImage = useCallback(async () => {
    if (!captureRef.current) return;
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(captureRef.current, { pixelRatio: 2 });
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, []);

  return (
    <div>
      <ToolPageHeader
        icon={Camera}
        title="Code Screenshot"
        description="Create beautiful code screenshots with syntax highlighting and custom themes."
      />

      {/* Controls */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Theme */}
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeName)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {Object.entries(THEMES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
              Language
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangName)}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {Object.entries(LANGUAGES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Padding */}
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
              Padding
            </label>
            <select
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {PADDING_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}px
                </option>
              ))}
            </select>
          </div>

          {/* Border Radius */}
          <div>
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
              Radius
            </label>
            <input
              type="range"
              min={0}
              max={24}
              value={borderRadius}
              onChange={(e) => setBorderRadius(Number(e.target.value))}
              className="w-full accent-accent mt-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Background color */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Background
            </label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <span className="text-xs font-mono text-text-tertiary">
              {bgColor}
            </span>
          </div>

          {/* Line numbers toggle */}
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="accent-accent"
            />
            Line numbers
          </label>
        </div>
      </div>

      {/* Code input */}
      <div className="bg-bg-surface border border-border rounded-xl p-4 mb-6">
        <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-2">
          Code
        </label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          rows={10}
          className="w-full bg-transparent text-sm font-mono resize-none outline-none placeholder:text-text-tertiary"
          placeholder="Paste your code here..."
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={handleDownload}
          disabled={downloading || !code.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-fg font-medium hover:bg-accent/90 transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Capturing..." : "Download PNG"}
        </button>
        <button
          onClick={handleCopyImage}
          disabled={!code.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-elevated transition-colors disabled:opacity-40"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied" : "Copy Image"}
        </button>
      </div>

      {/* Preview / capture target */}
      <div className="flex justify-center">
        <div
          ref={captureRef}
          style={{
            padding: `${padding}px`,
            background: bgColor,
            borderRadius: `${borderRadius}px`,
          }}
          className="inline-block max-w-full"
        >
          {/* Window chrome */}
          <div
            style={{
              background: t.bg,
              borderRadius: `${Math.max(borderRadius - 4, 0)}px`,
              border: `1px solid ${t.border}`,
              overflow: "hidden",
            }}
          >
            {/* Title bar dots */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: `1px solid ${t.border}` }}
            >
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>

            {/* Code content */}
            <div className="p-4 overflow-x-auto">
              <pre
                style={{
                  color: t.text,
                  fontSize: "14px",
                  lineHeight: "1.6",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  margin: 0,
                }}
              >
                {code.split("\n").map((_, idx) => (
                  <div key={idx} className="flex">
                    {showLineNumbers && (
                      <span
                        style={{
                          color: t.comment,
                          minWidth: `${String(lineCount).length + 1}ch`,
                          textAlign: "right",
                          paddingRight: "1.5em",
                          userSelect: "none",
                        }}
                      >
                        {idx + 1}
                      </span>
                    )}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlighted.split("\n")[idx] || "",
                      }}
                    />
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
