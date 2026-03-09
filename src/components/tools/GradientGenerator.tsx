"use client";

import { useState, useMemo, useEffect } from "react";
import { Palette, Copy, Check, Plus, Trash2 } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

type GradientType = "linear" | "radial" | "conic";

interface ColorStop {
  id: number;
  color: string;
  position: number;
}

let nextId = 3;

export default function GradientGenerator() {
  useEffect(() => { trackEvent("tool_opened", { tool: "gradient" }); }, []);

  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<ColorStop[]>([
    { id: 1, color: "#6366f1", position: 0 },
    { id: 2, color: "#ec4899", position: 100 },
  ]);
  const [copied, setCopied] = useState(false);

  const cssValue = useMemo(() => {
    const stopStr = stops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => `${s.color} ${s.position}%`)
      .join(", ");

    switch (type) {
      case "linear":
        return `linear-gradient(${angle}deg, ${stopStr})`;
      case "radial":
        return `radial-gradient(circle, ${stopStr})`;
      case "conic":
        return `conic-gradient(from ${angle}deg, ${stopStr})`;
    }
  }, [type, angle, stops]);

  const cssOutput = `background: ${cssValue};`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cssOutput);
    trackEvent("tool_used", { tool: "gradient" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStop = (id: number, updates: Partial<Omit<ColorStop, "id">>) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const addStop = () => {
    const midPosition = Math.round(
      stops.reduce((sum, s) => sum + s.position, 0) / stops.length
    );
    setStops((prev) => [
      ...prev,
      { id: nextId++, color: "#facc15", position: Math.min(midPosition, 100) },
    ]);
  };

  const removeStop = (id: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <ToolPageHeader
        icon={Palette}
        title="CSS Gradient Generator"
        description="Create beautiful CSS gradients with a visual editor."
      />

      {/* Live Preview */}
      <div
        className="mb-6 border border-border"
        style={{ background: cssValue, height: 200 }}
      />

      {/* Gradient Type Toggle */}
      <div className="bg-bg-surface border border-border p-1 flex mb-6">
        {(["linear", "radial", "conic"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors capitalize ${
              type === t
                ? "bg-accent text-accent-fg"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Angle Slider (linear & conic only) */}
      {(type === "linear" || type === "conic") && (
        <div className="bg-bg-surface border border-border p-6 mb-6">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-text-secondary">
              {type === "linear" ? "Angle" : "Start Angle"}
            </label>
            <span className="text-sm font-mono text-text-primary">
              {angle}deg
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-text-tertiary mt-1">
            <span>0°</span>
            <span>360°</span>
          </div>
        </div>
      )}

      {/* Color Stops */}
      <div className="bg-bg-surface border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold">Color Stops</h2>
          <button
            onClick={addStop}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Stop
          </button>
        </div>

        <div className="space-y-3">
          {stops.map((stop) => (
            <div key={stop.id} className="flex items-center gap-3">
              <input
                type="color"
                value={stop.color}
                onChange={(e) =>
                  updateStop(stop.id, { color: e.target.value })
                }
                className="w-10 h-10 border border-border cursor-pointer shrink-0 bg-transparent"
              />
              <input
                type="text"
                value={stop.color}
                onChange={(e) =>
                  updateStop(stop.id, { color: e.target.value })
                }
                className="w-24 px-3 py-2 border border-border bg-bg-elevated text-sm font-mono focus:outline-none focus:border-accent"
              />
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stop.position}
                  onChange={(e) =>
                    updateStop(stop.id, { position: Number(e.target.value) })
                  }
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-mono text-text-tertiary w-8 text-right">
                  {stop.position}%
                </span>
              </div>
              <button
                onClick={() => removeStop(stop.id)}
                disabled={stops.length <= 2}
                className="p-1.5 hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title="Remove stop"
              >
                <Trash2 className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Output */}
      <div className="bg-bg-surface border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">
            Generated CSS
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-accent text-accent-fg hover:bg-accent/90 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-4 font-mono text-sm select-all overflow-x-auto">
          {cssOutput}
        </pre>
      </div>
    </div>
  );
}
