import { NextRequest, NextResponse } from "next/server";

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
    const [user, pass] = decoded.split(":");

    if (user === authUser && pass === authPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ShipTools Admin"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
