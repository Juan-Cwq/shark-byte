import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { unauthorizedUnlessAuthenticated } from "@/lib/auth-guard";
import { buildPersonalizePayload } from "@/lib/agents";
import { sanitizePlan } from "@/lib/pathways";
import { callSwarm, extractFinalText, parseJsonLoose, SwarmsError } from "@/lib/swarms";
import {
  PersonalizedPlan,
  PersonalizeRequest,
  type CareerId,
  type PersonalizeResponse,
} from "@/lib/types";

async function loadCache(careerId: CareerId): Promise<PersonalizedPlan | null> {
  try {
    const file = path.join(process.cwd(), "data", "cache", `${careerId}.json`);
    const raw = await readFile(file, "utf8");
    const parsed = PersonalizedPlan.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function runPersonalize(req: PersonalizeRequest) {
  const raw = await callSwarm(buildPersonalizePayload(req));
  const text = extractFinalText(raw);
  const json = parseJsonLoose(text);
  const plan = PersonalizedPlan.parse(json);
  return sanitizePlan(req.careerId, plan);
}

export async function POST(request: Request) {
  const unauthorized = await unauthorizedUnlessAuthenticated();
  if (unauthorized) return unauthorized;

  try {
    const body = PersonalizeRequest.parse(await request.json());

    if (process.env.DEMO_MODE === "true") {
      const cached = await loadCache(body.careerId);
      if (!cached) {
        return NextResponse.json(
          { error: "Demo cache missing for this career. Run a live personalize once and save it." },
          { status: 503 }
        );
      }
      const response: PersonalizeResponse = {
        plan: cached,
        unknownCodesRemoved: [],
        fromCache: true,
      };
      return NextResponse.json(response);
    }

    try {
      const { plan, unknownCodesRemoved } = await runPersonalize(body);
      const response: PersonalizeResponse = { plan, unknownCodesRemoved, fromCache: false };
      return NextResponse.json(response);
    } catch (firstErr) {
      console.error("personalize attempt 1:", firstErr);
      try {
        const { plan, unknownCodesRemoved } = await runPersonalize(body);
        const response: PersonalizeResponse = { plan, unknownCodesRemoved, fromCache: false };
        return NextResponse.json(response);
      } catch (secondErr) {
        console.error("personalize attempt 2:", secondErr);
        const cached = await loadCache(body.careerId);
        if (cached) {
          const response: PersonalizeResponse = {
            plan: cached,
            unknownCodesRemoved: [],
            fromCache: true,
          };
          return NextResponse.json(response);
        }
        throw secondErr;
      }
    }
  } catch (err) {
    console.error("personalize:", err);
    const message =
      err instanceof SwarmsError
        ? "Personalization is temporarily unavailable. Try again in a minute."
        : "Could not personalize this path. Check your inputs and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
