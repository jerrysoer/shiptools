import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabase } from "@/lib/supabase";
import { parseScanRequest, validateNotSSRF } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/hash";
import { scanUrl } from "@/lib/scanner";
import { gradeFromScan } from "@/lib/grading";
import { SCAN_RATE_LIMIT, SCAN_RATE_WINDOW_MS, AUDIT_CACHE_TTL_HOURS } from "@/lib/constants";
import type { AuditResult, ScanError, ScanResponse } from "@/lib/types";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function domainToSlug(domain: string): string {
  return domain.replace(/\./g, "-").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await req.json();
    const parsed = parseScanRequest(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message, code: "INVALID_URL" } satisfies ScanError,
        { status: 400 }
      );
    }

    const { url, force } = parsed.data;

    // 2. Rate limiting
    const clientIp = getClientIp(req);
    const rl = rateLimit(clientIp, SCAN_RATE_LIMIT, SCAN_RATE_WINDOW_MS);
    if (rl.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limited. Try again in ${rl.retryAfter}s.`,
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        } satisfies ScanError,
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    // 3. SSRF prevention
    const safe = await validateNotSSRF(url);
    if (!safe) {
      return NextResponse.json(
        { success: false, error: "URL resolves to a private address", code: "SSRF_BLOCKED" } satisfies ScanError,
        { status: 400 }
      );
    }

    // 4. Check Supabase cache
    const domain = new URL(url).hostname;
    const slug = domainToSlug(domain);
    const supabase = getSupabase();

    if (supabase && !force) {
      const { data: cached } = await supabase
        .from("ul_audits")
        .select("*")
        .eq("domain", domain)
        .gt("expires_at", new Date().toISOString())
        .order("cached_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        const result: AuditResult = {
          id: cached.id,
          domain: cached.domain,
          displayUrl: cached.display_url,
          grade: cached.grade,
          scores: cached.scores,
          scan: cached.scan,
          cachedAt: cached.cached_at,
          expiresAt: cached.expires_at,
        };
        return NextResponse.json({ success: true, result } satisfies ScanResponse);
      }
    }

    // 4b. Log scan_initiated
    if (supabase) {
      supabase.from("ul_analytics_events").insert({
        event: "scan_initiated",
        properties: { domain },
      }).then(() => {});
    }

    // 5. Run scan (with 45s timeout — 15s buffer before Vercel's 60s hard limit)
    const SCAN_TIMEOUT_MS = 45_000;
    const scanData = await Promise.race([
      scanUrl(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout: scan exceeded 45s limit")), SCAN_TIMEOUT_MS)
      ),
    ]);
    const { grade, scores } = gradeFromScan(scanData);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUDIT_CACHE_TTL_HOURS * 60 * 60 * 1000);

    const result: AuditResult = {
      id: slug,
      domain,
      displayUrl: domain,
      grade,
      scores,
      scan: scanData,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // 6. Cache in Supabase
    if (supabase) {
      await supabase.from("ul_audits").upsert({
        id: slug,
        domain,
        display_url: domain,
        grade,
        scores,
        scan: scanData,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Log the request
      await supabase.from("ul_audit_requests").insert({
        domain,
        requested_by_ip: hashIp(clientIp),
      });

      // Log scan_completed
      supabase.from("ul_analytics_events").insert({
        event: "scan_completed",
        properties: { domain, grade },
      }).then(() => {});
    }

    return NextResponse.json({ success: true, result } satisfies ScanResponse);
  } catch (err) {
    console.error("[scan] Error:", err);

    const errMsg = err instanceof Error ? err.message : String(err);

    let message: string;
    let code: "TIMEOUT" | "SCAN_FAILED";

    if (errMsg.includes("timeout")) {
      message = "Site took too long to load. Try again later.";
      code = "TIMEOUT";
    } else if (errMsg.includes("No browser found") || errMsg.includes("executablePath")) {
      message = "Browser launch failed. This scan requires a server environment.";
      code = "SCAN_FAILED";
    } else if (errMsg.includes("net::") || errMsg.includes("Navigation")) {
      message = "Could not reach the site. Check the URL and try again.";
      code = "SCAN_FAILED";
    } else {
      message = "Scan failed. The site may be blocking automated access.";
      code = "SCAN_FAILED";
    }

    return NextResponse.json(
      { success: false, error: message, code } satisfies ScanError,
      { status: 500 }
    );
  }
}
