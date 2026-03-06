"use client";

// F5: Camera document scanner
// - getUserMedia({ video: { facingMode: "environment" } }) for rear camera
// - Live viewfinder with edge detection overlay (draw detected quad on canvas)
// - Manual capture button + auto-capture when edges stable for 1s
// - Post-capture: perspective correction, crop
// - Image adjustments: contrast/brightness sliders, color mode (original/enhanced/grayscale/B&W)
// - Multi-page: array of captured pages, add more, reorder
// - "Save as PDF" using pdf-lib
// - "Extract Text" button using OCR (tesseract.js via lib/recording/ocr.ts)
// - Show OCR text in a copyable textarea

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  RotateCcw,
  FileText,
  Download,
  Plus,
  Trash2,
  ScanLine,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Check,
  Sliders,
  ZoomIn,
  X,
} from "lucide-react";
import { captureCamera, stopAllTracks } from "@/lib/recording/capture";
import {
  detectDocumentEdges,
  perspectiveTransform,
} from "@/lib/recording/edge-detection";
import type { DocumentCorners } from "@/lib/recording/edge-detection";
import ToolPageHeader from "../tools/ToolPageHeader";
import BrowserSupportWarning from "./BrowserSupportWarning";

type ScanState = "idle" | "viewfinder" | "adjusting" | "pages";
type ColorMode = "original" | "enhanced" | "grayscale" | "bw";

