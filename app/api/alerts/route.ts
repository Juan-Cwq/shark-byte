import { connection, NextResponse } from "next/server";
import { unauthorizedUnlessAuthenticated } from "@/lib/auth-guard";
import { fetchFloridaAlerts } from "@/lib/weather";

export async function GET() {
  const unauthorized = await unauthorizedUnlessAuthenticated();
  if (unauthorized) return unauthorized;

  await connection();
  try {
    return NextResponse.json(await fetchFloridaAlerts());
  } catch (err) {
    console.error("alerts:", err);
    return NextResponse.json({ error: "Official alerts are unavailable right now." }, { status: 502 });
  }
}
