import { NextResponse } from "next/server";
import { unauthorizedUnlessAuthenticated } from "@/lib/auth-guard";
import { buildProfileUpdatePayload } from "@/lib/agents";
import { callAgent, extractFinalText, parseJsonLoose } from "@/lib/swarms";
import { LearnerProfileFields, ProfileUpdateRequest, type ChatMessage } from "@/lib/types";

const LIMITS = { goals: 5, strengths: 8, struggles: 8, topicsCovered: 15 } as const;

// Models sometimes overshoot list lengths; trim before validating instead of rejecting a good update.
function clamp(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const o = { ...(json as Record<string, unknown>) };
  if (typeof o.learningStyle === "string") o.learningStyle = o.learningStyle.slice(0, 240);
  for (const [key, max] of Object.entries(LIMITS)) {
    const list = o[key];
    if (Array.isArray(list)) {
      o[key] = list
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 160))
        .slice(0, max);
    }
  }
  return o;
}

function demoUpdate(profile: LearnerProfileFields | undefined, history: ChatMessage[]): LearnerProfileFields {
  const base = LearnerProfileFields.parse(profile ?? {});
  const asked = history
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim().split(/\s+/).slice(0, 10).join(" ").slice(0, 160));
  const topicsCovered = [...new Set([...asked.reverse(), ...base.topicsCovered])].slice(0, LIMITS.topicsCovered);
  return { ...base, topicsCovered };
}

async function runUpdate(req: ProfileUpdateRequest): Promise<LearnerProfileFields> {
  const raw = await callAgent(buildProfileUpdatePayload(req.careerId, req.profile, req.history));
  return LearnerProfileFields.parse(clamp(parseJsonLoose(extractFinalText(raw))));
}

export async function POST(request: Request) {
  const unauthorized = await unauthorizedUnlessAuthenticated();
  if (unauthorized) return unauthorized;

  const parsed = ProfileUpdateRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json({ profile: demoUpdate(body.profile, body.history), updated: true });
  }

  for (const attempt of [1, 2]) {
    try {
      return NextResponse.json({ profile: await runUpdate(body), updated: true });
    } catch (err) {
      console.error(`profile update attempt ${attempt}:`, err);
    }
  }
  // Keep the old memory rather than failing the chat.
  return NextResponse.json({ profile: LearnerProfileFields.parse(body.profile ?? {}), updated: false });
}
