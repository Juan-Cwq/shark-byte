// Run: npx tsx scripts/check-data.ts
// Validates mdc_pathways.json and the sanitizer before you build any UI.

import { getAllCareers, getCareer, getCareerCourseIndex, sanitizePlan } from "../lib/pathways";
import { buildPersonalizePayload } from "../lib/agents";
import type { PersonalizedPlan } from "../lib/types";

process.env.SWARMS_MODEL ??= "check-data-placeholder";

for (const c of getAllCareers()) {
  const career = getCareer(c.id);
  const payload = buildPersonalizePayload({
    careerId: c.id,
    status: "new-mdc-student",
    completedCourseCodes: [],
    attendance: "full-time",
  });
  console.log(
    `${c.id.padEnd(20)} ${String(getCareerCourseIndex(c.id).size).padStart(3)} codes | ` +
      `${career.educational_pathway.primary_program.sequence_full_time.length} terms | ` +
      `${career.unverified.length} unverified | prompt ~${Math.round(payload.task.length / 4)} tokens`
  );
}

const fake: PersonalizedPlan = {
  pathwayChoice: { code: "NOPE", name: "Made up", reason: "Take XYZ 9999 first." },
  summary: "You'll start with CTS 1134.",
  adjustedTerms: [{ label: "Term 1", courseCodes: ["CTS 1134", "FAKE 1234"], otherRequirements: [], note: "" }],
  warnings: [],
  nextSteps: ["Meet an advisor.", "Check CTS 1134 seats.", "Ask about online options."],
  advisorQuestions: ["Is CTS 1120 offered online?"],
};
const { plan, unknownCodesRemoved } = sanitizePlan("cybersecurity", fake);
console.log("\nSanitizer:", {
  pathway: plan.pathwayChoice.code,
  term1: plan.adjustedTerms[0].courseCodes,
  reason: plan.pathwayChoice.reason,
  unknownCodesRemoved,
});
