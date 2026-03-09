"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, Eye, Wrench, Globe, Loader2 } from "lucide-react";
import TelemetryPreview from "@/components/TelemetryPreview";

interface PublicStats {
  total_page_views: number;
  total_tool_uses: number;
  unique_sessions: number;
  top_tools: { name: string; count: number }[];
  top_countries: { name: string; count: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bg-surface border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-accent" />
        <span className="text-text-tertiary text-xs">{label}</span>
      </div>
      <p className="font-heading font-bold text-2xl">{value}</p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function TransparencyClient() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/public")
      .then((res) => {
        if (!res.ok) throw new Error("Not available");
        return res.json();
      })
      .then((data) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const maxToolCount = stats?.top_tools?.[0]?.count || 1;

  return (
    <>
      {/* Live Event Log */}
      <section>
        <h2 className="font-heading font-semibold text-2xl mb-4">
          Live Event Preview
        </h2>
        <p className="text-text-secondary mb-4">
          This terminal shows every analytics event firing on this page in real
          time. Navigate around to see events appear.
        </p>
        <TelemetryPreview />
      </section>

      {/* Public Stats */}
      <section>
        <h2 className="font-heading font-semibold text-2xl mb-4">
          Public Stats (Last 30 Days)
        </h2>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-text-tertiary text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading stats...
          </div>
        )}

        {error && !loading && (
          <div className="bg-bg-surface border border-border p-6 text-center text-text-tertiary text-sm">
            Public stats are not available right now. Analytics may not be
            configured on this instance.
          </div>
        )}

        {stats && !loading && (
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                icon={Eye}
                label="Page views"
                value={formatNumber(stats.total_page_views)}
              />
              <StatCard
                icon={Wrench}
                label="Tool uses"
                value={formatNumber(stats.total_tool_uses)}
              />
              <StatCard
                icon={Users}
                label="Sessions"
                value={formatNumber(stats.unique_sessions)}
              />
              {stats.top_tools.length > 0 && (
                <StatCard
                  icon={BarChart3}
                  label="Most used tool"
                  value={stats.top_tools[0].name}
                />
              )}
              {stats.top_countries.length > 0 && (
                <StatCard
                  icon={Globe}
                  label="Top country"
                  value={stats.top_countries[0].name}
                />
              )}
              <StatCard
                icon={BarChart3}
                label="Tools tracked"
                value={String(stats.top_tools.length)}
              />
            </div>

            {/* Top tools bar chart */}
            {stats.top_tools.length > 0 && (
              <div className="bg-bg-surface border border-border p-5">
                <h3 className="font-heading font-semibold text-sm mb-3">
                  Top Tools
                </h3>
                <div className="space-y-2">
                  {stats.top_tools.slice(0, 8).map((tool) => (
                    <div key={tool.name} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-secondary w-24 shrink-0 truncate">
                        {tool.name}
                      </span>
                      <div className="flex-1 h-5 bg-bg-primary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/20 rounded-full"
                          style={{
                            width: `${Math.max(
                              4,
                              (tool.count / maxToolCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-tertiary w-10 text-right">
                        {formatNumber(tool.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
