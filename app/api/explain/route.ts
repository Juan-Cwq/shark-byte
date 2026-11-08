import { NextResponse } from "next/server";
import { z } from "zod";
import { buildExplainPayload } from "@/lib/agents";
import { callAgent, extractFinalText } from "@/lib/swarms";
import { ExplainRequest } from "@/lib/types";

const Explanation = z
  .string()
  .transform((s) => s.replace(/[*#`]/g, "").replace(/\s+/g, " ").trim())
  .pipe(z.string().min(20).max(700));

async function runExplain(req: ExplainRequest): Promise<string> {
  return Explanation.parse(extractFinalText(await callAgent(buildExplainPayload(req))));
}

// On any failure the client shows the rule-based reasons as-is, so errors stay non-fatal.
export async function POST(request: Request) {
  const parsed = ExplainRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (process.env.DEMO_MODE === "true") return NextResponse.json({ explanation: null });

  for (const attempt of [1, 2]) {
    try {
      return NextResponse.json({ explanation: await runExplain(parsed.data) });
    } catch (err) {
      console.error(`explain attempt ${attempt}:`, err);
    }
  }
  return NextResponse.json({ explanation: null }, { status: 502 });
}
