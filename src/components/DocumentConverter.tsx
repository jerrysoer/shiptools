"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, Trash2, Loader2, CircleCheck, DownloadCloud } from "lucide-react";
import DropZone from "./DropZone";
import PrivacyBadge from "./PrivacyBadge";
import { useConverter } from "@/hooks/useConverter";
import { MAX_DOCUMENT_SIZE } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import type { DocumentFormat } from "@/lib/types";

const OUTPUT_FORMATS: DocumentFormat[] = ["pdf", "txt", "csv", "json"];
const ACCEPT =
  ".pdf,.docx,.txt,.csv,.json,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/json";

function extractPageText(
  items: Array<Record<string, unknown>>
): string {
  const textItems = items.filter(
    (item): item is { str: string; hasEOL: boolean; transform: number[]; height: number } =>
      "str" in item && "transform" in item
  );
  if (textItems.length === 0) return "";

  const heights = textItems.map((t) => t.height).filter((h) => h > 0);
  const lineHeight =
    heights.length > 0
      ? heights.sort((a, b) => a - b)[Math.floor(heights.length / 2)]
      : 12;

  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    currentLine += item.str;

    if (item.hasEOL) {
      lines.push(currentLine);
      currentLine = "";

      if (i + 1 < textItems.length) {
        const gap = Math.abs(item.transform[5] - textItems[i + 1].transform[5]);
        if (gap > lineHeight * 1.5) {
          lines.push("");
        }
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

async function convertDocument(
  file: File,
  outputFormat: string,
  _options?: unknown,
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const inputFormat = file.name.split(".").pop()?.toLowerCase() ?? "";

  // DOCX → TXT
  if ((inputFormat === "docx") && outputFormat === "txt") {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    onProgress?.(50);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    onProgress?.(90);
    return new Blob([result.value], { type: "text/plain" });
  }

  // DOCX → PDF
  if ((inputFormat === "docx") && outputFormat === "pdf") {
    const mammoth = await import("mammoth");
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const buffer = await file.arrayBuffer();
    onProgress?.(30);

    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    onProgress?.(50);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const lineHeight = fontSize * 1.4;

    const lines = result.value.split("\n");
    let page = pdfDoc.addPage();
    let y = page.getHeight() - margin;

    for (const line of lines) {
      const words = line.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (textWidth > page.getWidth() - margin * 2 && currentLine) {
          page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
          currentLine = word;

          if (y < margin) {
            page = pdfDoc.addPage();
            y = page.getHeight() - margin;
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
      } else {
        y -= lineHeight;
      }

      if (y < margin) {
        page = pdfDoc.addPage();
        y = page.getHeight() - margin;
      }
    }

    onProgress?.(90);
    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes) as BlobPart], { type: "application/pdf" });
  }

  // CSV → JSON
  if (inputFormat === "csv" && outputFormat === "json") {
    const Papa = await import("papaparse");
    const text = await file.text();
    onProgress?.(50);
    const result = Papa.default.parse(text, { header: true, skipEmptyLines: true });
    onProgress?.(90);
    return new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
  }

  // JSON → CSV
  if (inputFormat === "json" && outputFormat === "csv") {
    const Papa = await import("papaparse");
    const text = await file.text();
    onProgress?.(50);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON file. Please check the file contents.");
    }
    const arr = Array.isArray(data) ? data : [data];
    const csv = Papa.default.unparse(arr);
    onProgress?.(90);
    return new Blob([csv], { type: "text/csv" });
  }

  // TXT → PDF
  if (inputFormat === "txt" && outputFormat === "pdf") {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const text = await file.text();
    onProgress?.(50);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontSize = 10;
    const margin = 50;
    const lineHeight = fontSize * 1.4;

    const lines = text.split("\n");
    let page = pdfDoc.addPage();
    let y = page.getHeight() - margin;
    const maxWidth = page.getWidth() - margin * 2;

    for (const line of lines) {
      if (!line.trim()) {
        y -= lineHeight;
        if (y < margin) {
          page = pdfDoc.addPage();
          y = page.getHeight() - margin;
        }
        continue;
      }
      // Word wrap
      const words = line.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (textWidth > maxWidth && currentLine) {
          if (y < margin) {
            page = pdfDoc.addPage();
            y = page.getHeight() - margin;
          }
          page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        if (y < margin) {
          page = pdfDoc.addPage();
          y = page.getHeight() - margin;
        }
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
      }
    }

    onProgress?.(90);
    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes) as BlobPart], { type: "application/pdf" });
  }

  // PDF → TXT
  if (inputFormat === "pdf" && outputFormat === "txt") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const buffer = await file.arrayBuffer();
    onProgress?.(20);

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const totalPages = pdf.numPages;
    const textParts: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = extractPageText(content.items);
      textParts.push(pageText);
      onProgress?.(20 + Math.round((i / totalPages) * 70));
    }

    const fullText = textParts.join("\n\n");

    if (!fullText.trim()) {
      return new Blob(
        ["[No extractable text found. This PDF may be a scanned document that requires OCR.]"],
        { type: "text/plain" }
      );
    }

    onProgress?.(95);
    return new Blob([fullText], { type: "text/plain" });
  }

  // PDF → JSON (structured extraction)
  if (inputFormat === "pdf" && outputFormat === "json") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const buffer = await file.arrayBuffer();
    onProgress?.(20);

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const totalPages = pdf.numPages;
    const metadata = await pdf.getMetadata().catch(() => null);

    const pages: Array<{
      pageNumber: number;
      width: number;
      height: number;
      text: string;
    }> = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const pageText = extractPageText(content.items);

      pages.push({
        pageNumber: i,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        text: pageText,
      });

      onProgress?.(20 + Math.round((i / totalPages) * 70));
    }

    const result = {
      fileName: file.name,
      totalPages,
      metadata: metadata?.info
        ? {
            title: (metadata.info as Record<string, unknown>).Title || null,
            author: (metadata.info as Record<string, unknown>).Author || null,
            subject: (metadata.info as Record<string, unknown>).Subject || null,
            creator: (metadata.info as Record<string, unknown>).Creator || null,
            producer: (metadata.info as Record<string, unknown>).Producer || null,
            creationDate: (metadata.info as Record<string, unknown>).CreationDate || null,
          }
        : null,
      pages,
    };

    onProgress?.(95);
    return new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  }

  // XLSX → CSV
  if (inputFormat === "xlsx" && outputFormat === "csv") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    onProgress?.(40);

    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("No sheets found in workbook");

    onProgress?.(70);
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    onProgress?.(95);
    return new Blob([csv], { type: "text/csv" });
  }

  // XLSX → JSON
  if (inputFormat === "xlsx" && outputFormat === "json") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    onProgress?.(40);

    const workbook = XLSX.read(buffer, { type: "array" });
    const result: Record<string, unknown[]> = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      result[sheetName] = XLSX.utils.sheet_to_json(sheet);
    }

    onProgress?.(95);
    const output = workbook.SheetNames.length === 1
      ? JSON.stringify(Object.values(result)[0], null, 2)
      : JSON.stringify(result, null, 2);

    return new Blob([output], { type: "application/json" });
  }

  // XLSX → TXT
  if (inputFormat === "xlsx" && outputFormat === "txt") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    onProgress?.(40);

    const workbook = XLSX.read(buffer, { type: "array" });
    const parts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      parts.push(`--- ${sheetName} ---`);
      parts.push(XLSX.utils.sheet_to_csv(sheet, { FS: "\t" }));
      parts.push("");
    }

    onProgress?.(95);
    return new Blob([parts.join("\n")], { type: "text/plain" });
  }

  throw new Error(`Conversion from ${inputFormat.toUpperCase()} to ${outputFormat.toUpperCase()} is not supported yet.`);
}

