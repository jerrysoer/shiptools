"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Ruler, ArrowLeftRight } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* -- Unit definitions ----------------------------- */

type Category = "length" | "weight" | "temperature" | "data" | "time" | "speed";

interface UnitDef {
  label: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "length", label: "Length" },
  { value: "weight", label: "Weight" },
  { value: "temperature", label: "Temperature" },
  { value: "data", label: "Data" },
  { value: "time", label: "Time" },
  { value: "speed", label: "Speed" },
];

const linear = (factor: number): Pick<UnitDef, "toBase" | "fromBase"> => ({
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor,
});

const UNITS: Record<Category, UnitDef[]> = {
  length: [
    { label: "Millimeters", symbol: "mm", ...linear(0.001) },
    { label: "Centimeters", symbol: "cm", ...linear(0.01) },
    { label: "Meters", symbol: "m", ...linear(1) },
    { label: "Kilometers", symbol: "km", ...linear(1000) },
    { label: "Inches", symbol: "in", ...linear(0.0254) },
    { label: "Feet", symbol: "ft", ...linear(0.3048) },
    { label: "Yards", symbol: "yd", ...linear(0.9144) },
    { label: "Miles", symbol: "mi", ...linear(1609.344) },
  ],
  weight: [
    { label: "Milligrams", symbol: "mg", ...linear(0.000001) },
    { label: "Grams", symbol: "g", ...linear(0.001) },
    { label: "Kilograms", symbol: "kg", ...linear(1) },
    { label: "Pounds", symbol: "lb", ...linear(0.45359237) },
    { label: "Ounces", symbol: "oz", ...linear(0.028349523) },
    { label: "Metric Tons", symbol: "ton", ...linear(1000) },
  ],
  temperature: [
    {
      label: "Celsius", symbol: "\u00B0C",
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    {
      label: "Fahrenheit", symbol: "\u00B0F",
      toBase: (v) => (v - 32) * (5 / 9),
      fromBase: (v) => v * (9 / 5) + 32,
    },
    {
      label: "Kelvin", symbol: "K",
      toBase: (v) => v - 273.15,
      fromBase: (v) => v + 273.15,
    },
  ],
  data: [
    { label: "Bytes", symbol: "B", ...linear(1) },
    { label: "Kilobytes", symbol: "KB", ...linear(1024) },
    { label: "Megabytes", symbol: "MB", ...linear(1024 ** 2) },
    { label: "Gigabytes", symbol: "GB", ...linear(1024 ** 3) },
    { label: "Terabytes", symbol: "TB", ...linear(1024 ** 4) },
    { label: "Petabytes", symbol: "PB", ...linear(1024 ** 5) },
  ],
  time: [
    { label: "Milliseconds", symbol: "ms", ...linear(0.001) },
    { label: "Seconds", symbol: "s", ...linear(1) },
    { label: "Minutes", symbol: "min", ...linear(60) },
    { label: "Hours", symbol: "hr", ...linear(3600) },
    { label: "Days", symbol: "day", ...linear(86400) },
    { label: "Weeks", symbol: "week", ...linear(604800) },
    { label: "Years", symbol: "year", ...linear(31557600) },
  ],
  speed: [
    { label: "Meters/second", symbol: "m/s", ...linear(1) },
    { label: "Kilometers/hour", symbol: "km/h", ...linear(1 / 3.6) },
    { label: "Miles/hour", symbol: "mph", ...linear(0.44704) },
    { label: "Knots", symbol: "knots", ...linear(0.514444) },
  ],
};

/* -- Component ------------------------------------ */

export default function UnitConverter() {
  const [category, setCategory] = useState<Category>("length");
  const [fromIdx, setFromIdx] = useState(2); // meters
  const [toIdx, setToIdx] = useState(5); // feet
  const [inputValue, setInputValue] = useState("1");

  useEffect(() => {
    trackEvent("tool_opened", { tool: "unit_converter" });
  }, []);

  const units = UNITS[category];
  const fromUnit = units[fromIdx];
  const toUnit = units[toIdx];

  // Reset indices when category changes
  const handleCategoryChange = useCallback((cat: Category) => {
    setCategory(cat);
    setFromIdx(0);
    setToIdx(1);
    setInputValue("1");
    trackEvent("tool_used", { tool: "unit_converter", action: "category_change", category: cat });
  }, []);

  const handleSwap = useCallback(() => {
    setFromIdx(toIdx);
    setToIdx(fromIdx);
  }, [fromIdx, toIdx]);

  const result = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || !fromUnit || !toUnit) return "";
    const baseValue = fromUnit.toBase(num);
    const converted = toUnit.fromBase(baseValue);
    // Smart formatting: avoid floating point noise
    if (Math.abs(converted) < 0.000001 && converted !== 0) {
      return converted.toExponential(6);
    }
    // Use toPrecision for very large or very small numbers
    const str = converted.toPrecision(12);
    // Remove trailing zeros after decimal point
    return parseFloat(str).toString();
  }, [inputValue, fromUnit, toUnit]);

  return (
    <div>
      <ToolPageHeader
        icon={Ruler}
        title="Unit Converter"
        description="Convert between units of length, weight, temperature, data, time, and speed. Results update as you type."
      />

      {/* Category selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              category === cat.value
                ? "bg-accent text-accent-fg"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Converter */}
      <div className="bg-bg-surface border border-border p-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          {/* From */}
          <div>
            <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
              From
            </label>
            <select
              value={fromIdx}
              onChange={(e) => setFromIdx(Number(e.target.value))}
              className="w-full bg-bg-elevated border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mb-2"
            >
              {units.map((unit, i) => (
                <option key={unit.symbol} value={i}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter value"
              className="w-full bg-bg-elevated border border-border px-4 py-3 text-lg text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* Swap button */}
          <div className="flex items-center justify-center sm:pb-2">
            <button
              onClick={handleSwap}
              className="p-2 bg-bg-elevated border border-border hover:border-border-hover transition-colors"
              title="Swap units"
            >
              <ArrowLeftRight className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          {/* To */}
          <div>
            <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
              To
            </label>
            <select
              value={toIdx}
              onChange={(e) => setToIdx(Number(e.target.value))}
              className="w-full bg-bg-elevated border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mb-2"
            >
              {units.map((unit, i) => (
                <option key={unit.symbol} value={i}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
            <div className="w-full bg-bg-elevated border border-border px-4 py-3 text-lg text-accent font-mono min-h-[52px] flex items-center">
              {result || "\u00A0"}
            </div>
          </div>
        </div>

        {/* Conversion formula */}
        {result && fromUnit && toUnit && inputValue && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-secondary text-center">
              {inputValue} {fromUnit.symbol} = {result} {toUnit.symbol}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
