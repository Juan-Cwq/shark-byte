// lib/types.ts
// Single source of truth for data shapes. Matches /data/mdc_pathways.json.
// Design: facts come from the JSON; the AI only returns a PersonalizedPlan.

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Career ids — must match the "id" values in mdc_pathways.json        */
/* ------------------------------------------------------------------ */

export const CAREER_IDS = [
  "architect",
  "mechanical_engineer",
  "chef",
  "cybersecurity",
  "it_consultant",
] as const;
export const CareerId = z.enum(CAREER_IDS);
export type CareerId = z.infer<typeof CareerId>;

/* ------------------------------------------------------------------ */
/* Pathway data (validated at load; .passthrough() keeps extra fields) */
/* ------------------------------------------------------------------ */

// Some catalog entries list credits as a range string, e.g. "3-4".
const Credits = z.union([z.number(), z.string()]);

export const Course = z
  .object({
    code: z.string(),
    title: z.string(),
    credits: Credits,
    prerequisites: z.array(z.string()).default([]),
    corequisites: z.array(z.string()).default([]),
    fiu_equivalent: z.string().optional(),
    industry_cert: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();
export type Course = z.infer<typeof Course>;

export const SequenceTerm = z.object({
  term: z.string(),
  courses: z.array(z.string()), // codes AND placeholders like "Social science"
  credits: z.number(),
});
export type SequenceTerm = z.infer<typeof SequenceTerm>;

export const PrimaryProgram = z
  .object({
    code: z.string(),
    name: z.string(),
    degree: z.string(),
    credits: z.number(),
    effective_term: z.string().optional(),
    note: z.string().optional(),
    courses: z.array(Course),
    additional_prerequisites: z.array(Course).optional(),
    sequence_full_time: z.array(SequenceTerm),
    sources: z.array(z.string()).optional(),
  })
  .passthrough();

export const MdcBachelor = z
  .object({
    code: z.string(),
    name: z.string(),
    degree: z.string(),
    admission: z.array(z.string()).optional(),
    upper_division_courses: z.array(Course).optional(),
    // Present on some careers (e.g. cybersecurity BS after AS).
    sequence_from_as_full_time: z.array(SequenceTerm).optional(),
  })
  .passthrough();

export const FiuTransfer = z
  .object({
    degree: z.string(),
    catalog_year: z.string().optional(),
    min_gpa: z.number().optional(),
    admission: z.array(z.string()).default([]),
    prerequisites: z
      .array(
        z
          .object({ mdc: z.array(z.string()), fiu: z.array(z.string()), note: z.string().optional() })
          .passthrough()
      )
      .default([]),
    sources: z.array(z.string()).optional(),
  })
  .passthrough();

export const CostStage = z.object({
  stage: z.string(),
  years: z.string(),
  cost_low_usd: z.number(),
  cost_high_usd: z.number(),
  note: z.string().optional(),
});

export const AltPathway = z.object({
  code: z.string(),
  name: z.string(),
  degree: z.string(),
  leads_to: z.string(),
  note: z.string().optional(),
});
export type AltPathway = z.infer<typeof AltPathway>;

export const Career = z
  .object({
    id: CareerId,
    title: z.string(),
    summary: z.string(),
    career_exploration: z
      .object({
        duties: z.array(z.string()),
        median_pay_usd: z.number().nullable(),
        pay_year: z.string(),
        outlook: z.string(),
        entry_education: z.string(),
        related_careers: z.array(
          z.object({ title: z.string(), median_pay_usd: z.number().nullable(), education: z.string() })
        ),
        source: z.string(),
      })
      .passthrough(),
    educational_pathway: z
      .object({
        primary_program: PrimaryProgram,
        mdc_bachelor: MdcBachelor.optional(),
        fiu_transfer: FiuTransfer.optional(),
        other_transfer: z.array(z.string()).optional(),
        graduate: z.array(z.string()).optional(),
      })
      .passthrough(),
    timeline_and_cost: z.object({
      stages: z.array(CostStage),
      total: z.object({
        years: z.string(),
        cost_low_usd: z.number(),
        cost_high_usd: z.number(),
        excludes: z.string().optional(),
      }),
    }),
    professional_development: z
      .object({
        licensure_steps: z.array(z.string()).optional(),
        certifications: z.array(z.string()).optional(),
        experience: z.array(z.string()).default([]),
        source: z.string().optional(),
      })
      .passthrough(),
    alternative_pathways: z.array(AltPathway),
    unverified: z.array(z.string()).default([]),
  })
  .passthrough();
export type Career = z.infer<typeof Career>;

export const PathwaysFile = z
  .object({
    meta: z.object({ title: z.string(), as_of: z.string(), notes: z.string() }).passthrough(),
    cost_basis: z.record(z.string(), z.unknown()),
    transfer_rules: z.record(z.string(), z.unknown()),
    articulation_agreements: z.array(z.object({ mdc: z.string(), to: z.array(z.string()) }).passthrough()),
    careers: z.array(Career),
  })
  .passthrough();
export type PathwaysFile = z.infer<typeof PathwaysFile>;

/* ------------------------------------------------------------------ */
/* Request from the UI → /api/personalize                              */
/* ------------------------------------------------------------------ */

export const PersonalizeRequest = z.object({
  careerId: CareerId,
  status: z.enum(["high-school", "new-mdc-student", "current-mdc-student", "career-changer"]),
  completedCourseCodes: z.array(z.string().max(12)).max(60).default([]),
  attendance: z.enum(["full-time", "part-time"]).default("full-time"),
  hoursWorkedPerWeek: z.number().int().min(0).max(80).optional(),
  goals: z.string().max(500).optional(),
});
export type PersonalizeRequest = z.infer<typeof PersonalizeRequest>;

/* ------------------------------------------------------------------ */
/* AI output (Plain-Language-Synthesizer) → validated, then sanitized  */
/* ------------------------------------------------------------------ */

export const PersonalizedPlan = z.object({
  pathwayChoice: z.object({
    code: z.string(), // must be the primary program, MDC bachelor, or an alternative_pathways code
    name: z.string(),
    reason: z.string(),
  }),
  summary: z.string(),
  adjustedTerms: z
    .array(
      z.object({
        label: z.string(), // "Term 1", "Term 2 (summer)", ...
        courseCodes: z.array(z.string()), // ONLY real course codes from the data
        otherRequirements: z.array(z.string()).default([]), // "Social science", "Electives (9)"
        note: z.string().default(""),
      })
    )
    .min(1)
    .max(16),
  warnings: z.array(z.string()).max(6).default([]),
  nextSteps: z.array(z.string()).min(1).max(3),
  advisorQuestions: z.array(z.string()).min(1).max(5),
});
export type PersonalizedPlan = z.infer<typeof PersonalizedPlan>;

export interface PersonalizeResponse {
  plan: PersonalizedPlan;
  unknownCodesRemoved: string[];
  fromCache: boolean;
}

/* ------------------------------------------------------------------ */
/* Tutor chat                                                          */
/* ------------------------------------------------------------------ */

export const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const TutorRequest = z.object({
  careerId: CareerId,
  currentCourseCodes: z.array(z.string()).max(10).default([]),
  history: z.array(ChatMessage).max(40).default([]),
  question: z.string().min(1).max(4000),
});
export type TutorRequest = z.infer<typeof TutorRequest>;
