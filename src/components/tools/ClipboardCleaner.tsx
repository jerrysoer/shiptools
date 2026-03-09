"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Copy, CheckCircle, Trash2, ClipboardPaste } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

interface CleaningReport {
  inlineStyles: number;
  trackingPixels: number;
  hiddenSpans: number;
  styleBlocks: number;
  msoProperties: number;
  dataAttributes: number;
  scripts: number;
}

function cleanHtml(html: string): { plainText: string; report: CleaningReport } {
  const report: CleaningReport = {
    inlineStyles: 0,
    trackingPixels: 0,
    hiddenSpans: 0,
    styleBlocks: 0,
    msoProperties: 0,
    dataAttributes: 0,
    scripts: 0,
  };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove <script> tags
  const scripts = doc.querySelectorAll("script");
  report.scripts = scripts.length;
  scripts.forEach((el) => el.remove());

  // Remove <style> blocks
  const styles = doc.querySelectorAll("style");
  report.styleBlocks = styles.length;
  styles.forEach((el) => el.remove());

  // Remove tracking pixels (1x1 images or images with known tracker patterns)
  const imgs = doc.querySelectorAll("img");
  imgs.forEach((img) => {
    const w = img.getAttribute("width");
    const h = img.getAttribute("height");
    const src = img.getAttribute("src") || "";
    const isPixel =
      (w === "1" && h === "1") ||
      (w === "0" && h === "0") ||
      src.includes("pixel") ||
      src.includes("tracking") ||
      src.includes("beacon") ||
      src.includes("open.gif") ||
      src.includes("spacer");
    if (isPixel) {
      report.trackingPixels++;
      img.remove();
    }
  });

  // Remove hidden spans (display:none, visibility:hidden, font-size:0)
  const spans = doc.querySelectorAll("span, div, p");
  spans.forEach((el) => {
    const style = el.getAttribute("style") || "";
    const isHidden =
      style.includes("display:none") ||
      style.includes("display: none") ||
      style.includes("visibility:hidden") ||
      style.includes("visibility: hidden") ||
      style.includes("font-size:0") ||
      style.includes("font-size: 0px") ||
      style.includes("height:0") ||
      style.includes("width:0") ||
      (style.includes("height:0") && style.includes("overflow:hidden"));
    if (isHidden && el.textContent?.trim() === "") {
      report.hiddenSpans++;
      el.remove();
    }
  });

  // Walk all elements to strip attributes
  const allElements = doc.body.querySelectorAll("*");
  allElements.forEach((el) => {
    // Count and remove inline styles
    if (el.hasAttribute("style")) {
      const style = el.getAttribute("style") || "";
      // Count mso-* properties separately
      const msoMatches = style.match(/mso-[\w-]+/g);
      if (msoMatches) {
        report.msoProperties += msoMatches.length;
      }
      report.inlineStyles++;
      el.removeAttribute("style");
    }

    // Remove data-* attributes
    const attrs = [...el.attributes];
    for (const attr of attrs) {
      if (attr.name.startsWith("data-")) {
        report.dataAttributes++;
        el.removeAttribute(attr.name);
      }
    }

    // Remove class attributes (often contain tracking info)
    el.removeAttribute("class");
  });

  // Walk block elements to preserve paragraph structure
  const blocks = doc.body.querySelectorAll("p, div, br, h1, h2, h3, h4, h5, h6, li, tr");
  blocks.forEach((el) => {
    if (el.tagName === "BR") {
      el.replaceWith("\n");
    } else {
      el.insertAdjacentText("afterend", "\n\n");
    }
  });
  const plainText = (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();

  return { plainText, report };
}

function reportEntries(report: CleaningReport): { label: string; count: number }[] {
  return [
    { label: "inline styles", count: report.inlineStyles },
    { label: "tracking pixels", count: report.trackingPixels },
    { label: "hidden spans", count: report.hiddenSpans },
    { label: "<style> blocks", count: report.styleBlocks },
    { label: "mso-* properties", count: report.msoProperties },
    { label: "data-* attributes", count: report.dataAttributes },
    { label: "<script> tags", count: report.scripts },
  ].filter((e) => e.count > 0);
}

export default function ClipboardCleaner() {
  useEffect(() => { trackEvent("tool_opened", { tool: "clipboard" }); }, []);

  const [result, setResult] = useState<{
    plainText: string;
    report: CleaningReport;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const pasteRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");

    if (html) {
      setResult(cleanHtml(html));
      trackEvent("tool_used", { tool: "clipboard" });
    } else if (plain) {
      setResult({ plainText: plain, report: {
        inlineStyles: 0,
        trackingPixels: 0,
        hiddenSpans: 0,
        styleBlocks: 0,
        msoProperties: 0,
        dataAttributes: 0,
        scripts: 0,
      }});
    }
  }, []);

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setResult(null);
    if (pasteRef.current) {
      pasteRef.current.textContent = "";
    }
  }

  const entries = result ? reportEntries(result.report) : [];
  const totalRemoved = entries.reduce((sum, e) => sum + e.count, 0);

  return (
    <div>
      <ToolPageHeader
        icon={ClipboardPaste}
        title="Clipboard Cleaner"
        description="Paste rich text from emails, docs, or web pages. Strips tracking pixels, hidden markup, and styles — leaving clean plaintext."
      />
      <div className="space-y-4">

      {/* Paste Area */}
      <div className="bg-bg-surface border border-border p-4">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Paste rich text here
        </label>
        <div
          ref={pasteRef}
          onPaste={handlePaste}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[120px] bg-bg-elevated border border-border px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent cursor-text"
          role="textbox"
          aria-label="Paste area for rich text"
        >
          {!result && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-text-tertiary pointer-events-none select-none">
              <ClipboardPaste className="w-8 h-8" />
              <span className="text-sm">
                Paste from email, docs, or web pages (Ctrl/Cmd+V)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Cleaning Report */}
          <div className="bg-bg-surface border border-border p-4">
            <h3 className="font-heading font-semibold mb-3">
              Cleaning Report
            </h3>

            {totalRemoved > 0 ? (
              <div className="space-y-2">
                {entries.map(({ label, count }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-mono text-amber-400">
                      {count} removed
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2 flex items-center justify-between text-sm font-medium">
                  <span>Total items stripped</span>
                  <span className="font-mono text-grade-a">{totalRemoved}</span>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary text-sm">
                No tracking elements or hidden markup detected. The pasted
                content was already clean.
              </p>
            )}
          </div>

          {/* Clean Output */}
          <div className="bg-bg-surface border border-border p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">
              Clean Text
            </h3>
            <div className="bg-bg-elevated border border-border p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {result.plainText || (
                <span className="text-text-tertiary italic">
                  (empty after cleaning)
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Clean Text
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 bg-bg-elevated border border-border px-4 py-2 hover:bg-bg-hover transition-colors text-text-secondary"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
