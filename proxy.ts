import { NextRequest, NextResponse } from "next/server";
import { getAuth0Client } from "@/lib/auth0";

export async function proxy(request: Request) {
  const requestUrl = new URL(request.url);
  const { pathname } = requestUrl;
  const auth0 = getAuth0Client();

  if (!auth0) {
    if (pathname === "/login") return NextResponse.next();
    if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
      return Response.json({ error: "Auth0 is not configured" }, { status: 503 });
    }

    const loginUrl = new URL("/login", requestUrl);
    loginUrl.searchParams.set("returnTo", `${pathname}${requestUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const authResponse = await auth0.middleware(request);

  // Auth0's built-in endpoints and the branded login page must remain public.
  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    return authResponse;
  }

  if (await auth0.getSession(new NextRequest(request))) {
    return authResponse;
  }

  // API callers need a JSON status, not a redirect to an HTML page.
  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("returnTo", `${pathname}${requestUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"],
};
