"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Copy, Check, Play } from "lucide-react";
import ToolPageHeader from "@/components/tools/ToolPageHeader";

/* ── Helpers ─────────────────────────────────────────── */

function getTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    // Fallback for older browsers
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Australia/Sydney",
    ];
  }
}

/** Format a Date in a given timezone as a human-readable string */
function toHumanReadable(d: Date, tz: string): string {
  return d.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

/** Format a Date as ISO 8601 in a given timezone */
function toISO(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  const hms = `${get("hour")}:${get("minute")}:${get("second")}`;

  // Compute timezone offset for the display
  const localStr = new Date(
    d.toLocaleString("en-US", { timeZone: tz })
  );
  const diffMs = localStr.getTime() - d.getTime();
  // Round to nearest minute to avoid DST micro-drifts
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin === 0) return `${ymd}T${hms}Z`;
  const sign = diffMin > 0 ? "+" : "-";
  const absMin = Math.abs(diffMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, "0");
  const mm = String(absMin % 60).padStart(2, "0");
  return `${ymd}T${hms}${sign}${hh}:${mm}`;
}

/** Normalize epoch: if > 12 digits treat as ms, otherwise as seconds */
function normalizeEpoch(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  // >12 digits → milliseconds
  return trimmed.replace("-", "").length > 12 ? n : n * 1000;
}

/* ── Component ───────────────────────────────────────── */

export default function EpochConverter() {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezones = useRef(getTimezones());

  const [epochInput, setEpochInput] = useState("");
  const [humanInput, setHumanInput] = useState("");
  const [isoInput, setIsoInput] = useState("");
  const [timezone, setTimezone] = useState(localTz);
  const [now, setNow] = useState<Date>(new Date());
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync fields from a Date (source indicates which field triggered the change)
  const syncFromDate = useCallback(
    (d: Date, source: "epoch" | "human" | "iso" | "now") => {
      setError(null);
      const epochSec = Math.floor(d.getTime() / 1000);
      if (source !== "epoch") setEpochInput(String(epochSec));
      if (source !== "human") setHumanInput(toHumanReadable(d, timezone));
      if (source !== "iso") setIsoInput(toISO(d, timezone));
    },
    [timezone]
  );

  // When timezone changes, re-derive human + ISO from epoch
  useEffect(() => {
    if (!epochInput.trim()) return;
    const ms = normalizeEpoch(epochInput);
    if (ms === null) return;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return;
    setHumanInput(toHumanReadable(d, timezone));
    setIsoInput(toISO(d, timezone));
  }, [timezone, epochInput]);

  const handleEpochChange = (raw: string) => {
    setEpochInput(raw);
    const ms = normalizeEpoch(raw);
    if (ms === null) {
      if (raw.trim()) setError("Enter a valid integer (seconds or milliseconds)");
      else setError(null);
      return;
    }
    const d = new Date(ms);
    if (isNaN(d.getTime())) {
      setError("Timestamp out of range");
      return;
    }
    syncFromDate(d, "epoch");
  };

  const handleHumanChange = (raw: string) => {
    setHumanInput(raw);
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      if (raw.trim()) setError("Could not parse date string");
      else setError(null);
      return;
    }
    syncFromDate(d, "human");
  };

  const handleISOChange = (raw: string) => {
    setIsoInput(raw);
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      if (raw.trim()) setError("Invalid ISO 8601 format");
      else setError(null);
      return;
    }
    syncFromDate(d, "iso");
  };

  const fillNow = () => {
    const d = new Date();
    setEpochInput(String(Math.floor(d.getTime() / 1000)));
    syncFromDate(d, "now");
  };

  const copyValue = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyValue(value, field)}
      className="p-2 rounded-lg bg-bg-elevated border border-border hover:border-border-hover transition-colors shrink-0"
      title={`Copy ${field}`}
    >
      {copied === field ? (
        <Check className="w-3.5 h-3.5 text-grade-a" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-tertiary" />
      )}
    </button>
  );

  return (
    <div>
      <ToolPageHeader
        icon={Clock}
        title="Epoch Converter"
        description="Convert between Unix epoch timestamps, ISO 8601, and human-readable dates. Timestamps longer than 12 digits are auto-detected as milliseconds."
      />

      {/* Live Clock */}
      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="text-xs text-text-tertiary mb-1 font-medium uppercase tracking-wider">
          Current Time
        </div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="font-mono text-2xl text-accent tabular-nums">
            {Math.floor(now.getTime() / 1000)}
          </span>
          <span className="text-text-secondary text-sm">
            {toHumanReadable(now, timezone)}
          </span>
        </div>
      </div>

      {/* Timezone Picker + Now button */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="flex-1 bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          {timezones.current.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          onClick={fillNow}
          className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          Now
        </button>
      </div>

      {/* Conversion Fields */}
      <div className="space-y-4">
        {/* Unix Epoch */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
            Unix Epoch (seconds)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={epochInput}
              onChange={(e) => handleEpochChange(e.target.value)}
              placeholder="e.g. 1700000000"
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <CopyBtn value={epochInput} field="epoch" />
          </div>
        </div>

        {/* Human-Readable */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
            Human-Readable
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={humanInput}
              onChange={(e) => handleHumanChange(e.target.value)}
              placeholder="e.g. Tue, Nov 14, 2023, 10:13:20 AM"
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <CopyBtn value={humanInput} field="human" />
          </div>
        </div>

        {/* ISO 8601 */}
        <div className="bg-bg-surface border border-border rounded-xl p-4">
          <label className="block text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
            ISO 8601
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={isoInput}
              onChange={(e) => handleISOChange(e.target.value)}
              placeholder="e.g. 2023-11-14T10:13:20-05:00"
              className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <CopyBtn value={isoInput} field="iso" />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 text-sm text-grade-f bg-grade-f/10 border border-grade-f/20 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Quick Reference */}
      <div className="mt-8 bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="font-heading font-semibold text-sm mb-3">
          Quick Reference
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {[
            { label: "Y2K", value: "946684800" },
            { label: "Unix Epoch", value: "0" },
            { label: "Max 32-bit", value: "2147483647" },
            { label: "1 hour", value: "3600" },
            { label: "1 day", value: "86400" },
            { label: "1 week", value: "604800" },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleEpochChange(value)}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-elevated transition-colors text-left"
            >
              <span className="text-text-secondary">{label}</span>
              <span className="font-mono text-text-tertiary">{value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
