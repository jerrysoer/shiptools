"use client";

import {
  Pen,
  Highlighter,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Eraser,
  Undo,
  Redo,
  Trash2,
} from "lucide-react";

type DrawingTool =
  | "pen"
  | "highlighter"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "eraser";

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const TOOLS: Array<{
  id: DrawingTool;
  icon: typeof Pen;
  label: string;
}> = [
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
];

const COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#5856D6",
  "#FFFFFF",
  "#000000",
];

export default function DrawingToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: DrawingToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-bg-surface/95 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow-lg">
      {/* Tool buttons */}
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onToolChange(id)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            activeTool === id
              ? "bg-accent text-white"
              : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Color swatches */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              color === c
                ? "border-accent scale-110"
                : "border-border hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Line width slider */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] text-text-tertiary w-4 text-right tabular-nums">
          {lineWidth}
        </span>
        <input
          type="range"
          min={1}
          max={20}
          value={lineWidth}
          onChange={(e) => onLineWidthChange(Number(e.target.value))}
          className="w-16 h-1 accent-accent"
          title={`Line width: ${lineWidth}px`}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo / Redo / Clear */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onClear}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
        title="Clear all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export type { DrawingTool };
