"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Undo2, Trash2 } from "lucide-react";

interface BrushMaskCanvasProps {
  imageUrl: string;
  brushSize: number;
  onMaskChange: (mask: Blob) => void;
  width: number;
  height: number;
}

type Point = { x: number; y: number };

export default function BrushMaskCanvas({
  imageUrl,
  brushSize,
  onMaskChange,
  width,
  height,
}: BrushMaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Point[][]>([]);
  const currentPathRef = useRef<Point[]>([]);

  // Redraw canvas whenever paths or brushSize change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed paths as semi-transparent red overlay
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const path of paths) {
      if (path.length === 0) continue;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      // Also draw circles at each point for continuous coverage
      for (const pt of path) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw current in-progress path
    const currentPath = currentPathRef.current;
    if (currentPath.length > 0) {
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
      for (const pt of currentPath) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [paths, brushSize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Export mask as black/white PNG (white = inpaint areas)
  const exportMask = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Black background (keep areas)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // White for painted areas (inpaint)
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const path of paths) {
      if (path.length === 0) continue;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      for (const pt of path) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    canvas.toBlob((blob) => {
      if (blob) onMaskChange(blob);
    }, "image/png");
  }, [paths, brushSize, width, height, onMaskChange]);

  // Export mask whenever paths change (debounced by stroke completion)
  useEffect(() => {
    if (paths.length > 0) {
      exportMask();
    }
  }, [paths, exportMask]);

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const pt = getCanvasPoint(e);
    currentPathRef.current = [pt];
    canvasRef.current?.setPointerCapture(e.pointerId);
    redraw();
  }, [getCanvasPoint, redraw]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);
    currentPathRef.current.push(pt);
    redraw();
  }, [isDrawing, getCanvasPoint, redraw]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    if (currentPathRef.current.length > 0) {
      setPaths((prev) => [...prev, [...currentPathRef.current]]);
    }
    currentPathRef.current = [];
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, [isDrawing]);

  const handleUndo = useCallback(() => {
    setPaths((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPaths([]);
    currentPathRef.current = [];
    // Notify parent that mask is cleared
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
    }
  }, [width, height]);

  return (
    <div className="relative">
      {/* Background image */}
      <img
        src={imageUrl}
        alt="Image to mask"
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Canvas overlay for brush painting */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "crosshair", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Undo / Clear controls */}
      {paths.length > 0 && (
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-2 py-1 bg-bg-primary/80 text-text-primary text-xs backdrop-blur-sm border border-border hover:bg-bg-hover transition-colors"
            title="Undo last stroke"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 bg-bg-primary/80 text-text-primary text-xs backdrop-blur-sm border border-border hover:bg-bg-hover transition-colors"
            title="Clear all strokes"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
