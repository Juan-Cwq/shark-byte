import { NextResponse } from "next/server";
import { getAuth0Client } from "@/lib/auth0";

// Pages stay public. The proxy only serves Auth0's /auth/* routes and keeps sessions rolling;
// the AI API routes check the session themselves (lib/auth-guard.ts).
export async function proxy(request: Request) {
  const auth0 = getAuth0Client();
  if (!auth0) {
    if (new URL(request.url).pathname.startsWith("/auth/")) {
      return Response.json({ error: "Auth0 is not configured" }, { status: 503 });
    }
    return NextResponse.next();
  }
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|.*\\..*).*)"],
};
