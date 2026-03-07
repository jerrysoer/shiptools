import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";

const GRADE_COLORS: Record<string, string> = {
  A: "#22C55E",
  B: "#84CC16",
  C: "#F59E0B",
  D: "#F97316",
  F: "#EF4444",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain: slug } = await params;

  // Lookup audit from Supabase
  const supabase = getSupabase();
  let grade = "?";
  let displayDomain = slug.replace(/-/g, ".");
  let cookieCount = 0;
  let domainCount = 0;
  let trackerCount = 0;

  if (supabase) {
    const { data } = await supabase
      .from("ul_audits")
      .select("grade, domain, scan")
      .eq("id", slug)
      .single();

    if (data) {
      grade = data.grade;
      displayDomain = data.domain;
      cookieCount = data.scan?.cookies?.thirdParty ?? 0;
      domainCount = data.scan?.thirdPartyDomains?.total ?? 0;
      trackerCount =
        (data.scan?.trackers?.advertising?.length ?? 0) +
        (data.scan?.trackers?.sessionRecording?.length ?? 0) +
        (data.scan?.trackers?.analytics?.length ?? 0);
    }
  }

  const gradeColor = GRADE_COLORS[grade] ?? "#5C5652";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#151311",
          fontFamily: "sans-serif",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 24,
            color: "#5C5652",
            marginBottom: 16,
            letterSpacing: 4,
          }}
        >
          PRIVACY AUDIT
        </div>

        {/* Domain */}
        <div
          style={{
            fontSize: 36,
            color: "#E5E0DB",
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          {displayDomain}
        </div>

        {/* Grade */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 800,
            color: gradeColor,
            lineHeight: 1,
            filter: `drop-shadow(0 0 40px ${gradeColor})`,
          }}
        >
          {grade}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#E5E0DB" }}>
              {cookieCount}
            </div>
            <div style={{ fontSize: 14, color: "#5C5652" }}>3rd-party cookies</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#E5E0DB" }}>
              {domainCount}
            </div>
            <div style={{ fontSize: 14, color: "#5C5652" }}>3rd-party domains</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#E5E0DB" }}>
              {trackerCount}
            </div>
            <div style={{ fontSize: 14, color: "#5C5652" }}>trackers found</div>
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 16,
            color: "#D4704A",
          }}
        >
          uploadless.dev
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
