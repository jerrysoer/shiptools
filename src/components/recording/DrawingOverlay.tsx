"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import DrawingToolbar from "./DrawingToolbar";
import { DrawingEngine } from "@/lib/recording/drawing";
import type { DrawingTool } from "@/lib/recording/drawing";

interface DrawingOverlayProps {
  width: number;
  height: number;
  active: boolean;
  onCanvasRef?: (canvas: HTMLCanvasElement | null) => void;
  className?: string;
}

export default function DrawingOverlay({
  width,
  height,
  active,
  onCanvasRef,
  className,
}: DrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);

  const [activeTool, setActiveTool] = useState<DrawingTool>("pen");
  const [color, setColor] = useState("#FF3B30");
  const [lineWidth, setLineWidth] = useState(3);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Sync undo/redo state after any action
  const syncUndoRedo = useCallback(() => {
    if (!engineRef.current) return;
    setCanUndo(engineRef.current.canUndo);
    setCanRedo(engineRef.current.canRedo);
  }, []);

  // Initialize engine when canvas mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const engine = new DrawingEngine(canvas);
    engineRef.current = engine;
    onCanvasRef?.(canvas);

    return () => {
      engineRef.current = null;
      onCanvasRef?.(null);
    };
  }, [width, height, onCanvasRef]);

  // Sync tool/color/lineWidth to engine
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.tool = activeTool;
  }, [activeTool]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.color = color;
  }, [color]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.lineWidth = lineWidth;
  }, [lineWidth]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!active || !engineRef.current) return;
      engineRef.current.onPointerDown(e.nativeEvent);
    },
    [active],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active || !engineRef.current) return;
      engineRef.current.onPointerMove(e.nativeEvent);
    },
    [active],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!active || !engineRef.current) return;
      engineRef.current.onPointerUp(e.nativeEvent);
      syncUndoRedo();
    },
    [active, syncUndoRedo],
  );

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.shiftKey && e.key === "z") {
        e.preventDefault();
        engineRef.current.redo();
        syncUndoRedo();
      } else if (isCtrl && e.key === "z") {
        e.preventDefault();
        engineRef.current.undo();
        syncUndoRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, syncUndoRedo]);

  const handleUndo = useCallback(() => {
    engineRef.current?.undo();
    syncUndoRedo();
  }, [syncUndoRedo]);

  const handleRedo = useCallback(() => {
    engineRef.current?.redo();
    syncUndoRedo();
  }, [syncUndoRedo]);

  const handleClear = useCallback(() => {
    engineRef.current?.clear();
    syncUndoRedo();
  }, [syncUndoRedo]);

  if (!active) return null;

  return (
    <div
      className={`absolute inset-0 ${className ?? ""}`}
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {/* Toolbar */}
      <DrawingToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        color={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
      />

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
