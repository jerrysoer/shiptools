import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { hashIp } from "@/lib/hash";

const VALID_EVENTS = new Set([
  "page_view",
  "tool_opened",
  "tool_used",
  "scan_initiated",
  "scan_completed",
  "report_shared",
  "telemetry_opted_out",
]);

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true }); // Silently accept if no Supabase
  }

  try {
    const body = await req.json();
    const eventName = body.event ?? "unknown";

    // Silently reject unknown events
    if (!VALID_EVENTS.has(eventName)) {
      return NextResponse.json({ ok: true });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const country = req.headers.get("x-vercel-ip-country") ?? "unknown";

    await supabase.from("st_analytics_events").insert({
      event: eventName,
      properties: body.properties ?? null,
      session_ip: hashIp(clientIp),
      session_id: body.session_id ?? null,
      country,
    });
  } catch {
    // Fire-and-forget — never fail
  }

  return NextResponse.json({ ok: true });
}
