// lib/progress-plan.ts
// Server-side: turns a career's catalog data into a ProgressPlan for the progress tracker.
// Every number comes from mdc_pathways.json; missing values stay null instead of being guessed.

import "server-only";
import { extractCourseCodes, getCareer, getCourseObjects, getSharedRules, lookupCourse, normalizeCode } from "./pathways";
import { CAREER_IDS, type CareerId, type CreditRange, type FiuPlan, type ProgressPlan } from "./types";

function toRange(credits: number | string): CreditRange | null {
  if (typeof credits === "number") return { low: credits, high: credits };
  const m = credits.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return { low: Number(m[1]), high: Number(m[2]) };
  const n = Number(credits);
  return Number.isFinite(n) ? { low: n, high: n } : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function getProgressPlan(id: CareerId): ProgressPlan {
  const career = getCareer(id);
  const ep = career.educational_pathway;
  const program = ep.primary_program;
  const rules = getSharedRules();

  const creditsByCode = new Map<string, CreditRange>();
  for (const course of getCourseObjects(career)) {
    const range = toRange(course.credits);
    if (!range) continue;
    for (const code of extractCourseCodes(course.code)) creditsByCode.set(normalizeCode(code), range);
  }

  const terms = program.sequence_full_time.map((t) => ({
    term: t.term,
    entries: t.courses.map((label) => {
      const codes = extractCourseCodes(label).map(normalizeCode);
      // Alternatives ("CTS 1134 or CTS 1650") span the credits of the options the data knows about.
      const known = codes.map((c) => creditsByCode.get(c)).filter((r): r is CreditRange => r != null);
      const credits =
        codes.length && known.length === codes.length
          ? { low: Math.min(...known.map((r) => r.low)), high: Math.max(...known.map((r) => r.high)) }
          : null;
      return {
        label,
        codes,
        title: codes.length === 1 ? (lookupCourse(id, label)?.title ?? null) : null,
        credits,
      };
    }),
  }));

  let fiu: FiuPlan | null = null;
  if (ep.fiu_transfer) {
    const exceptions = (rules.transfer_rules.fiu_exceptions ?? {}) as Record<string, unknown>;
    const degree = ep.fiu_transfer.degree;
    const exceptionKey = Object.keys(exceptions).find((k) => degree.toLowerCase().includes(k.toLowerCase()));
    fiu = {
      degree,
      catalogYear: ep.fiu_transfer.catalog_year ?? null,
      minGpa: ep.fiu_transfer.min_gpa ?? null,
      admission: ep.fiu_transfer.admission,
      prerequisites: ep.fiu_transfer.prerequisites.map((p) => ({
        parts: p.mdc.map((label) => ({ label, codes: extractCourseCodes(label).map(normalizeCode) })),
        fiu: p.fiu.join(", "),
        note: p.note ?? null,
      })),
      exception: exceptionKey ? asString(exceptions[exceptionKey]) : null,
      asNote: program.degree === "AS" ? asString(rules.transfer_rules.as_to_bachelors) : null,
      advising: asString(rules.transfer_rules.fiu_advising),
    };
  }

  return {
    careerId: id,
    careerTitle: career.title,
    programLabel: `${program.degree} · ${program.name} (${program.code}) · ${program.credits} credits`,
    programCredits: program.credits,
    ratePerCredit: Number(rules.cost_basis.mdc_lower_division_per_credit),
    rateYear: asString(rules.cost_basis.mdc_rates_year) ?? "",
    terms,
    fiu,
  };
}

export function getAllProgressPlans(): ProgressPlan[] {
  return CAREER_IDS.map(getProgressPlan);
}
