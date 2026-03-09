"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Download,
  Trash2,
  GripVertical,
  FileText,
  Loader2,
  Scissors,
  Merge,
  RotateCcw,
  Layers,
} from "lucide-react";
import DropZone from "@/components/DropZone";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";
import { MAX_DOCUMENT_SIZE } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = "merge" | "split";

interface PdfEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  bytes: ArrayBuffer;
}

interface SplitRange {
  id: string;
  label: string;
  startPage: number;
  endPage: number;
}

interface PageThumb {
  pageNum: number;
  dataUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parse a page range string like "1-3, 5, 7-9" into SplitRange objects.
 * Returns null if the input is invalid.
 */
function parsePageRanges(
  input: string,
  totalPages: number
): SplitRange[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(",").map((s) => s.trim());
  const ranges: SplitRange[] = [];

  for (const part of parts) {
    if (!part) continue;

    const dashMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = part.match(/^(\d+)$/);

    if (dashMatch) {
      const start = parseInt(dashMatch[1], 10);
      const end = parseInt(dashMatch[2], 10);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages || start > end) {
        return null;
      }
      ranges.push({
        id: uid(),
        label: `Pages ${start}-${end}`,
        startPage: start,
        endPage: end,
      });
    } else if (singleMatch) {
      const page = parseInt(singleMatch[1], 10);
      if (page < 1 || page > totalPages) return null;
      ranges.push({
        id: uid(),
        label: `Page ${page}`,
        startPage: page,
        endPage: page,
      });
    } else {
      return null;
    }
  }

