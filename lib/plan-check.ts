// lib/plan-check.ts
// Server-side: checks an AI plan against the catalog. Term credits come from the data, never the AI,
// and catalog courses or slots the AI left out are listed so a short term can't pass as complete.

import "server-only";
import { extractCourseCodes, getCareer, normalizeCode } from "./pathways";
import { getProgressPlan } from "./progress-plan";
import type { CareerId, CreditRange, PersonalizedPlan, PlanCheck } from "./types";

// "Total Credits: 13", "(14 credits)", "about 6-9 credits": the AI may not state credit numbers.
const CREDIT_CLAIM = /\bcredits?\s*[:=]\s*\d|\d+(?:\s*[-–]\s*\d+)?\s*(?:credits?|cr)\b/i;

/** Drops every sentence of the note that states a credit number. */
export function stripCreditClaims(text: string): string {
  return (text.match(/[^.!?\n]+[.!?]?/g) ?? [])
    .filter((s) => !CREDIT_CLAIM.test(s))
    .join("")
    .trim();
}

const slotKey = (label: string) => label.trim().toLowerCase();

export function checkPlan(careerId: CareerId, plan: PersonalizedPlan, completedCodes: string[]): PlanCheck {
  const pp = getProgressPlan(careerId);
  const entries = pp.terms.flatMap((t) => t.entries);

  const slotCredits = new Map<string, CreditRange | null>();
  for (const e of entries) {
    if (e.area || !e.codes.length) slotCredits.set(slotKey(e.label), e.credits);
  }
  const creditsOf = (codes: string[]): CreditRange | null => {
    const hits = codes.map((c) => pp.knownCredits[c]);
    if (!hits.length || hits.some((h) => !h)) return null;
    return { low: Math.min(...hits.map((h) => h!.low)), high: Math.max(...hits.map((h) => h!.high)) };
  };
  const slotCreditsOf = (label: string): CreditRange | null => {
    const known = slotCredits.get(slotKey(label));
    if (known) return known;
    const n = label.match(/\((\d+)\)\s*$/);
    return n && /^(electives?|gen-ed)\b/i.test(label) ? { low: Number(n[1]), high: Number(n[1]) } : null;
  };

  const terms = plan.adjustedTerms.map((t) => {
    const credits: CreditRange = { low: 0, high: 0 };
    const unpriced: string[] = [];
    const add = (label: string, r: CreditRange | null) => {
      if (!r) return unpriced.push(label);
      credits.low += r.low;
      credits.high += r.high;
    };
    t.courseCodes.forEach((c) => {
      const codes = extractCourseCodes(c).map(normalizeCode);
      add(c, creditsOf(codes.length ? codes : [normalizeCode(c)]));
    });
    t.otherRequirements.forEach((r) => add(r, slotCreditsOf(r)));
    return { credits, unpriced };
  });

  const primary = getCareer(careerId).educational_pathway.primary_program;
  let missing: string[] = [];
  if (plan.pathwayChoice.code === primary.code) {
    const done = new Set(completedCodes.map(normalizeCode));
    const planned = new Set(plan.adjustedTerms.flatMap((t) => t.courseCodes.flatMap((c) => extractCourseCodes(c).map(normalizeCode))));
    const slotsLeft = new Map<string, number>();
    plan.adjustedTerms.forEach((t) => t.otherRequirements.forEach((r) => slotsLeft.set(slotKey(r), (slotsLeft.get(slotKey(r)) ?? 0) + 1)));
    missing = entries
      .filter((e) => {
        if (e.codes.length && !e.area) return !e.codes.some((c) => planned.has(c) || done.has(c));
        const n = slotsLeft.get(slotKey(e.label)) ?? 0;
        if (n > 0) {
          slotsLeft.set(slotKey(e.label), n - 1);
          return false;
        }
        return !e.codes.some((c) => done.has(c));
      })
      .map((e) => e.label);
  }

  return { terms, missing, programLabel: plan.pathwayChoice.code === primary.code ? pp.programLabel : null };
}