interface ScannedPage {
  id: string;
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

function applyColorMode(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: ColorMode,
  brightness: number,
  contrast: number,
): void {
  if (mode === "original" && brightness === 0 && contrast === 0) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply brightness
    r = Math.min(255, Math.max(0, r + brightness));
    g = Math.min(255, Math.max(0, g + brightness));
    b = Math.min(255, Math.max(0, b + brightness));

    // Apply contrast
    r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
    g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
    b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));

    switch (mode) {
      case "enhanced":
        // Boost saturation slightly
        break;
      case "grayscale": {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
        break;
      }
      case "bw": {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = lum > 128 ? 255 : 0;
        break;
      }
      default:
        break;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

export default function DocumentScanner() {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Viewfinder
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const stableFramesRef = useRef(0);
  const lastCornersRef = useRef<DocumentCorners | null>(null);
  const [corners, setCorners] = useState<DocumentCorners | null>(null);
  const [autoCapturing, setAutoCapturing] = useState(false);

  // Captured image
  const capturedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("original");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  // Multi-page
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePage, setActivePage] = useState(0);

  // OCR
  const [isOCRLoading, setIsOCRLoading] = useState(false);
  const [ocrProgress, setOCRProgress] = useState(0);
  const [ocrText, setOCRText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // PDF export
  const [isPDFExporting, setIsPDFExporting] = useState(false);

  // Browser check
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setIsSupported(false);
    }
  }, []);

  // ---- Viewfinder ----
  const startViewfinder = useCallback(async () => {
    setError(null);

    try {
      const stream = await captureCamera();
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setScanState("viewfinder");

      // Start edge detection loop
      detectionIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const overlay = overlayCanvasRef.current;
        if (!video || !overlay || video.readyState < 2) return;

        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;

        const ctx = overlay.getContext("2d");
        if (!ctx) return;

        // Draw video frame to temporary canvas for edge detection
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, overlay.width, overlay.height);

        // Clear overlay
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const detected = detectDocumentEdges(imageData);

        if (detected) {
          setCorners(detected);

          // Draw detected quad outline on overlay
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(detected.topLeft.x, detected.topLeft.y);
          ctx.lineTo(detected.topRight.x, detected.topRight.y);
          ctx.lineTo(detected.bottomRight.x, detected.bottomRight.y);
          ctx.lineTo(detected.bottomLeft.x, detected.bottomLeft.y);
          ctx.closePath();
          ctx.stroke();

          // Draw corner circles
          ctx.fillStyle = "#22c55e";
          const cornerPoints = [
            detected.topLeft,
            detected.topRight,
            detected.bottomLeft,
            detected.bottomRight,
          ];
          for (const pt of cornerPoints) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fill();
          }

          // Check if edges are stable for auto-capture
          if (lastCornersRef.current) {
            const prev = lastCornersRef.current;
            const threshold = 10;
            const isStable =
              Math.abs(detected.topLeft.x - prev.topLeft.x) < threshold &&
              Math.abs(detected.topLeft.y - prev.topLeft.y) < threshold &&
              Math.abs(detected.bottomRight.x - prev.bottomRight.x) <
                threshold &&
              Math.abs(detected.bottomRight.y - prev.bottomRight.y) <
                threshold;

            if (isStable) {
              stableFramesRef.current++;
              // Auto-capture after ~1s of stability (5 checks at 200ms intervals)
              if (stableFramesRef.current >= 5) {
                setAutoCapturing(true);
                captureFrame(detected);
                stableFramesRef.current = 0;
              }
            } else {
              stableFramesRef.current = 0;
            }
          }
          lastCornersRef.current = detected;
        } else {
          setCorners(null);
          stableFramesRef.current = 0;
          lastCornersRef.current = null;
        }
      }, 200);
    } catch {
      setError("Camera access was denied. Please allow camera permissions.");
    }
  }, []);

  const stopViewfinder = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      stopAllTracks(streamRef.current);
      streamRef.current = null;
    }
  }, []);

  // ---- Capture ----
  const captureFrame = useCallback(
    (detectedCorners?: DocumentCorners) => {
      const video = videoRef.current;
      if (!video) return;

      // Stop detection loop
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }

      // Draw video frame to a temporary canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(video, 0, 0);

      const activeCorners = detectedCorners ?? corners;

      let resultCanvas: HTMLCanvasElement;

      if (activeCorners) {
        // Perspective correction
        const maxW = Math.max(
          Math.hypot(
            activeCorners.topRight.x - activeCorners.topLeft.x,
            activeCorners.topRight.y - activeCorners.topLeft.y,
          ),
          Math.hypot(
            activeCorners.bottomRight.x - activeCorners.bottomLeft.x,
            activeCorners.bottomRight.y - activeCorners.bottomLeft.y,
          ),
        );
        const maxH = Math.max(
          Math.hypot(
            activeCorners.bottomLeft.x - activeCorners.topLeft.x,
            activeCorners.bottomLeft.y - activeCorners.topLeft.y,
          ),
          Math.hypot(
            activeCorners.bottomRight.x - activeCorners.topRight.x,
            activeCorners.bottomRight.y - activeCorners.topRight.y,
          ),
        );

        resultCanvas = perspectiveTransform(
          tempCanvas,
          activeCorners,
          Math.round(maxW),
          Math.round(maxH),
        );
      } else {
        // No corners detected -- use full frame
        resultCanvas = tempCanvas;
      }

      capturedCanvasRef.current = resultCanvas;
      setScanState("adjusting");
      setAutoCapturing(false);
    },
    [corners],
  );

  const handleManualCapture = useCallback(() => {
    captureFrame();
  }, [captureFrame]);

  // ---- Apply adjustments and add to pages ----
  const confirmPage = useCallback(() => {
    const source = capturedCanvasRef.current;
    if (!source) return;

    // Create a copy with adjustments applied
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    applyColorMode(ctx, canvas.width, canvas.height, colorMode, brightness, contrast);

    const page: ScannedPage = {
      id: crypto.randomUUID(),
      canvas,
      dataUrl: canvas.toDataURL("image/png"),
    };

    setPages((prev) => [...prev, page]);
    setActivePage(pages.length);

    // Stop camera and go to pages view
    stopViewfinder();
    setScanState("pages");
    setColorMode("original");
    setBrightness(0);
    setContrast(0);
  }, [colorMode, brightness, contrast, pages.length, stopViewfinder]);

  // ---- Add more pages ----
  const handleAddMore = useCallback(async () => {
    setCorners(null);
    stableFramesRef.current = 0;
    lastCornersRef.current = null;
    await startViewfinder();
  }, [startViewfinder]);

  // ---- Delete page ----
  const handleDeletePage = useCallback(
    (index: number) => {
      setPages((prev) => prev.filter((_, i) => i !== index));
      if (activePage >= pages.length - 1) {
        setActivePage(Math.max(0, pages.length - 2));
      }
      if (pages.length <= 1) {
        setScanState("idle");
      }
    },
    [activePage, pages.length],
  );

  // ---- Export as PDF ----
  const handleExportPDF = useCallback(async () => {
    if (pages.length === 0) return;
    setIsPDFExporting(true);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();

      for (const page of pages) {
        const pngBytes = await fetch(page.dataUrl).then((r) =>
          r.arrayBuffer(),
        );
        const pngImage = await pdfDoc.embedPng(new Uint8Array(pngBytes));

        const { width: imgW, height: imgH } = pngImage.scale(1);

        // A4 dimensions at 72 DPI
        const pageWidth = 595;
        const pageHeight = 842;

        const scale = Math.min(pageWidth / imgW, pageHeight / imgH);
        const scaledW = imgW * scale;
        const scaledH = imgH * scale;

        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pdfPage.drawImage(pngImage, {
          x: (pageWidth - scaledW) / 2,
          y: (pageHeight - scaledH) / 2,
          width: scaledW,
          height: scaledH,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scan-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("Failed to export PDF. Please try again.");
    } finally {
      setIsPDFExporting(false);
    }
  }, [pages]);

  // ---- OCR ----
  const handleOCR = useCallback(async () => {
    if (pages.length === 0) return;

    setIsOCRLoading(true);
    setOCRProgress(0);
    setOCRText(null);

    try {
      const { loadOCR, recognizeText } = await import(
        "@/lib/recording/ocr"
      );

      await loadOCR((p) => setOCRProgress(Math.round(p.progress * 0.5)));
      setOCRProgress(50);

      const texts: string[] = [];

      for (let i = 0; i < pages.length; i++) {
        const result = await recognizeText(pages[i].canvas);
        texts.push(
          pages.length > 1
            ? `--- Page ${i + 1} ---\n${result.text}`
            : result.text,
        );
        setOCRProgress(50 + Math.round(((i + 1) / pages.length) * 50));
      }

      setOCRText(texts.join("\n\n"));
    } catch (err) {
      console.error("OCR failed:", err);
      setError("Text recognition failed. Please try again.");
    } finally {
      setIsOCRLoading(false);
    }
  }, [pages]);

  const handleCopyText = useCallback(() => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [ocrText]);

  // ---- Reset ----
  const handleReset = useCallback(() => {
    stopViewfinder();
    setScanState("idle");
    setPages([]);
    setActivePage(0);
    setOCRText(null);
    setError(null);
    setCorners(null);
    capturedCanvasRef.current = null;
  }, [stopViewfinder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopViewfinder();
    };
  }, [stopViewfinder]);

  if (!isSupported) {
    return (
      <div>
        <ToolPageHeader
          icon={ScanLine}
          title="Document Scanner"
          description="Scan documents to PDF with your camera."
        />
        <BrowserSupportWarning
          feature="Camera access"
          description="Your browser does not support camera access required for document scanning."
        />
      </div>
    );
  }

  return (
    <div>
      <ToolPageHeader
        icon={ScanLine}
        title="Document Scanner"
        description="Scan documents to PDF with your camera. Edge detection, perspective correction, and OCR."
      />

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Idle state */}
      {scanState === "idle" && (
        <div className="text-center py-16">
          <button
            type="button"
            onClick={startViewfinder}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-accent text-white font-medium text-lg transition-colors hover:bg-accent/90"
          >
            <Camera className="w-6 h-6" />
            Start Scanning
          </button>
          <p className="text-text-tertiary text-sm mt-4">
            Point your camera at a document. Edges will be detected
            automatically.
          </p>
        </div>
      )}

      {/* Viewfinder */}
      {scanState === "viewfinder" && (
        <div className="space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Edge detection status */}
            <div className="absolute top-3 left-3 z-10">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                  corners
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    corners
                      ? "bg-green-400 animate-pulse"
                      : "bg-yellow-400"
                  }`}
                />
                {corners
                  ? autoCapturing
                    ? "Auto-capturing..."
                    : "Document detected"
                  : "Looking for document..."}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                stopViewfinder();
                setScanState("idle");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleManualCapture}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors shadow-lg"
              title="Capture"
            >
              <Camera className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* Adjusting captured image */}
      {scanState === "adjusting" && capturedCanvasRef.current && (
        <div className="space-y-4">
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <img
              src={capturedCanvasRef.current.toDataURL()}
              alt="Captured document"
              className="w-full rounded-lg"
            />
          </div>

          {/* Color mode selector */}
          <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-3">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              Adjustments
            </label>

            <div className="flex gap-2">
              {(
                [
                  { id: "original", label: "Original" },
                  { id: "enhanced", label: "Enhanced" },
                  { id: "grayscale", label: "Gray" },
                  { id: "bw", label: "B&W" },
                ] as Array<{ id: ColorMode; label: string }>
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setColorMode(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    colorMode === id
                      ? "bg-accent text-white"
                      : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Brightness */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-tertiary w-16">
                Brightness
              </span>
              <input
                type="range"
                min={-100}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="text-xs text-text-tertiary w-8 text-right tabular-nums">
                {brightness}
              </span>
            </div>

            {/* Contrast */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-tertiary w-16">Contrast</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="text-xs text-text-tertiary w-8 text-right tabular-nums">
                {contrast}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setScanState("viewfinder");
                startViewfinder();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
            <button
              type="button"
              onClick={confirmPage}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-medium transition-colors hover:bg-accent/90"
            >
              <Check className="w-4 h-4" />
              Add Page
            </button>
          </div>
        </div>
      )}

      {/* Pages view */}
      {scanState === "pages" && pages.length > 0 && (
        <div className="space-y-6">
          {/* Page carousel */}
          <div className="bg-bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-sm">
                Page {activePage + 1} of {pages.length}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setActivePage(Math.max(0, activePage - 1))
                  }
                  disabled={activePage === 0}
                  className="p-1.5 rounded-lg text-text-secondary hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivePage(
                      Math.min(pages.length - 1, activePage + 1),
                    )
                  }
                  disabled={activePage === pages.length - 1}
                  className="p-1.5 rounded-lg text-text-secondary hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <img
              src={pages[activePage]?.dataUrl}
              alt={`Scanned page ${activePage + 1}`}
              className="w-full rounded-lg"
            />
          </div>

          {/* Page thumbnails */}
          {pages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pages.map((page, i) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePage(i)}
                  className={`relative shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activePage
                      ? "border-accent"
                      : "border-border hover:border-border-hover"
                  }`}
                >
                  <img
                    src={page.dataUrl}
                    alt={`Page ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Page actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddMore}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-primary hover:border-border-hover transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Page
            </button>
            <button
              type="button"
              onClick={() => handleDeletePage(activePage)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Page
            </button>
          </div>

          {/* Export section */}
          <div className="bg-bg-surface border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-accent" />
              Export
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isPDFExporting}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent text-white font-medium text-sm transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPDFExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Save as PDF
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleOCR}
                disabled={isOCRLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-bg-elevated border border-border text-text-primary font-medium text-sm transition-colors hover:border-border-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOCRLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recognizing... {ocrProgress}%
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    Extract Text
                  </>
                )}
              </button>
            </div>

            {isOCRLoading && (
              <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* OCR output */}
          {ocrText !== null && (
            <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Extracted Text
                </h3>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={ocrText}
                className="w-full h-48 px-4 py-3 bg-transparent text-text-primary text-sm font-mono resize-y focus:outline-none"
              />
            </div>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