  return ranges.length > 0 ? ranges : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PdfMergeSplit() {
  useEffect(() => { trackEvent("tool_opened", { tool: "pdf-tools" }); }, []);

  const [mode, setMode] = useState<Mode>("merge");

  // ---- Merge state --------------------------------------------------------
  const [mergeFiles, setMergeFiles] = useState<PdfEntry[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // ---- Split state --------------------------------------------------------
  const [splitFile, setSplitFile] = useState<PdfEntry | null>(null);
  const [splitThumbs, setSplitThumbs] = useState<PageThumb[]>([]);
  const [rangeInput, setRangeInput] = useState("");
  const [parsedRanges, setParsedRanges] = useState<SplitRange[] | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [loadingThumbs, setLoadingThumbs] = useState(false);

  // ---- Drag reorder state -------------------------------------------------
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // ---- Load PDF page count (shared helper) --------------------------------
  const loadPdfEntry = useCallback(
    async (file: File): Promise<PdfEntry | null> => {
      try {
        const bytes = await file.arrayBuffer();
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        return {
          id: uid(),
          file,
          name: file.name,
          size: file.size,
          pageCount: doc.getPageCount(),
          bytes,
        };
      } catch {
        return null;
      }
    },
    []
  );

  // =========================================================================
  // MERGE MODE
  // =========================================================================

  const handleMergeFiles = useCallback(
    async (files: File[]) => {
      setMergeError(null);
      const entries: PdfEntry[] = [];
      for (const file of files) {
        const entry = await loadPdfEntry(file);
        if (entry) {
          entries.push(entry);
        } else {
          setMergeError(`Could not read "${file.name}" — is it a valid PDF?`);
        }
      }
      setMergeFiles((prev) => [...prev, ...entries]);
    },
    [loadPdfEntry]
  );

  const removeMergeFile = useCallback((id: string) => {
    setMergeFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ---- Drag reorder handlers ----------------------------------------------
  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === to) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    setMergeFiles((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });

    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  // ---- Merge action -------------------------------------------------------
  const handleMerge = useCallback(async () => {
    if (mergeFiles.length < 2) return;
    setMerging(true);
    setMergeError(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();

      for (const entry of mergeFiles) {
        const src = await PDFDocument.load(entry.bytes, {
          ignoreEncryption: true,
        });
        const indices = src.getPageIndices();
        const pages = await merged.copyPages(src, indices);
        for (const page of pages) {
          merged.addPage(page);
        }
      }

      const pdfBytes = await merged.save();
      downloadBlob(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }), "merged.pdf");
      trackEvent("tool_used", { tool: "pdf-tools" });
    } catch (err) {
      setMergeError(
        err instanceof Error ? err.message : "Failed to merge PDFs"
      );
    } finally {
      setMerging(false);
    }
  }, [mergeFiles]);

  // =========================================================================
  // SPLIT MODE
  // =========================================================================

  const handleSplitFile = useCallback(
    async (files: File[]) => {
      setSplitError(null);
      setSplitThumbs([]);
      setRangeInput("");
      setParsedRanges(null);
      setRangeError(null);

      const file = files[0];
      if (!file) return;

      const entry = await loadPdfEntry(file);
      if (!entry) {
        setSplitError(`Could not read "${file.name}" — is it a valid PDF?`);
        return;
      }
      setSplitFile(entry);

      // Generate thumbnails
      setLoadingThumbs(true);
      try {
        const thumbs = await generateThumbnails(entry.bytes, entry.pageCount);
        setSplitThumbs(thumbs);
      } catch {
        // Thumbnails are nice-to-have, not critical
      } finally {
        setLoadingThumbs(false);
      }
    },
    [loadPdfEntry]
  );

  // ---- Parse range input on change ----------------------------------------
  useEffect(() => {
    if (!splitFile) return;
    if (!rangeInput.trim()) {
      setParsedRanges(null);
      setRangeError(null);
      return;
    }
    const result = parsePageRanges(rangeInput, splitFile.pageCount);
    if (result) {
      setParsedRanges(result);
      setRangeError(null);
    } else {
      setParsedRanges(null);
      setRangeError(
        `Invalid range. Use page numbers 1-${splitFile.pageCount} (e.g. "1-3, 5, 7-9")`
      );
    }
  }, [rangeInput, splitFile]);

  // ---- Split action -------------------------------------------------------
  const handleSplit = useCallback(async () => {
    if (!splitFile || !parsedRanges || parsedRanges.length === 0) return;
    setSplitting(true);
    setSplitError(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(splitFile.bytes, {
        ignoreEncryption: true,
      });

      if (parsedRanges.length === 1) {
        // Single range — download directly as PDF
        const range = parsedRanges[0];
        const newDoc = await PDFDocument.create();
        const indices = Array.from(
          { length: range.endPage - range.startPage + 1 },
          (_, i) => range.startPage - 1 + i
        );
        const pages = await newDoc.copyPages(src, indices);
        for (const page of pages) newDoc.addPage(page);
        const pdfBytes = await newDoc.save();

        const baseName = splitFile.name.replace(/\.pdf$/i, "");
        downloadBlob(
          new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
          `${baseName}_pages_${range.startPage}-${range.endPage}.pdf`
        );
      } else {
        // Multiple ranges — bundle into a ZIP
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const baseName = splitFile.name.replace(/\.pdf$/i, "");

        for (const range of parsedRanges) {
          const newDoc = await PDFDocument.create();
          const indices = Array.from(
            { length: range.endPage - range.startPage + 1 },
            (_, i) => range.startPage - 1 + i
          );
          const pages = await newDoc.copyPages(src, indices);
          for (const page of pages) newDoc.addPage(page);
          const pdfBytes = await newDoc.save();

          const fileName =
            range.startPage === range.endPage
              ? `${baseName}_page_${range.startPage}.pdf`
              : `${baseName}_pages_${range.startPage}-${range.endPage}.pdf`;
          zip.file(fileName, pdfBytes);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${baseName}_split.zip`);
      }
      trackEvent("tool_used", { tool: "pdf-tools" });
    } catch (err) {
      setSplitError(
        err instanceof Error ? err.message : "Failed to split PDF"
      );
    } finally {
      setSplitting(false);
    }
  }, [splitFile, parsedRanges]);

  // ---- Download a single split range individually -------------------------
  const handleDownloadRange = useCallback(
    async (range: SplitRange) => {
      if (!splitFile) return;
      try {
        const { PDFDocument } = await import("pdf-lib");
        const src = await PDFDocument.load(splitFile.bytes, {
          ignoreEncryption: true,
        });
        const newDoc = await PDFDocument.create();
        const indices = Array.from(
          { length: range.endPage - range.startPage + 1 },
          (_, i) => range.startPage - 1 + i
        );
        const pages = await newDoc.copyPages(src, indices);
        for (const page of pages) newDoc.addPage(page);
        const pdfBytes = await newDoc.save();

        const baseName = splitFile.name.replace(/\.pdf$/i, "");
        downloadBlob(
          new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
          range.startPage === range.endPage
            ? `${baseName}_page_${range.startPage}.pdf`
            : `${baseName}_pages_${range.startPage}-${range.endPage}.pdf`
        );
      } catch {
        setSplitError("Failed to extract pages");
      }
    },
    [splitFile]
  );

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div>
      <ToolPageHeader
        icon={Layers}
        title="PDF Merge & Split"
        description="Combine multiple PDFs or extract page ranges into separate files. Everything stays in your browser."
      />
      <div className="space-y-6">

      {/* ── Mode Toggle ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("merge")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            mode === "merge"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated border border-border text-text-secondary hover:text-text-primary"
          }`}
        >
          <Merge className="w-4 h-4" />
          Merge
        </button>
        <button
          onClick={() => setMode("split")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            mode === "split"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated border border-border text-text-secondary hover:text-text-primary"
          }`}
        >
          <Scissors className="w-4 h-4" />
          Split
        </button>
      </div>

      {/* ================================================================ */}
      {/* MERGE MODE                                                       */}
      {/* ================================================================ */}
      {mode === "merge" && (
        <div className="space-y-4">
          <DropZone
            accept="application/pdf,.pdf"
            maxSize={MAX_DOCUMENT_SIZE}
            onFiles={handleMergeFiles}
            label="Drop PDF files here or click to browse"
            multiple
          />

          {mergeFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-text-tertiary text-xs">
                Drag to reorder. PDFs will be merged top-to-bottom.
              </p>
              <div className="space-y-1">
                {mergeFiles.map((entry, index) => (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-3 bg-bg-surface border border-border px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-border-hover transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-text-tertiary shrink-0" />
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{entry.name}</p>
                      <p className="text-text-tertiary text-xs">
                        {entry.pageCount} page{entry.pageCount !== 1 ? "s" : ""}{" "}
                        &middot; {formatBytes(entry.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMergeFile(entry.id)}
                      className="p-1 rounded hover:bg-grade-f/10 text-text-tertiary hover:text-grade-f transition-colors"
                      aria-label={`Remove ${entry.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-text-tertiary text-xs">
                  {mergeFiles.length} file{mergeFiles.length !== 1 ? "s" : ""}{" "}
                  &middot;{" "}
                  {mergeFiles.reduce((sum, f) => sum + f.pageCount, 0)} total
                  pages
                </p>
                <button
                  onClick={handleMerge}
                  disabled={mergeFiles.length < 2 || merging}
                  className="flex items-center gap-2 bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {merging ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {merging ? "Merging..." : "Merge & Download"}
                </button>
              </div>
            </div>
          )}

          {mergeError && (
            <p className="text-grade-f text-xs">{mergeError}</p>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* SPLIT MODE                                                       */}
      {/* ================================================================ */}
      {mode === "split" && (
        <div className="space-y-4">
          {!splitFile ? (
            <DropZone
              accept="application/pdf,.pdf"
              maxSize={MAX_DOCUMENT_SIZE}
              onFiles={handleSplitFile}
              label="Drop a PDF file here or click to browse"
              multiple={false}
            />
          ) : (
            <div className="space-y-4">
              {/* File info bar */}
              <div className="flex items-center justify-between bg-bg-surface border border-border px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {splitFile.name}
                    </p>
                    <p className="text-text-tertiary text-xs">
                      {splitFile.pageCount} page
                      {splitFile.pageCount !== 1 ? "s" : ""} &middot;{" "}
                      {formatBytes(splitFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSplitFile(null);
                    setSplitThumbs([]);
                    setRangeInput("");
                    setParsedRanges(null);
                    setRangeError(null);
                    setSplitError(null);
                  }}
                  className="flex items-center gap-1.5 text-text-tertiary hover:text-text-primary text-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Change file
                </button>
              </div>

              {/* Page thumbnails */}
              {loadingThumbs && (
                <div className="flex items-center gap-2 text-text-tertiary text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating page previews...
                </div>
              )}
              {splitThumbs.length > 0 && (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {splitThumbs.map((thumb) => (
                    <div
                      key={thumb.pageNum}
                      className="relative border border-border rounded overflow-hidden bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${thumb.pageNum}`}
                        className="w-full h-auto"
                      />
                      <span className="absolute bottom-0 inset-x-0 text-center text-[10px] bg-black/60 text-white py-0.5">
                        {thumb.pageNum}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Range input */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Page ranges
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder={`e.g. 1-3, 5, 7-${splitFile.pageCount}`}
                  className="w-full bg-bg-surface border border-border px-3 py-2 text-sm font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                />
                {rangeError && (
                  <p className="text-grade-f text-xs mt-1">{rangeError}</p>
                )}
                <p className="text-text-tertiary text-xs mt-1">
                  Comma-separated page numbers or ranges. Each range becomes a
                  separate PDF.
                </p>
              </div>

              {/* Parsed ranges preview */}
              {parsedRanges && parsedRanges.length > 0 && (
                <div className="space-y-1">
                  {parsedRanges.map((range) => (
                    <div
                      key={range.id}
                      className="flex items-center justify-between bg-bg-surface border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="text-sm">{range.label}</span>
                        <span className="text-text-tertiary text-xs">
                          ({range.endPage - range.startPage + 1} page
                          {range.endPage - range.startPage + 1 !== 1
                            ? "s"
                            : ""}
                          )
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownloadRange(range)}
                        className="p-1.5 rounded hover:bg-accent/10 text-text-tertiary hover:text-accent transition-colors"
                        aria-label={`Download ${range.label}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Split action */}
              {parsedRanges && parsedRanges.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSplit}
                    disabled={splitting}
                    className="flex items-center gap-2 bg-accent text-accent-fg px-4 py-2 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {splitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {splitting
                      ? "Splitting..."
                      : parsedRanges.length === 1
                        ? "Download PDF"
                        : "Download All as ZIP"}
                  </button>
                </div>
              )}

              {splitError && (
                <p className="text-grade-f text-xs">{splitError}</p>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility: trigger download
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Utility: generate page thumbnails via pdfjs-dist
// ---------------------------------------------------------------------------

async function generateThumbnails(
  pdfBytes: ArrayBuffer,
  pageCount: number
): Promise<PageThumb[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) })
    .promise;

  const thumbs: PageThumb[] = [];
  const maxThumbs = Math.min(pageCount, 50); // cap at 50 thumbnails for performance

  for (let i = 1; i <= maxThumbs; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 0.3 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;

    thumbs.push({
      pageNum: i,
      dataUrl: canvas.toDataURL("image/jpeg", 0.6),
    });
  }

  doc.destroy();
  return thumbs;
}
