"use client";

import { useState, useCallback, useEffect } from "react";
import { EyeOff, Upload, Download, AlertTriangle, Check, FileText } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

interface SensitiveMatch {
  type: "email" | "phone" | "ssn" | "credit-card" | "ip-address";
  value: string;
  page: number;
  checked: boolean;
}

const PATTERNS: { type: SensitiveMatch["type"]; label: string; regex: RegExp }[] = [
  { type: "email", label: "Email", regex: /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g },
  { type: "phone", label: "Phone", regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: "ssn", label: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    type: "credit-card",
    label: "Credit Card",
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  },
  { type: "ip-address", label: "IP Address", regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
];

const TYPE_COLORS: Record<SensitiveMatch["type"], string> = {
  email: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  phone: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  ssn: "bg-red-500/10 text-red-600 dark:text-red-400",
  "credit-card": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "ip-address": "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

export default function DocumentRedactor() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [matches, setMatches] = useState<SensitiveMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const [redacting, setRedacting] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flatten, setFlatten] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "redact" });
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }

    setError(null);
    setFileName(file.name);
    setScanning(true);
    setMatches([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setPdfBytes(bytes);

      // Use pdfjs-dist to extract text per page
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      setPageCount(doc.numPages);

      const found: SensitiveMatch[] = [];
      const seen = new Set<string>();

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const items = content.items.map((item) => ("str" in item ? item.str : ""));
        // Space-joined for normal PDFs
        const pageText = items.join(" ");
        // No-space join catches emails/phones split by LaTeX kerning
        // (e.g. "jerry" + "@" + "gmail.com" → "jerry @ gmail.com" misses, but "jerry@gmail.com" matches)
        const pageTextCollapsed = items.join("");

        for (const pattern of PATTERNS) {
          for (const text of [pageText, pageTextCollapsed]) {
            const re = new RegExp(pattern.regex.source, pattern.regex.flags);
            let m: RegExpExecArray | null;
            while ((m = re.exec(text)) !== null) {
              const key = `${pattern.type}:${m[0]}:${i}`;
              if (!seen.has(key)) {
                seen.add(key);
                found.push({
                  type: pattern.type,
                  value: m[0],
                  page: i,
                  checked: true,
                });
              }
            }
          }
        }
      }

      setMatches(found);
      trackEvent("tool_used", { tool: "redact", action: "scan", matches: found.length });
    } catch (err) {
      setError(`Failed to parse PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setScanning(false);
    }
  }, []);

  const toggleMatch = useCallback((index: number) => {
    setMatches((prev) =>
      prev.map((m, i) => (i === index ? { ...m, checked: !m.checked } : m))
    );
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setMatches((prev) => prev.map((m) => ({ ...m, checked })));
  }, []);

  const handleRedact = useCallback(async () => {
    if (!pdfBytes) return;
    setRedacting(true);

    try {
      const { PDFDocument, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfBytes);

      // Use pdfjs to get text positions for redaction
      const pdfjsLib = await import("pdfjs-dist");
      const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;

      const checkedMatches = matches.filter((m) => m.checked);
      const matchesByPage = new Map<number, SensitiveMatch[]>();
      for (const m of checkedMatches) {
        const existing = matchesByPage.get(m.page) || [];
        existing.push(m);
        matchesByPage.set(m.page, existing);
      }

      const pages = doc.getPages();

      for (const [pageNum, pageMatches] of matchesByPage) {
        const page = pages[pageNum - 1];
        if (!page) continue;

        const pdfPage = await pdfDoc.getPage(pageNum);
        const content = await pdfPage.getTextContent();
        const viewport = pdfPage.getViewport({ scale: 1 });

        // Build array of text items with position info
        const textItems = content.items.filter(
          (item): item is typeof item & { str: string; transform: number[]; width: number; height: number } =>
            "str" in item && !!item.str
        );

        for (const match of pageMatches) {
          // Strategy 1: single item contains the match (normal PDFs)
          for (const item of textItems) {
            if (item.str.includes(match.value)) {
              const tx = item.transform[4];
              const ty = item.transform[5];
              const height = item.transform[3] || item.height || 12;
              const width = item.width || match.value.length * height * 0.6;
              const pdfY = viewport.height - ty - height;
              page.drawRectangle({
                x: tx - 1,
                y: pdfY - 1,
                width: width + 2,
                height: height + 4,
                color: rgb(0, 0, 0),
              });
            }
          }

          // Strategy 2: match spans multiple consecutive items (kerned/LaTeX PDFs)
          // Concatenate items and find spans that form the match value
          let concat = "";
          const itemRanges: { start: number; end: number; itemIdx: number }[] = [];
          for (let idx = 0; idx < textItems.length; idx++) {
            const start = concat.length;
            concat += textItems[idx].str;
            itemRanges.push({ start, end: concat.length, itemIdx: idx });
          }

          let searchFrom = 0;
          while (searchFrom < concat.length) {
            const matchStart = concat.indexOf(match.value, searchFrom);
            if (matchStart === -1) break;
            const matchEnd = matchStart + match.value.length;
            searchFrom = matchEnd;

            // Find all items that overlap this match span
            const spanItems = itemRanges.filter(
              (r) => r.end > matchStart && r.start < matchEnd
            );
            if (spanItems.length <= 1) continue; // already handled by Strategy 1

            // Draw rectangle covering all items in the span
            let minX = Infinity, maxRight = 0, minY = Infinity, maxHeight = 0;
            for (const { itemIdx } of spanItems) {
              const item = textItems[itemIdx];
              const tx = item.transform[4];
              const ty = item.transform[5];
              const h = item.transform[3] || item.height || 12;
              const w = item.width || item.str.length * h * 0.6;
              minX = Math.min(minX, tx);
              maxRight = Math.max(maxRight, tx + w);
              minY = Math.min(minY, ty);
              maxHeight = Math.max(maxHeight, h);
            }
            const pdfY = viewport.height - minY - maxHeight;
            page.drawRectangle({
              x: minX - 1,
              y: pdfY - 1,
              width: maxRight - minX + 2,
              height: maxHeight + 4,
              color: rgb(0, 0, 0),
            });
          }
        }
      }

      let finalBytes: Uint8Array;

      if (flatten) {
        // Flatten to images: render each page to canvas, embed as PNG in a new PDF
        const { PDFDocument: FreshPDF } = await import("pdf-lib");
        const flatDoc = await FreshPDF.create();
        const flatPdfjs = await pdfjsLib.getDocument({ data: (await doc.save()).slice() }).promise;

        for (let i = 1; i <= flatPdfjs.numPages; i++) {
          const pg = await flatPdfjs.getPage(i);
          const scale = 2; // 2x for quality
          const viewport = pg.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await pg.render({ canvasContext: ctx, viewport }).promise;

          const pngDataUrl = canvas.toDataURL("image/png");
          const pngBase64 = pngDataUrl.split(",")[1];
          const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
          const pngImage = await flatDoc.embedPng(pngBytes);

          const page = flatDoc.addPage([pngImage.width / scale, pngImage.height / scale]);
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pngImage.width / scale,
            height: pngImage.height / scale,
          });
        }

        finalBytes = await flatDoc.save();
      } else {
        finalBytes = await doc.save();
      }

      const blob = new Blob([finalBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName?.replace(".pdf", "-redacted.pdf") || "redacted.pdf";
      a.click();
      URL.revokeObjectURL(url);

      trackEvent("tool_used", { tool: "redact", action: "redact", count: checkedMatches.length, flatten });
    } catch (err) {
      setError(`Redaction failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRedacting(false);
    }
  }, [pdfBytes, matches, fileName, flatten]);

  const checkedCount = matches.filter((m) => m.checked).length;

  const groupedByType = matches.reduce(
    (acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <ToolPageHeader
        icon={EyeOff}
        title="Document Redactor"
        description="Detect and redact sensitive data in PDFs. Emails, phone numbers, SSNs, credit cards."
      />

      {/* Upload */}
      <div className="bg-bg-surface border border-border p-6 mb-6">
        <label className="flex flex-col items-center gap-3 cursor-pointer">
          <div className="p-3 bg-accent/10">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-text-secondary text-sm">
            {fileName || "Upload a PDF to scan for sensitive data"}
          </span>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFile}
            className="hidden"
          />
          {!fileName && (
            <span className="text-xs text-text-tertiary">PDF files only</span>
          )}
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-grade-f text-sm mb-6 p-3 bg-grade-f/10">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {scanning && (
        <div className="text-center py-8 text-text-secondary text-sm">
          Scanning PDF for sensitive data...
        </div>
      )}

      {/* Results */}
      {!scanning && matches.length > 0 && (
        <>
          {/* Redaction warning banner */}
          <div className="flex items-start gap-3 p-4 mb-4 bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">Visual redaction only</p>
              <p className="text-text-secondary mt-0.5">
                Underlying text may still be extractable with PDF tools. For sensitive
                documents, enable &quot;Flatten pages to images&quot; below to remove all
                extractable text.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-bg-surface border border-border p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold">
                Found {matches.length} sensitive {matches.length === 1 ? "item" : "items"}
              </h2>
              <span className="text-text-tertiary text-xs">{pageCount} pages scanned</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(groupedByType).map(([type, count]) => {
                const pattern = PATTERNS.find((p) => p.type === type);
                return (
                  <span
                    key={type}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[type as SensitiveMatch["type"]] || ""}`}
                  >
                    {count} {pattern?.label || type}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Select all / none */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-text-secondary text-sm">
              {checkedCount} of {matches.length} selected for redaction
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="text-xs text-accent hover:text-accent/80"
              >
                Select all
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                Deselect all
              </button>
            </div>
          </div>

          {/* Match list */}
          <div className="bg-bg-surface border border-border divide-y divide-border mb-6 max-h-80 overflow-y-auto">
            {matches.map((match, i) => (
              <label
                key={`${match.type}-${match.value}-${match.page}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-bg-elevated/50"
              >
                <input
                  type="checkbox"
                  checked={match.checked}
                  onChange={() => toggleMatch(i)}
                  className="rounded border-border"
                />
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[match.type]}`}
                >
                  {PATTERNS.find((p) => p.type === match.type)?.label}
                </span>
                <span className="font-mono text-sm text-text-primary flex-1 truncate">
                  {match.value}
                </span>
                <span className="text-text-tertiary text-xs shrink-0">p.{match.page}</span>
              </label>
            ))}
          </div>

          {/* Flatten toggle */}
          <label className="flex items-center gap-3 mb-4 px-1 cursor-pointer">
            <input
              type="checkbox"
              checked={flatten}
              onChange={(e) => setFlatten(e.target.checked)}
              className="rounded border-border accent-accent"
            />
            <span className="text-sm text-text-secondary">
              Flatten pages to images{" "}
              <span className="text-text-tertiary">(removes all extractable text — recommended for sensitive docs)</span>
            </span>
          </label>

          {/* Redact button */}
          <button
            onClick={handleRedact}
            disabled={checkedCount === 0 || redacting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-accent-fg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {redacting ? (
              "Redacting..."
            ) : (
              <>
                <Download className="w-4 h-4" />
                Redact & Download ({checkedCount} items)
              </>
            )}
          </button>
        </>
      )}

      {/* No matches */}
      {!scanning && fileName && matches.length === 0 && !error && (
        <div className="text-center py-8 bg-bg-surface border border-border">
          <Check className="w-8 h-8 text-grade-a mx-auto mb-2" />
          <p className="font-medium">No sensitive data detected</p>
          <p className="text-text-secondary text-sm mt-1">
            No emails, phone numbers, SSNs, or credit card numbers found.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 flex items-start gap-2 text-text-tertiary text-xs">
        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>
          All processing happens locally in your browser — no files are uploaded.
          Review the redacted PDF before sharing. Text extraction accuracy depends
          on PDF structure.
        </p>
      </div>
    </div>
  );
}
