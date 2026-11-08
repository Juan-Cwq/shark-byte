import "server-only";
import { getAuth0Client } from "@/lib/auth0";

export async function unauthorizedUnlessAuthenticated(): Promise<Response | null> {
  const auth0 = getAuth0Client();
  if (!auth0) return Response.json({ error: "Auth0 is not configured" }, { status: 503 });

  const session = await auth0.getSession();
  return session ? null : Response.json({ error: "Unauthorized" }, { status: 401 });
}
