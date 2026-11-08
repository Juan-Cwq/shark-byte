// lib/progress-plan.ts
// Server-side: turns a career's catalog data into a ProgressPlan for the progress tracker.
// Every number comes from mdc_pathways.json; missing values stay null instead of being guessed.

import "server-only";
import {
  extractCourseCodes,
  getCareer,
  getCourseCredits,
  getCourseObjects,
  getProgram,
  getPrograms,
  getSharedRules,
  lookupCourse,
  normalizeCode,
} from "./pathways";
import {
  CAREER_IDS,
  type Career,
  type CareerId,
  type CreditRange,
  type Division,
  type FiuPlan,
  type ProgramSwitch,
  type ProgressPlan,
  type SwitchEntry,
  type SwitchPlan,
} from "./types";

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

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Florida course numbering: 1000/2000-level courses are lower division, 3000/4000-level upper.
function divisionFromCode(code: string): Division | null {
  const digit = normalizeCode(code).charAt(3);
  if (digit === "1" || digit === "2") return "lower";
  if (digit === "3" || digit === "4") return "upper";
  return null;
}

/** Alternatives ("CTS 1134 or CTS 1650") span the credits of their options; null if any option is unknown. */
function spanCredits(codes: string[], credits: Map<string, CreditRange>): CreditRange | null {
  const known = codes.map((c) => credits.get(c)).filter((r): r is CreditRange => r != null);
  if (!codes.length || known.length !== codes.length) return null;
  return { low: Math.min(...known.map((r) => r.low)), high: Math.max(...known.map((r) => r.high)) };
}

function careerCredits(career: Career): Map<string, CreditRange> {
  const map = new Map<string, CreditRange>();
  for (const course of getCourseObjects(career)) {
    const range = toRange(course.credits);
    if (!range) continue;
    for (const code of extractCourseCodes(course.code)) map.set(normalizeCode(code), range);
  }
  return map;
}

let knownCreditsCache: Map<string, CreditRange> | null = null;
/** Every credit value in the data: shared course credits, program courses, then each career's courses. */
function knownCredits(): Map<string, CreditRange> {
  if (knownCreditsCache) return knownCreditsCache;
  const map = new Map<string, CreditRange>();
  for (const [code, c] of Object.entries(getCourseCredits()?.courses ?? {})) {
    map.set(normalizeCode(code), { low: c.credits, high: c.credits });
  }
  for (const program of getPrograms()) {
    for (const c of [...program.courses, ...program.electives.options]) {
      const range = toRange(c.credits);
      if (range) map.set(normalizeCode(c.code), range);
    }
  }
  for (const id of CAREER_IDS) {
    for (const [code, range] of careerCredits(getCareer(id))) if (!map.has(code)) map.set(code, range);
  }
  knownCreditsCache = map;
  return map;
}

function sharedTitle(normalizedCode: string): string | null {
  const hit = Object.entries(getCourseCredits()?.courses ?? {}).find(([code]) => normalizeCode(code) === normalizedCode);
  return hit?.[1].title ?? null;
}

function programLabel(degree: string, name: string, code: string) {
  return `${degree === "AS" ? "A.S." : degree === "BS" ? "B.S." : degree} ${name} (${code})`;
}