export default function DocumentConverter() {
  useEffect(() => { trackEvent("tool_opened", { tool: "convert-documents" }); }, []);

  const [outputFormat, setOutputFormat] = useState<DocumentFormat>("pdf");

  const {
    jobs, addFiles, processAll, downloadResult, removeJob, clearJobs,
    pendingCount, doneCount, processingCount, isBatchComplete, downloadAll,
  } = useConverter(convertDocument);

  const handleFiles = useCallback(
    (files: File[]) => {
      addFiles(files, outputFormat);
    },
    [addFiles, outputFormat]
  );

  const totalActive = pendingCount + processingCount + doneCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PrivacyBadge />
        {jobs.length > 0 && (
          <button onClick={clearJobs} className="text-text-tertiary hover:text-text-primary text-xs transition-colors">
            Clear all
          </button>
        )}
      </div>

      <div>
        <label className="text-text-secondary text-xs block mb-1">Output format</label>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value as DocumentFormat)}
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          {OUTPUT_FORMATS.map((f) => (
            <option key={f} value={f}>{f.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <DropZone
        accept={ACCEPT}
        maxSize={MAX_DOCUMENT_SIZE}
        onFiles={handleFiles}
        label="Drop documents here or click to browse"
      />

      <p className="text-text-tertiary text-xs">
        Supported: DOCX → PDF/TXT, PDF → TXT/JSON, CSV ↔ JSON, TXT → PDF, XLSX → CSV/JSON/TXT.
      </p>

      {/* Batch progress bar */}
      {processingCount > 0 && totalActive > 1 && (
        <div className="space-y-1.5 fade-in">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Converting {doneCount + 1} of {totalActive}...</span>
            <span>{Math.round(((doneCount) / totalActive) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(2, (doneCount / totalActive) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch completion banner */}
      {isBatchComplete && doneCount > 1 && (
        <div className="flex items-center justify-between bg-grade-a/10 border border-grade-a/25 rounded-xl px-4 py-3 fade-in">
          <div className="flex items-center gap-2">
            <CircleCheck className="w-4 h-4 text-grade-a done-check" />
            <span className="text-sm text-grade-a font-medium">
              All {doneCount} files converted
            </span>
          </div>
          <button
            onClick={downloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-grade-a/15 hover:bg-grade-a/25 text-grade-a rounded-lg text-xs font-medium transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            Download All
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
              job.status === "done"
                ? "bg-grade-a/5 border border-grade-a/25 border-l-2 border-l-grade-a"
                : job.status === "error"
                  ? "bg-grade-f/5 border border-grade-f/25 border-l-2 border-l-grade-f"
                  : "bg-bg-surface border border-border"
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{job.file.name}</p>
                <p className="text-xs text-text-tertiary">
                  {job.inputFormat.toUpperCase()} → {job.outputFormat.toUpperCase()}
                  {job.status === "processing" && ` · ${job.progress}%`}
                  {job.status === "done" && job.result && (
                    <span className="text-grade-a"> · Done · {(job.result.size / 1024).toFixed(0)} KB</span>
                  )}
                  {job.status === "error" && <span className="text-grade-f"> · {job.error}</span>}
                </p>
              </div>
              {job.status === "processing" && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
              {job.status === "done" && (
                <>
                  <CircleCheck className="w-4 h-4 text-grade-a shrink-0 done-check" />
                  <button onClick={() => downloadResult(job)} className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-grade-a">
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={() => removeJob(job.id)} className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-tertiary">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {pendingCount > 0 && (
            <button onClick={() => { trackEvent("tool_used", { tool: "convert-documents" }); processAll(); }} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-accent-fg rounded-lg text-sm font-medium transition-colors">
              Convert {pendingCount} file{pendingCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
