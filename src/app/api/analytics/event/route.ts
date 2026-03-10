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
  "ai_model_loaded",
  "ai_tool_used",
  "ai_model_deleted",
  "ai_feature_unavailable",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PROPERTIES_SIZE = 1024;
const MAX_PROPERTY_KEYS = 10;
const MAX_PROPERTY_VALUE_LEN = 200;

/** Validate and sanitize the properties object to prevent abuse. */
function sanitizeProperties(
  raw: unknown
): Record<string, string | number | boolean> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length > MAX_PROPERTY_KEYS) return null;
  if (JSON.stringify(obj).length > MAX_PROPERTIES_SIZE) return null;

  const clean: Record<string, string | number | boolean> = {};
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string") {
      clean[key] = val.slice(0, MAX_PROPERTY_VALUE_LEN);
    } else if (typeof val === "number" || typeof val === "boolean") {
      clean[key] = val;
    }
    // Skip any non-primitive values
  }
  return clean;
}

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

    // Validate session_id format
    const sessionId =
      typeof body.session_id === "string" && UUID_RE.test(body.session_id)
        ? body.session_id
        : null;

    // Validate referrer_domain (max 253 chars per DNS spec)
    const referrerDomain =
      typeof body.referrer_domain === "string"
        ? body.referrer_domain.slice(0, 253)
        : "direct";

    // Validate device_type
    const validDevices = new Set(["mobile", "tablet", "desktop", "unknown"]);
    const deviceType = validDevices.has(body.device_type)
      ? body.device_type
      : "unknown";

    await supabase.from("ul_analytics_events").insert({
      event: eventName,
      properties: sanitizeProperties(body.properties),
      session_ip: hashIp(clientIp),
      session_id: sessionId,
      country,
      referrer_domain: referrerDomain,
      device_type: deviceType,
    });
  } catch {
    // Fire-and-forget — never fail
  }

  return NextResponse.json({ ok: true });
}