function getSwitchPlan(career: Career, sw: ProgramSwitch): SwitchPlan | null {
  const target = getProgram(sw.to);
  if (!target) return null;
  const ep = career.educational_pathway;
  const from = [ep.primary_program, ep.mdc_bachelor].find((p) => p?.code === sw.from);
  const rules = getSharedRules();
  const credits = knownCredits();

  const courseByCode = new Map(target.courses.map((c) => [normalizeCode(c.code), c]));
  const genEdByLabel = new Map(target.gen_ed.map((g) => [g.label.toLowerCase(), g]));
  const isAssociate = target.degree === "AS";

  const terms = target.sequence.map((t) => ({
    term: t.term,
    entries: t.courses.map((label): SwitchEntry => {
      if (label === "Elective") {
        const c = target.electives.slot_credits;
        return { label, codes: [], title: null, credits: { low: c, high: c }, division: isAssociate ? "lower" : null, kind: "elective", prerequisites: [] };
      }
      const genEd = genEdByLabel.get(label.toLowerCase());
      if (genEd) {
        return {
          label,
          codes: genEd.options.map(normalizeCode),
          title: null,
          credits: { low: genEd.credits, high: genEd.credits },
          division: "lower",
          kind: "course",
          prerequisites: [],
        };
      }
      const codes = extractCourseCodes(label).map(normalizeCode);
      const courses = codes.map((c) => courseByCode.get(c)).filter((c) => c != null);
      const divisions = new Set(codes.map((c) => courseByCode.get(c)?.division ?? divisionFromCode(c)));
      return {
        label,
        codes,
        title: codes.length === 1 ? (courses[0]?.title ?? null) : null,
        credits: spanCredits(codes, credits),
        division: divisions.size === 1 ? [...divisions][0] : null,
        kind: "course",
        prerequisites: [...new Set(courses.flatMap((c) => c.prerequisites))],
      };
    }),
  }));

  const career_ = target.career;
  return {
    label: sw.label,
    fromLabel: from ? programLabel(from.degree, from.name, from.code) : sw.from,
    target: {
      code: target.code,
      name: target.name,
      degree: target.degree,
      credits: target.credits,
      label: programLabel(target.degree, target.name, target.code),
      effectiveTerm: target.effective_term ?? null,
      basis: target.sequence_basis,
      entryCredits: target.entry_credits,
    },
    admission: {
      priorDegree: target.admission.prior_degree ?? null,
      minGpa: target.admission.min_gpa ?? null,
      minGrade: target.admission.min_grade ?? null,
      prerequisites: target.admission.prerequisites.map((label) => {
        const code = normalizeCode(label);
        return { code, label, title: courseByCode.get(code)?.title ?? sharedTitle(code), credits: credits.get(code) ?? null };
      }),
      notes: target.admission.notes,
    },
    terms,
    electives: {
      slotCredits: target.electives.slot_credits,
      slotCreditsBasis: target.electives.slot_credits_basis ?? null,
      division: isAssociate ? "lower" : null,
      codes: target.electives.options.map((o) => normalizeCode(o.code)),
      lists: target.electives.allowed_lists.map((l) => ({ label: l.label, patterns: l.patterns })),
      note: target.electives.note ?? null,
      recommended: target.electives.options.filter((o) => o.recommended_for_bs).map((o) => o.code),
    },
    genEdCredits: target.sequence_basis === "after_associate" ? (target.blocks.general_education ?? null) : null,
    notes: target.notes,
    rates: {
      lower: Number(rules.cost_basis.mdc_lower_division_per_credit),
      upper: Number(rules.cost_basis.mdc_upper_division_per_credit),
      year: asString(rules.cost_basis.mdc_rates_year) ?? "",
    },
    career: career_
      ? {
          summary: career_.summary,
          dataSource: career_.data_source ?? null,
          occupations: career_.occupations.map((o) => ({
            title: o.title,
            medianPay: o.median_pay,
            outlookPct: o.outlook_pct ?? null,
            entryEducation: o.entry_education ?? null,
            source: o.source ?? null,
          })),
          withBs: career_.with_bs
            ? {
                note: career_.with_bs.note,
                occupations: career_.with_bs.occupations.map((o) => ({ title: o.title, medianPay: o.median_pay, outlookPct: o.outlook_pct ?? null })),
              }
            : null,
        }
      : null,
    sources: target.sources,
  };
}

export function getProgressPlan(id: CareerId): ProgressPlan {
  const career = getCareer(id);
  const ep = career.educational_pathway;
  const program = ep.primary_program;
  const rules = getSharedRules();
  const credits = knownCredits();
  const ownCredits = careerCredits(career);
  // The career's own catalog values win; shared values fill gen-ed gaps.
  const creditsByCode = new Map([...credits, ...ownCredits]);

  const terms = program.sequence_full_time.map((t) => ({
    term: t.term,
    entries: t.courses.map((label) => {
      const codes = extractCourseCodes(label).map(normalizeCode);
      return {
        label,
        codes,
        title: codes.length === 1 ? (lookupCourse(id, label)?.title ?? sharedTitle(codes[0])) : null,
        credits: spanCredits(codes, creditsByCode),
      };
    }),
  }));

  let fiu: FiuPlan | null = null;
  if (ep.fiu_transfer) {
    const f = ep.fiu_transfer;
    const exceptions = (rules.transfer_rules.fiu_exceptions ?? {}) as Record<string, unknown>;
    const exceptionKey = Object.keys(exceptions).find((k) => f.degree.toLowerCase().includes(k.toLowerCase()));
    const split = f.credit_split_assumption;
    fiu = {
      degree: f.degree,
      catalogYear: f.catalog_year ?? null,
      minGpa: f.min_gpa ?? null,
      admission: f.admission,
      prerequisites: f.prerequisites.map((p) => ({
        parts: p.mdc.map((label) => ({ label, codes: extractCourseCodes(label).map(normalizeCode) })),
        fiu: p.fiu.join(", "),
        note: p.note ?? null,
      })),
      exception: exceptionKey ? asString(exceptions[exceptionKey]) : null,
      asNote: program.degree === "AS" ? asString(rules.transfer_rules.as_to_bachelors) : null,
      advising: asString(rules.transfer_rules.fiu_advising),
      remaining:
        f.total_credits != null && f.remaining_after_aa_estimate != null
          ? {
              totalCredits: f.total_credits,
              credits: f.remaining_after_aa_estimate,
              note: f.remaining_note ?? "",
              source: f.credits_source ?? null,
              ratePerCredit: split ? null : asNumber(rules.cost_basis.fiu_undergrad_per_credit),
              rateTerm: asString(rules.cost_basis.fiu_rates_term) ?? "",
              splitAssumption: split ? { undergrad: split.undergrad_credits, grad: split.grad_credits, note: split.note } : null,
            }
          : null,
      majorNote: f.major_note ?? null,
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
    switches: ep.program_switches.map((sw) => getSwitchPlan(career, sw)).filter((s): s is SwitchPlan => s != null),
    knownCredits: Object.fromEntries(credits),
  };
}

export function getAllProgressPlans(): ProgressPlan[] {
  return CAREER_IDS.map(getProgressPlan);
}
