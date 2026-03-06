import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Analytics not configured" },
      { status: 503 }
    );
  }

  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("sl_analytics_daily")
      .select("date, event, country, count, unique_sessions, properties_summary")
      .gte("date", thirtyDaysAgo);

    if (error) throw error;

    const rows = data || [];

    let totalPageViews = 0;
    let totalToolUses = 0;
    let totalUniqueSessions = 0;
    const toolCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};

    for (const row of rows) {
      if (row.event === "page_view") {
        totalPageViews += row.count || 0;
      }
      if (row.event === "tool_used") {
        totalToolUses += row.count || 0;
        // Extract tool name from properties_summary if available
        const summary = row.properties_summary as Record<string, string> | null;
        const toolName = summary?.tool ?? "unknown";
        toolCounts[toolName] = (toolCounts[toolName] || 0) + (row.count || 0);
      }
      totalUniqueSessions += row.unique_sessions || 0;

      const country = row.country ?? "unknown";
      if (country !== "unknown") {
        countryCounts[country] = (countryCounts[country] || 0) + (row.count || 0);
      }
    }

    const topTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json(
      {
        total_page_views: totalPageViews,
        total_tool_uses: totalToolUses,
        unique_sessions: totalUniqueSessions,
        top_tools: topTools,
        top_countries: topCountries,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (err) {
    console.error("[analytics/public] Error:", err);
    return NextResponse.json(
      { error: "Analytics unavailable" },
      { status: 503 }
    );
  }
}
