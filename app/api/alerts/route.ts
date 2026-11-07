import { connection, NextResponse } from "next/server";
import { fetchFloridaAlerts } from "@/lib/weather";

export async function GET() {
  await connection();
  try {
    return NextResponse.json(await fetchFloridaAlerts());
  } catch (err) {
    console.error("alerts:", err);
    return NextResponse.json({ error: "Official alerts are unavailable right now." }, { status: 502 });
  }
}
