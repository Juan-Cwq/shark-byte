import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { unauthorizedUnlessAuthenticated } from "@/lib/auth-guard";
import { buildPersonalizePayload } from "@/lib/agents";
import { sanitizePlan } from "@/lib/pathways";
import { checkPlan, stripCreditClaims } from "@/lib/plan-check";
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

/** Credit numbers come from the catalog, so any the AI wrote are removed before the plan is checked. */
function respond(req: PersonalizeRequest, plan: PersonalizedPlan, unknownCodesRemoved: string[], fromCache: boolean) {
  const clean: PersonalizedPlan = {
    ...plan,
    adjustedTerms: plan.adjustedTerms.map((t) => ({ ...t, note: stripCreditClaims(t.note) })),
  };
  const response: PersonalizeResponse = {
    plan: clean,
    unknownCodesRemoved,
    fromCache,
    check: checkPlan(req.careerId, clean, req.completedCourseCodes),
  };
  return NextResponse.json(response);
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
      return respond(body, cached, [], true);
    }

    try {
      const { plan, unknownCodesRemoved } = await runPersonalize(body);
      return respond(body, plan, unknownCodesRemoved, false);
    } catch (firstErr) {
      console.error("personalize attempt 1:", firstErr);
      try {
        const { plan, unknownCodesRemoved } = await runPersonalize(body);
        return respond(body, plan, unknownCodesRemoved, false);
      } catch (secondErr) {
        console.error("personalize attempt 2:", secondErr);
        const cached = await loadCache(body.careerId);
        if (cached) return respond(body, cached, [], true);
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
