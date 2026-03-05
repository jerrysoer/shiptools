import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics — ShipTools Admin",
};

interface DailyRow {
  date: string;
  event: string;
  count: number;
  unique_sessions: number;
  country: string;
  properties_summary: Record<string, unknown> | null;
}

export default async function AdminAnalyticsPage() {
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">
          Database not configured. Add SUPABASE_URL and
          SUPABASE_SERVICE_ROLE_KEY to enable analytics.
        </p>
      </div>
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("st_analytics_daily")
    .select("*")
    .gte("date", since)
    .order("date", { ascending: true });

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-grade-f">Failed to load analytics: {error.message}</p>
      </div>
    );
  }

  return <AnalyticsDashboard data={(data as DailyRow[]) ?? []} />;
}
