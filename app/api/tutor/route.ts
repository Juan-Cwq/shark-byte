import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { unauthorizedUnlessAuthenticated } from "@/lib/auth-guard";
import { buildTutorPayload } from "@/lib/agents";
import { callAgent, extractFinalText, SwarmsError } from "@/lib/swarms";
import { TutorRequest } from "@/lib/types";

export async function POST(request: Request) {
  const unauthorized = await unauthorizedUnlessAuthenticated();
  if (unauthorized) return unauthorized;

  try {
    const body = TutorRequest.parse(await request.json());

    if (process.env.DEMO_MODE === "true") {
      try {
        const file = path.join(process.cwd(), "data", "cache", "tutor-demo.json");
        const raw = JSON.parse(await readFile(file, "utf8")) as { reply?: string };
        return NextResponse.json({
          reply:
            raw.reply ??
            "Demo mode: the study buddy is offline. Ask about prerequisites, study habits, or a concept from your courses when live mode is on.",
        });
      } catch {
        return NextResponse.json({
          reply:
            "Demo mode: here's a tip — break the topic into smaller pieces, explain it out loud, then try a similar practice problem. What part feels murky?",
        });
      }
    }

    const raw = await callAgent(
      buildTutorPayload(
        body.careerId,
        body.currentCourseCodes,
        body.history,
        body.question,
        body.profile,
        body.questionsAsked
      )
    );
    const reply = extractFinalText(raw);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("tutor:", err);
    const message =
      err instanceof SwarmsError
        ? "The tutor is offline. Try again in a minute."
        : "The tutor is offline. Try again in a minute.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
