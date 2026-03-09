"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Download,
  Type,
  Calendar,
  PenLine,
  Upload,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  MousePointer2,
  Loader2,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Annotation {
  id: string;
  type: "signature" | "text" | "date";
  pageIndex: number;
  x: number; // percentage of page width (0-100)
  y: number; // percentage of page height (0-100)
  width: number; // percentage of page width
  height: number; // percentage of page height
  content: string; // text content or base64 signature image data-url
}

type Tool = "select" | "signature" | "text" | "date";
type SigTab = "draw" | "type" | "upload";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function todayString(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Default sizing (as percentage of page)
const SIG_WIDTH_PCT = 20;
const SIG_HEIGHT_PCT = 5;
const TEXT_WIDTH_PCT = 15;
const TEXT_HEIGHT_PCT = 2.5;
const DATE_WIDTH_PCT = 12;
const DATE_HEIGHT_PCT = 2.5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PDFSigner() {
  useEffect(() => { trackEvent("tool_opened", { tool: "sign-pdf" }); }, []);

  // ---- File / PDF state --------------------------------------------------
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Tool state --------------------------------------------------------
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // ---- Signature panel ---------------------------------------------------
  const [showSigPanel, setShowSigPanel] = useState(false);
  const [sigTab, setSigTab] = useState<SigTab>("draw");
  const [typedName, setTypedName] = useState("");

  // ---- Dragging ----------------------------------------------------------
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ---- Editing text annotation -------------------------------------------
  const [editingId, setEditingId] = useState<string | null>(null);

  // ---- Refs --------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigUploadRef = useRef<HTMLInputElement>(null);

  // ---- PDF.js page dimensions (pixels at scale) --------------------------
  const pageDims = useRef({ width: 0, height: 0 });

  // ---- Signature drawing state -------------------------------------------
  const isDrawing = useRef(false);
  const sigPaths = useRef<Array<{ x: number; y: number }[]>>([]);

  // ---- Drop zone ---------------------------------------------------------
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // ========================================================================
  // PDF Loading & Rendering
  // ========================================================================

  const renderPage = useCallback(
    async (pageIndex: number, pdfData: ArrayBuffer) => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData.slice(0)) })
          .promise;
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pageDims.current = { width: viewport.width, height: viewport.height };

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("PDF render error:", err);
        setError(`Failed to render PDF: ${message}`);
      }
    },
    [],
  );

  const loadFile = useCallback(
    async (f: File) => {
      setError(null);
      setLoading(true);
      try {
        const buf = await f.arrayBuffer();
        setFile(f);
        setPdfBytes(buf);
        setCurrentPage(0);
        setAnnotations([]);
        setSignatureDataUrl(null);
        setActiveTool("select");
        await renderPage(0, buf);
      } catch {
        setError("Could not read the PDF file.");
      } finally {
        setLoading(false);
      }
    },
    [renderPage],
  );

  // Re-render when page changes
  useEffect(() => {
    if (pdfBytes && numPages > 0) {
      renderPage(currentPage, pdfBytes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ========================================================================
  // File Drop / Select
  // ========================================================================

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type === "application/pdf") {
        loadFile(f);
      } else {
        setError("Please drop a PDF file.");
      }
    },
    [loadFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) loadFile(f);
      e.target.value = "";
    },
    [loadFile],
  );

  // ========================================================================
  // Annotation Placement (click on overlay)
  // ========================================================================

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool === "select" || draggingId) return;
      if (editingId) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;

      if (activeTool === "signature") {
        if (!signatureDataUrl) {
          setShowSigPanel(true);
          return;
        }
        const ann: Annotation = {
          id: uid(),
          type: "signature",
          pageIndex: currentPage,
          x: Math.max(0, clickX - SIG_WIDTH_PCT / 2),
          y: Math.max(0, clickY - SIG_HEIGHT_PCT / 2),
          width: SIG_WIDTH_PCT,
          height: SIG_HEIGHT_PCT,
          content: signatureDataUrl,
        };
        setAnnotations((prev) => [...prev, ann]);
      } else if (activeTool === "text") {
        const ann: Annotation = {
          id: uid(),
          type: "text",
          pageIndex: currentPage,
          x: Math.max(0, clickX - TEXT_WIDTH_PCT / 2),
          y: Math.max(0, clickY - TEXT_HEIGHT_PCT / 2),
          width: TEXT_WIDTH_PCT,
          height: TEXT_HEIGHT_PCT,
          content: "",
        };
        setAnnotations((prev) => [...prev, ann]);
        setEditingId(ann.id);
      } else if (activeTool === "date") {
        const ann: Annotation = {
          id: uid(),
          type: "date",
          pageIndex: currentPage,
          x: Math.max(0, clickX - DATE_WIDTH_PCT / 2),
          y: Math.max(0, clickY - DATE_HEIGHT_PCT / 2),
          width: DATE_WIDTH_PCT,
          height: DATE_HEIGHT_PCT,
          content: todayString(),
        };
        setAnnotations((prev) => [...prev, ann]);
      }
    },
    [activeTool, currentPage, signatureDataUrl, draggingId, editingId],
  );

  // ========================================================================
  // Annotation Dragging
  // ========================================================================

  const startDrag = useCallback(
    (e: React.MouseEvent, annId: string) => {
      e.stopPropagation();
      if (editingId === annId) return;
      const overlay = overlayRef.current;
      if (!overlay) return;

      const rect = overlay.getBoundingClientRect();
      const ann = annotations.find((a) => a.id === annId);
      if (!ann) return;

      const annPxX = (ann.x / 100) * rect.width;
      const annPxY = (ann.y / 100) * rect.height;
      dragOffset.current = {
        x: e.clientX - rect.left - annPxX,
        y: e.clientY - rect.top - annPxY,
      };
      setDraggingId(annId);
    },
    [annotations, editingId],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();

      const newX =
        ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
      const newY =
        ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100;

      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === draggingId
            ? {
                ...a,
                x: Math.max(0, Math.min(100 - a.width, newX)),
                y: Math.max(0, Math.min(100 - a.height, newY)),
              }
            : a,
        ),
      );
    },
    [draggingId],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // ========================================================================
  // Annotation Delete / Update
  // ========================================================================

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setEditingId((prev) => (prev === id ? null : prev));
  }, []);

  const updateAnnotationContent = useCallback((id: string, content: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, content } : a)),
    );
  }, []);

  // ========================================================================
  // Signature Pad (Draw)
  // ========================================================================

  const getCanvasPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const redrawSigCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const path of sigPaths.current) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }
  }, []);

  const onSigPointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      isDrawing.current = true;
      const pos = getCanvasPos(e, canvas);
      sigPaths.current.push([pos]);
    },
    [],
  );

  const onSigPointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      const pos = getCanvasPos(e, canvas);
      const currentPath = sigPaths.current[sigPaths.current.length - 1];
      if (currentPath) {
        currentPath.push(pos);
      }
      redrawSigCanvas();
    },
    [redrawSigCanvas],
  );

  const onSigPointerUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const clearSigCanvas = useCallback(() => {
    sigPaths.current = [];
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ========================================================================
  // Signature: Use / Upload
  // ========================================================================

  const useDrawnSignature = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    // Check that something was drawn
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imgData.data.some(
      (val, idx) => idx % 4 === 3 && val > 0,
    );
    if (!hasContent) return;

    setSignatureDataUrl(canvas.toDataURL("image/png"));
    setShowSigPanel(false);
    setActiveTool("signature");
  }, []);

  const useTypedSignature = useCallback(() => {
    if (!typedName.trim()) return;
    // Render typed name onto an offscreen canvas in italic font
    const offscreen = document.createElement("canvas");
    offscreen.width = 400;
    offscreen.height = 100;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);
    ctx.font = "italic 40px 'Times New Roman', Times, serif";
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 10, 50);

    setSignatureDataUrl(offscreen.toDataURL("image/png"));
    setShowSigPanel(false);
    setActiveTool("signature");
  }, [typedName]);

  const handleSigUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        setError("Please upload a PNG or JPG image.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSignatureDataUrl(reader.result as string);
        setShowSigPanel(false);
        setActiveTool("signature");
      };
      reader.readAsDataURL(f);
      e.target.value = "";
    },
    [],
  );

  // ========================================================================
  // Download: embed annotations into PDF via pdf-lib
  // ========================================================================

  const handleDownload = useCallback(async () => {
    if (!pdfBytes || annotations.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const timesItalic = await pdfDoc.embedFont(
        StandardFonts.TimesRomanItalic,
      );
      const pages = pdfDoc.getPages();

      for (const ann of annotations) {
        const page = pages[ann.pageIndex];
        if (!page) continue;

        const pageW = page.getWidth();
        const pageH = page.getHeight();
        const absX = (ann.x / 100) * pageW;
        const absY = (ann.y / 100) * pageH;
        const absW = (ann.width / 100) * pageW;
        const absH = (ann.height / 100) * pageH;

        // PDF Y: 0 at bottom, so convert from top-down
        const pdfY = pageH - absY - absH;

        if (ann.type === "signature" && ann.content) {
          try {
            // Convert data URL to bytes
            const base64 = ann.content.split(",")[1];
            const bytes = Uint8Array.from(atob(base64), (c) =>
              c.charCodeAt(0),
            );

            const isPng = ann.content.includes("image/png");
            const sigImage = isPng
              ? await pdfDoc.embedPng(bytes)
              : await pdfDoc.embedJpg(bytes);

            page.drawImage(sigImage, {
              x: absX,
              y: pdfY,
              width: absW,
              height: absH,
            });
          } catch (err) {
            console.error("Failed to embed signature:", err);
          }
        } else if (ann.type === "text" && ann.content) {
          const fontSize = Math.max(8, Math.min(24, absH * 0.7));
          page.drawText(ann.content, {
            x: absX,
            y: pdfY + absH * 0.15,
            size: fontSize,
            font: helvetica,
            color: rgb(0, 0, 0),
          });
        } else if (ann.type === "date" && ann.content) {
          const fontSize = Math.max(8, Math.min(18, absH * 0.7));
          page.drawText(ann.content, {
            x: absX,
            y: pdfY + absH * 0.15,
            size: fontSize,
            font: timesItalic,
            color: rgb(0, 0, 0),
          });
        }
      }

      const modifiedPdf = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdf) as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = file?.name?.replace(/\.pdf$/i, "") ?? "document";
      a.href = url;
      a.download = `${baseName}-signed.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      trackEvent("tool_used", { tool: "sign-pdf" });
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to generate the signed PDF.");
    } finally {
      setLoading(false);
    }
  }, [pdfBytes, annotations, file]);

  // ========================================================================
  // Derived state
  // ========================================================================

  const pageAnnotations = annotations.filter(
    (a) => a.pageIndex === currentPage,
  );
  const hasAnnotations = annotations.length > 0;

  // ========================================================================
  // Render
  // ========================================================================

  // ---- Upload screen -----------------------------------------------------
  if (!file) {
    return (
      <div className="space-y-4 fade-in">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
            isDraggingFile
              ? "border-accent bg-accent/5"
              : "border-border hover:border-border-hover hover:bg-bg-surface/50"
          }`}
        >
          <Upload
            className={`w-10 h-10 mx-auto mb-4 ${
              isDraggingFile ? "text-accent" : "text-text-tertiary"
            }`}
          />
          <p className="text-text-secondary text-sm font-medium">
            Drop a PDF here or click to browse
          </p>
          <p className="text-text-tertiary text-xs mt-2">
            Sign, add text, and date-stamp PDFs entirely in your browser
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        {error && <p className="text-grade-f text-xs">{error}</p>}
      </div>
    );
  }

  // ---- Main editor -------------------------------------------------------
  return (
    <div className="space-y-4 fade-in">
      {/* Toolbar */}
      <div className="bg-bg-surface border border-border p-2 flex flex-wrap items-center gap-2">
        {/* Tool buttons */}
        <button
          onClick={() => {
            setActiveTool("select");
            setEditingId(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTool === "select"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary"
          }`}
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          Select
        </button>

        <button
          onClick={() => {
            if (!signatureDataUrl) {
              setShowSigPanel(true);
            } else {
              setActiveTool("signature");
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTool === "signature"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary"
          }`}
        >
          <PenLine className="w-3.5 h-3.5" />
          Signature
        </button>

        <button
          onClick={() => setActiveTool("text")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTool === "text"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Text
        </button>

        <button
          onClick={() => setActiveTool("date")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTool === "date"
              ? "bg-accent text-accent-fg"
              : "bg-bg-elevated text-text-secondary hover:text-text-primary"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Date
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1.5 bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-text-secondary px-1 tabular-nums">
            {currentPage + 1} / {numPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(numPages - 1, p + 1))
            }
            disabled={currentPage >= numPages - 1}
            className="p-1.5 bg-bg-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Signature reset */}
        {signatureDataUrl && (
          <button
            onClick={() => {
              setSignatureDataUrl(null);
              if (activeTool === "signature") setActiveTool("select");
            }}
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            Reset sig
          </button>
        )}

        {/* New file */}
        <button
          onClick={() => {
            setFile(null);
            setPdfBytes(null);
            setAnnotations([]);
            setSignatureDataUrl(null);
            setNumPages(0);
            setCurrentPage(0);
            setActiveTool("select");
            setError(null);
          }}
          className="p-1.5 bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          title="Load a different PDF"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={!hasAnnotations || loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            hasAnnotations && !loading
              ? "bg-grade-a text-white hover:bg-grade-a/90"
              : "bg-bg-elevated text-text-tertiary cursor-not-allowed"
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Download
        </button>
      </div>

      {/* Active tool hint */}
      {activeTool !== "select" && (
        <p className="text-xs text-text-tertiary">
          {activeTool === "signature" &&
            (signatureDataUrl
              ? "Click on the PDF to place your signature."
              : "Create a signature first, then click to place it.")}
          {activeTool === "text" && "Click on the PDF to add a text field."}
          {activeTool === "date" && "Click on the PDF to stamp today's date."}
        </p>
      )}

      {/* PDF Canvas + Annotations Overlay */}
      <div
        className="border border-border overflow-hidden relative bg-bg-elevated"
        style={{
          cursor:
            activeTool === "select"
              ? "default"
              : draggingId
                ? "grabbing"
                : "crosshair",
        }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-auto"
          style={{ display: numPages > 0 ? "block" : "none" }}
        />

        {/* Overlay for annotations */}
        <div
          ref={overlayRef}
          className="absolute inset-0"
          onClick={handleOverlayClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {pageAnnotations.map((ann) => (
            <div
              key={ann.id}
              className={`absolute group ${
                draggingId === ann.id ? "z-20" : "z-10"
              }`}
              style={{
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                width: `${ann.width}%`,
                height: `${ann.height}%`,
              }}
              onMouseDown={(e) => startDrag(e, ann.id)}
            >
              {/* Visual content */}
              <div
                className={`w-full h-full rounded border transition-colors ${
                  draggingId === ann.id
                    ? "border-accent bg-accent/10"
                    : "border-accent/40 hover:border-accent bg-transparent hover:bg-accent/5"
                }`}
              >
                {ann.type === "signature" && ann.content && (
                  <img
                    src={ann.content}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                )}
                {ann.type === "text" && (
                  <>
                    {editingId === ann.id ? (
                      <input
                        type="text"
                        value={ann.content}
                        onChange={(e) =>
                          updateAnnotationContent(ann.id, e.target.value)
                        }
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingId(null);
                        }}
                        autoFocus
                        className="w-full h-full bg-transparent text-black text-xs px-1 outline-none border-none"
                        style={{ fontSize: "clamp(8px, 1.4vw, 16px)" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center px-1 text-black text-xs cursor-text truncate"
                        style={{ fontSize: "clamp(8px, 1.4vw, 16px)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(ann.id);
                        }}
                      >
                        {ann.content || (
                          <span className="text-gray-400 italic">
                            Click to type
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
                {ann.type === "date" && (
                  <div
                    className="w-full h-full flex items-center px-1 text-black italic text-xs pointer-events-none truncate"
                    style={{ fontSize: "clamp(8px, 1.2vw, 14px)" }}
                  >
                    {ann.content}
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnnotation(ann.id);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-grade-f text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-bg-primary/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-grade-f text-xs">{error}</p>}

      {/* Signature Creation Panel */}
      {showSigPanel && (
        <div className="bg-bg-surface border border-border p-4 space-y-4 fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              Create Signature
            </h3>
            <button
              onClick={() => setShowSigPanel(false)}
              className="p-1 rounded hover:bg-bg-elevated transition-colors text-text-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-bg-elevated p-1">
            {(["draw", "type", "upload"] as SigTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSigTab(tab)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  sigTab === tab
                    ? "bg-accent text-accent-fg"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Draw tab */}
          {sigTab === "draw" && (
            <div className="space-y-3">
              <canvas
                ref={sigCanvasRef}
                width={500}
                height={150}
                className="w-full border border-border bg-white cursor-crosshair touch-none"
                style={{ height: "120px" }}
                onMouseDown={onSigPointerDown}
                onMouseMove={onSigPointerMove}
                onMouseUp={onSigPointerUp}
                onMouseLeave={onSigPointerUp}
                onTouchStart={onSigPointerDown}
                onTouchMove={onSigPointerMove}
                onTouchEnd={onSigPointerUp}
              />
              <div className="flex gap-2">
                <button
                  onClick={clearSigCanvas}
                  className="px-3 py-1.5 bg-bg-elevated text-text-secondary hover:text-text-primary text-xs transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={useDrawnSignature}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-medium transition-colors"
                >
                  Use Signature
                </button>
              </div>
            </div>
          )}

          {/* Type tab */}
          {sigTab === "type" && (
            <div className="space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name"
                className="w-full bg-bg-elevated border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
              />
              {/* Preview */}
              {typedName && (
                <div className="bg-white px-4 py-3 border border-border">
                  <span
                    className="text-black text-2xl"
                    style={{
                      fontFamily: "'Times New Roman', Times, serif",
                      fontStyle: "italic",
                    }}
                  >
                    {typedName}
                  </span>
                </div>
              )}
              <button
                onClick={useTypedSignature}
                disabled={!typedName.trim()}
                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Use Signature
              </button>
            </div>
          )}

          {/* Upload tab */}
          {sigTab === "upload" && (
            <div className="space-y-3">
              <button
                onClick={() => sigUploadRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-border-hover p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-text-tertiary" />
                <p className="text-text-secondary text-xs">
                  Upload a signature image (PNG or JPG)
                </p>
              </button>
              <input
                ref={sigUploadRef}
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={handleSigUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Annotations summary */}
      {annotations.length > 0 && (
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span>
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}{" "}
            across{" "}
            {new Set(annotations.map((a) => a.pageIndex)).size} page
            {new Set(annotations.map((a) => a.pageIndex)).size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setAnnotations([])}
            className="text-text-tertiary hover:text-grade-f transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
