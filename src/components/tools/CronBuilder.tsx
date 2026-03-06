"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Copy, Check } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";
import { trackEvent } from "@/lib/analytics";

/* ── Cron description helpers ───────────────── */

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function describeCron(expression: string): string {
  const parts = expression.split(" ");
  if (parts.length !== 5) return "Invalid cron expression";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const pieces: string[] = [];

  // Frequency
  if (minute === "*" && hour === "*") {
    pieces.push("Every minute");
  } else if (minute === "*") {
    pieces.push("Every minute");
  } else if (minute === "0" && hour === "*") {
    pieces.push("Every hour, at minute 0");
  } else if (minute === "0" && hour === "0") {
    pieces.push("At midnight (00:00)");
  } else if (hour === "*") {
    pieces.push(`Every hour, at minute ${minute}`);
  } else {
    const h = parseInt(hour!, 10);
    const m = parseInt(minute!, 10);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    pieces.push(`At ${displayH}:${String(m).padStart(2, "0")} ${period}`);
  }

  // Day of month
  if (dayOfMonth !== "*" && dayOfMonth !== "?") {
    pieces.push(`on day ${dayOfMonth} of the month`);
  }

  // Month
  if (month !== "*") {
    const m = parseInt(month!, 10);
    if (m >= 1 && m <= 12) {
      pieces.push(`in ${MONTH_NAMES[m]}`);
    } else {
      pieces.push(`in month ${month}`);
    }
  }

  // Day of week
  if (dayOfWeek !== "*" && dayOfWeek !== "?") {
    const d = parseInt(dayOfWeek!, 10);
    if (d >= 0 && d <= 6) {
      pieces.push(`on ${DAY_NAMES[d]}`);
    } else {
      pieces.push(`on day-of-week ${dayOfWeek}`);
    }
  }

  return pieces.join(", ");
}

/* ── Presets ─────────────────────────────────── */

interface Preset {
  label: string;
  expression: string;
  values: [string, string, string, string, string];
}

const PRESETS: Preset[] = [
  { label: "Every minute", expression: "* * * * *", values: ["*", "*", "*", "*", "*"] },
  { label: "Every 5 minutes", expression: "*/5 * * * *", values: ["*/5", "*", "*", "*", "*"] },
  { label: "Every 15 minutes", expression: "*/15 * * * *", values: ["*/15", "*", "*", "*", "*"] },
  { label: "Hourly", expression: "0 * * * *", values: ["0", "*", "*", "*", "*"] },
  { label: "Daily at midnight", expression: "0 0 * * *", values: ["0", "0", "*", "*", "*"] },
  { label: "Daily at noon", expression: "0 12 * * *", values: ["0", "12", "*", "*", "*"] },
  { label: "Weekly (Sunday)", expression: "0 0 * * 0", values: ["0", "0", "*", "*", "0"] },
  { label: "Monthly", expression: "0 0 1 * *", values: ["0", "0", "1", "*", "*"] },
  { label: "Yearly", expression: "0 0 1 1 *", values: ["0", "0", "1", "1", "*"] },
];

/* ── Component ───────────────────────────────── */

export default function CronBuilder() {
  const [minute, setMinute] = useState("*");
  const [hour, setHour] = useState("*");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("*");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackEvent("tool_opened", { tool: "cron" });
  }, []);

  const expression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  const description = describeCron(expression);

  const applyPreset = useCallback((preset: Preset) => {
    const [m, h, dom, mo, dow] = preset.values;
    setMinute(m);
    setHour(h);
    setDayOfMonth(dom);
    setMonth(mo);
    setDayOfWeek(dow);
    trackEvent("tool_used", { tool: "cron" });
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(expression);
    setCopied(true);
    trackEvent("tool_used", { tool: "cron" });
    setTimeout(() => setCopied(false), 2000);
  }, [expression]);

  const minuteOptions = [
    { label: "Every minute (*)", value: "*" },
    ...Array.from({ length: 60 }, (_, i) => ({ label: String(i), value: String(i) })),
    { label: "Every 5 (*/5)", value: "*/5" },
    { label: "Every 10 (*/10)", value: "*/10" },
    { label: "Every 15 (*/15)", value: "*/15" },
    { label: "Every 30 (*/30)", value: "*/30" },
  ];

  const hourOptions = [
    { label: "Every hour (*)", value: "*" },
    ...Array.from({ length: 24 }, (_, i) => ({ label: String(i), value: String(i) })),
  ];

  const dayOfMonthOptions = [
    { label: "Every day (*)", value: "*" },
    ...Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })),
  ];

  const monthOptions = [
    { label: "Every month (*)", value: "*" },
    ...MONTH_NAMES.slice(1).map((name, i) => ({ label: name, value: String(i + 1) })),
  ];

  const dayOfWeekOptions = [
    { label: "Every day (*)", value: "*" },
    ...DAY_NAMES.map((name, i) => ({ label: name, value: String(i) })),
  ];

  const fields = [
    { label: "Minute", value: minute, onChange: setMinute, options: minuteOptions },
    { label: "Hour", value: hour, onChange: setHour, options: hourOptions },
    { label: "Day of Month", value: dayOfMonth, onChange: setDayOfMonth, options: dayOfMonthOptions },
    { label: "Month", value: month, onChange: setMonth, options: monthOptions },
    { label: "Day of Week", value: dayOfWeek, onChange: setDayOfWeek, options: dayOfWeekOptions },
  ];

  return (
    <div>
      <ToolPageHeader
        icon={Clock}
        title="Cron Expression Builder"
        description="Build cron expressions visually with dropdowns and presets. Get a human-readable explanation of any schedule."
      />

      {/* Output */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-tertiary font-medium uppercase tracking-wider">
            Cron Expression
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-grade-a" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="font-mono text-2xl text-accent mb-3">{expression}</div>
        <div className="text-sm text-text-secondary">{description}</div>
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="block text-xs text-text-tertiary mb-1.5 font-medium uppercase tracking-wider">
              {field.label}
            </label>
            <select
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Presets */}
      <div className="bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm mb-3">Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                expression === preset.expression
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-bg-elevated border border-border hover:border-border-hover text-text-secondary"
              }`}
            >
              <span>{preset.label}</span>
              <span className="font-mono text-xs text-text-tertiary ml-2 hidden sm:inline">
                {preset.expression}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
