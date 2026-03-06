import { NextRequest, NextResponse } from "next/server";
import { validateNotSSRF } from "@/lib/validation";

interface OgResult {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
}

function extractMetaContent(html: string, property: string): string {
  // Match <meta property="og:..." content="..." /> (either order)
  const regex = new RegExp(
    `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const altRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
    "i"
  );
  return regex.exec(html)?.[1] || altRegex.exec(html)?.[1] || "";
}

function extractNameContent(html: string, name: string): string {
  const regex = new RegExp(
    `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const altRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`,
    "i"
  );
  return regex.exec(html)?.[1] || altRegex.exec(html)?.[1] || "";
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Normalize URL
  let targetUrl: string;
  try {
    const parsed = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    );
    parsed.protocol = "https:";
    targetUrl = parsed.toString();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // SSRF check
  const safe = await validateNotSSRF(targetUrl);
  if (!safe) {
    return NextResponse.json(
      { error: "URL resolves to a private or unreachable address" },
      { status: 403 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Follow redirects manually to validate each target against SSRF
    let fetchUrl = targetUrl;
    let res: Response | undefined;
    const MAX_REDIRECTS = 3;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ShipLocal-OGBot/1.0",
          Accept: "text/html",
        },
        redirect: "manual",
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          clearTimeout(timeout);
          return NextResponse.json({ error: "Redirect with no location" }, { status: 502 });
        }
        const redirectUrl = new URL(location, fetchUrl).toString();
        const redirectSafe = await validateNotSSRF(redirectUrl);
        if (!redirectSafe) {
          clearTimeout(timeout);
          return NextResponse.json(
            { error: "URL resolves to a private or unreachable address" },
            { status: 403 }
          );
        }
        fetchUrl = redirectUrl;
        continue;
      }
      break;
    }

    if (!res || [301, 302, 303, 307, 308].includes(res.status)) {
      clearTimeout(timeout);
      return NextResponse.json({ error: "Too many redirects" }, { status: 502 });
    }

    if (!res.ok) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }

    // Only read first 100KB to avoid memory abuse
    const reader = res.body?.getReader();
    if (!reader) {
      clearTimeout(timeout);
      return NextResponse.json({ error: "No response body" }, { status: 502 });
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const MAX_BYTES = 100_000;

    while (totalBytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel();
    clearTimeout(timeout);

    // Efficient chunk concatenation
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const html = new TextDecoder().decode(combined);

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    const { hostname } = new URL(fetchUrl);

    const result: OgResult = {
      title: extractMetaContent(html, "og:title") || titleTag,
      description:
        extractMetaContent(html, "og:description") ||
        extractNameContent(html, "description"),
      image: extractMetaContent(html, "og:image"),
      url: extractMetaContent(html, "og:url") || fetchUrl,
      siteName: extractMetaContent(html, "og:site_name") || hostname,
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
  }
}
