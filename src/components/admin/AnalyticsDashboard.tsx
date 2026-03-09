"use client";

import { Download } from "lucide-react";

interface DailyRow {
  date: string;
  event: string;
  count: number;
  unique_sessions: number;
  country: string;
  properties_summary: Record<string, unknown> | null;
  referrer_domain: string;
  device_type: string;
}

interface Props {
  data: DailyRow[];
  days: number;
}

// ─── SVG Chart Helpers ───────────────────────────────

const CHART_W = 700;
const CHART_H = 200;
const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function LineChart({
  points,
  label,
}: {
  points: { date: string; value: number }[];
  label: string;
}) {
  if (points.length === 0) {
    return <EmptyChart label={label} />;
  }

  const maxVal = Math.max(...points.map((p) => p.value), 1);

  const coords = points.map((p, i) => {
    const x = PAD.left + (i / Math.max(points.length - 1, 1)) * INNER_W;
    const y = PAD.top + INNER_H - (p.value / maxVal) * INNER_H;
    return { x, y, ...p };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div>
      <h3 className="font-heading font-semibold text-lg mb-3">{label}</h3>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={label}
      >
        {/* Grid lines */}
        {yTicks.map((tick) => {
          const y = PAD.top + INNER_H - (tick / maxVal) * INNER_H;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={y}
                x2={CHART_W - PAD.right}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-tertiary)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis labels (first, mid, last) */}
        {[0, Math.floor(coords.length / 2), coords.length - 1]
          .filter((i, idx, arr) => arr.indexOf(i) === idx && coords[i])
          .map((i) => (
            <text
              key={i}
              x={coords[i].x}
              y={CHART_H - 5}
              textAnchor="middle"
              fill="var(--color-text-tertiary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {coords[i].date.slice(5)}
            </text>
          ))}

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="3"
            fill="var(--color-accent)"
          >
            <title>
              {c.date}: {c.value}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function HorizontalBarChart({
  bars,
  label,
}: {
  bars: { name: string; value: number }[];
  label: string;
}) {
  if (bars.length === 0) {
    return <EmptyChart label={label} />;
  }

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const barH = 28;
  const gap = 8;
  const labelW = 120;
  const chartH = bars.length * (barH + gap) + 10;

  return (
    <div>
      <h3 className="font-heading font-semibold text-lg mb-3">{label}</h3>
      <svg
        viewBox={`0 0 ${CHART_W} ${chartH}`}
        className="w-full h-auto"
        role="img"
        aria-label={label}
      >
        {bars.map((bar, i) => {
          const y = i * (barH + gap) + 5;
          const width = (bar.value / maxVal) * (CHART_W - labelW - 60);
          return (
            <g key={bar.name}>
              <text
                x={labelW - 8}
                y={y + barH / 2 + 4}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize="12"
                fontFamily="var(--font-body)"
              >
                {bar.name}
              </text>
              <rect
                x={labelW}
                y={y}
                width={Math.max(width, 2)}
                height={barH}
                rx="4"
                fill="var(--color-accent)"
                opacity="0.8"
              >
                <title>
                  {bar.name}: {bar.value}
                </title>
              </rect>
              <text
                x={labelW + width + 8}
                y={y + barH / 2 + 4}
                fill="var(--color-text-tertiary)"
                fontSize="12"
                fontFamily="var(--font-mono)"
              >
                {bar.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-lg mb-3">{label}</h3>
      <div className="bg-bg-surface border border-border p-8 text-center">
        <p className="text-text-tertiary text-sm">
          No data yet. Events will appear after the daily aggregation runs.
        </p>
      </div>
    </div>
  );
}

// ─── DonutChart ─────────────────────────────────────

const DONUT_COLORS = [
  "var(--color-accent)",
  "var(--color-grade-a)",
  "var(--color-grade-c)",
];
const DONUT_LABELS = ["Desktop", "Mobile", "Tablet"];

function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <EmptyChart label="Device Split" />;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      <h3 className="font-heading font-semibold text-lg mb-3">Device Split</h3>
      <div className="flex items-center gap-8">
        <svg viewBox="0 0 200 200" className="w-48 h-48 shrink-0">
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={seg.label}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="24"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 100 100)"
              />
            );
          })}
          <text
            x="100"
            y="96"
            textAnchor="middle"
            fill="var(--color-text-primary)"
            fontSize="22"
            fontWeight="600"
            fontFamily="var(--font-heading)"
          >
            {total.toLocaleString()}
          </text>
          <text
            x="100"
            y="114"
            textAnchor="middle"
            fill="var(--color-text-tertiary)"
            fontSize="11"
            fontFamily="var(--font-body)"
          >
            total
          </text>
        </svg>
        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-text-secondary">{seg.label}</span>
              <span className="font-mono text-text-tertiary ml-auto">
                {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FunnelChart ────────────────────────────────────

const FUNNEL_STEPS = [
  "page_view",
  "tool_opened",
  "tool_used",
  "report_shared",
] as const;

const FUNNEL_LABELS: Record<string, string> = {
  page_view: "Page Views",
  tool_opened: "Tool Opened",
  tool_used: "Tool Used",
  report_shared: "Report Shared",
};

function FunnelChart({ data }: { data: DailyRow[] }) {
  const stepCounts = new Map<string, number>();
  for (const row of data) {
    if (FUNNEL_STEPS.includes(row.event as (typeof FUNNEL_STEPS)[number])) {
      stepCounts.set(
        row.event,
        (stepCounts.get(row.event) ?? 0) + row.count
      );
    }
  }

  const topCount = stepCounts.get("page_view") ?? 0;
  if (topCount === 0) return <EmptyChart label="Engagement Funnel" />;

  const barH = 36;
  const gap = 12;
  const maxBarW = CHART_W - 200;
  const chartH = FUNNEL_STEPS.length * (barH + gap) + 10;

  return (
    <div>
      <h3 className="font-heading font-semibold text-lg mb-3">
        Engagement Funnel
      </h3>
      <svg
        viewBox={`0 0 ${CHART_W} ${chartH}`}
        className="w-full h-auto"
        role="img"
        aria-label="Engagement Funnel"
      >
        {FUNNEL_STEPS.map((step, i) => {
          const count = stepCounts.get(step) ?? 0;
          const pct = topCount > 0 ? (count / topCount) * 100 : 0;
          const width = Math.max((count / topCount) * maxBarW, 2);
          const y = i * (barH + gap) + 5;
          const opacity = 1 - i * 0.2;

          return (
            <g key={step}>
              <rect
                x={0}
                y={y}
                width={width}
                height={barH}
                rx="4"
                fill="var(--color-accent)"
                opacity={opacity}
              />
              <text
                x={width + 10}
                y={y + barH / 2 + 1}
                dominantBaseline="middle"
                fill="var(--color-text-secondary)"
                fontSize="12"
                fontFamily="var(--font-body)"
              >
                {FUNNEL_LABELS[step]} — {count.toLocaleString()} (
                {pct.toFixed(1)}%)
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── CSV Export ──────────────────────────────────────

function downloadCSV(data: DailyRow[], days: number) {
  const headers = [
    "date",
    "event",
    "count",
    "unique_sessions",
    "country",
    "referrer_domain",
    "device_type",
  ];

  const rows = data.map((row) =>
    [
      row.date,
      row.event,
      row.count,
      row.unique_sessions,
      row.country ?? "",
      row.referrer_domain ?? "",
      row.device_type ?? "",
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const dates = data.map((r) => r.date).sort();
  const startDate = dates[0] ?? "unknown";
  const endDate = dates[dates.length - 1] ?? "unknown";

  const a = document.createElement("a");
  a.href = url;
  a.download = `uploadless-analytics-${startDate}-${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Dashboard ──────────────────────────────────

export default function AnalyticsDashboard({ data, days }: Props) {
  // 1. Traffic Overview: daily page_view counts
  const pageViewsByDate = new Map<string, number>();
  const sessionsByDate = new Map<string, number>();

  for (const row of data) {
    if (row.event === "page_view") {
      pageViewsByDate.set(
        row.date,
        (pageViewsByDate.get(row.date) ?? 0) + row.count
      );
      sessionsByDate.set(
        row.date,
        (sessionsByDate.get(row.date) ?? 0) + row.unique_sessions
      );
    }
  }

  const trafficPoints = Array.from(pageViewsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  const sessionPoints = Array.from(sessionsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // 2. Tool Popularity: tool_used by tool name
  const toolCounts = new Map<string, number>();
  for (const row of data) {
    if (row.event === "tool_used" && row.properties_summary) {
      const tool =
        (row.properties_summary as Record<string, string>).tool ?? "unknown";
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + row.count);
    }
  }

  // If no properties_summary breakdown, fall back to total tool_used count
  if (toolCounts.size === 0) {
    for (const row of data) {
      if (row.event === "tool_used") {
        toolCounts.set("all tools", (toolCounts.get("all tools") ?? 0) + row.count);
      }
    }
  }

  const toolBars = Array.from(toolCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // 3. Geography: top 10 countries
  const countryCounts = new Map<string, number>();
  for (const row of data) {
    const country = row.country ?? "unknown";
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + row.count);
  }

  const topCountries = Array.from(countryCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // 4. Traffic Sources: top 10 referrer domains
  const referrerCounts = new Map<string, number>();
  for (const row of data) {
    const domain = row.referrer_domain ?? "direct";
    referrerCounts.set(domain, (referrerCounts.get(domain) ?? 0) + row.count);
  }

  const referrerBars = Array.from(referrerCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // 5. Device Split
  const deviceCounts = new Map<string, number>();
  for (const row of data) {
    const device = row.device_type ?? "unknown";
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + row.count);
  }

  const deviceSegments = (["desktop", "mobile", "tablet"] as const).map(
    (type, i) => ({
      label: DONUT_LABELS[i],
      value: deviceCounts.get(type) ?? 0,
      color: DONUT_COLORS[i],
    })
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl mb-1">Analytics</h1>
          <p className="text-text-secondary text-sm">
            Last {days} days of aggregated usage data.
          </p>
        </div>
        <button
          onClick={() => downloadCSV(data, days)}
          className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-border text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>

      <div className="space-y-10">
        {/* Traffic Overview */}
        <div className="bg-bg-surface border border-border p-6">
          <LineChart points={trafficPoints} label="Traffic Overview" />
        </div>

        {/* Sessions */}
        <div className="bg-bg-surface border border-border p-6">
          <LineChart points={sessionPoints} label="Daily Unique Sessions" />
        </div>

        {/* Tool Popularity */}
        <div className="bg-bg-surface border border-border p-6">
          <HorizontalBarChart bars={toolBars} label="Tool Popularity" />
        </div>

        {/* Geography */}
        <div className="bg-bg-surface border border-border p-6">
          <h3 className="font-heading font-semibold text-lg mb-4">
            Top Countries
          </h3>
          {topCountries.length === 0 ? (
            <p className="text-text-tertiary text-sm">No geographic data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">
                      Country
                    </th>
                    <th className="text-right py-2 text-text-secondary font-medium">
                      Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topCountries.map(([country, count]) => (
                    <tr
                      key={country}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 font-mono">{country}</td>
                      <td className="py-2 text-right font-mono text-text-secondary">
                        {count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="bg-bg-surface border border-border p-6">
          <HorizontalBarChart bars={referrerBars} label="Traffic Sources" />
        </div>

        {/* Device Split + Engagement Funnel side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-bg-surface border border-border p-6">
            <DonutChart segments={deviceSegments} />
          </div>
          <div className="bg-bg-surface border border-border p-6">
            <FunnelChart data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
