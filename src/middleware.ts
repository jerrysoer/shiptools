import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

function safeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function middleware(req: NextRequest) {
  const authUser = process.env.AUTH_USER;
  const authPassword = process.env.AUTH_PASSWORD;

  if (!authUser || !authPassword) {
    return NextResponse.json(
      { error: "Admin auth not configured" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const colonIdx = decoded.indexOf(":");
    const user = decoded.slice(0, colonIdx);
    const pass = decoded.slice(colonIdx + 1);

    if (safeCompare(user, authUser) && safeCompare(pass, authPassword)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ShipLocal Admin"',
    },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*"],
};
