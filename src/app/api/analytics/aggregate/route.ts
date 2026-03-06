import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "No database" }, { status: 503 });
  }

  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    // Query yesterday's events grouped by event + country + referrer + device
    const { data: events, error: queryError } = await supabase
      .from("sl_analytics_events")
      .select("event, country, session_id, referrer_domain, device_type")
      .gte("created_at", `${dateStr}T00:00:00.000Z`)
      .lt("created_at", `${dateStr}T23:59:59.999Z`);

    if (queryError) {
      console.error("[aggregate] Query error:", queryError.message);
      return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ ok: true, aggregated: 0 });
    }

    // Group by event + country + referrer_domain + device_type
    const groups = new Map<string, { count: number; sessions: Set<string> }>();

    for (const row of events) {
      const referrer = row.referrer_domain ?? "direct";
      const device = row.device_type ?? "unknown";
      const key = `${row.event}|${row.country ?? "unknown"}|${referrer}|${device}`;
      if (!groups.has(key)) {
        groups.set(key, { count: 0, sessions: new Set() });
      }
      const group = groups.get(key)!;
      group.count++;
      if (row.session_id) {
        group.sessions.add(row.session_id);
      }
    }

    // Upsert into daily table
    const rows = Array.from(groups.entries()).map(([key, { count, sessions }]) => {
      const [event, country, referrer_domain, device_type] = key.split("|");
      return {
        date: dateStr,
        event,
        country,
        referrer_domain,
        device_type,
        count,
        unique_sessions: sessions.size,
      };
    });

    const { error: upsertError } = await supabase
      .from("sl_analytics_daily")
      .upsert(rows, { onConflict: "date,event,country,referrer_domain,device_type" });

    if (upsertError) {
      console.error("[aggregate] Upsert error:", upsertError.message);
      return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
    }

    // Clean up raw events older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
      .from("sl_analytics_events")
      .delete()
      .lt("created_at", thirtyDaysAgo.toISOString());

    return NextResponse.json({ ok: true, aggregated: rows.length });
  } catch (err) {
    console.error("[aggregate] Error:", err);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}
