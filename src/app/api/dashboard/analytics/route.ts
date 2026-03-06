import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const VALID_DAYS = new Set([7, 30, 90]);

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "No database" }, { status: 503 });
  }

  try {
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (!VALID_DAYS.has(days)) {
      return NextResponse.json(
        { error: "days must be 7, 30, or 90" },
        { status: 400 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const since = startDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("sl_analytics_daily")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
