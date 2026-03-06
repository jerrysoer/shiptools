"use client";

import { useState, useEffect } from "react";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

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

const DAY_OPTIONS = [7, 30, 90] as const;

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<DailyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/analytics?days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData(json.data ?? []);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-grade-f">Failed to load analytics: {error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Date range toggle */}
      <div className="flex items-center gap-2 mb-6">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? "bg-accent text-white"
                : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="text-center py-20">
          <p className="text-text-secondary animate-pulse">
            Loading analytics...
          </p>
        </div>
      ) : (
        <AnalyticsDashboard data={data} days={days} />
      )}
    </div>
  );
}
