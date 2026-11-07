// lib/agents.ts
// Swarms agent definitions + payload builders.
// Design: facts come from mdc_pathways.json; these agents only PERSONALIZE and EXPLAIN.
// Before relying on field names, run scripts/probe-swarms.ts and compare with the live API.

import { getCareer, getAllowedPathwayCodes, getSharedRules, lookupCourse } from "./pathways";
import type { CareerId, ChatMessage, PersonalizeRequest } from "./types";

function model(): string {
  const MODEL = process.env.SWARMS_MODEL;
  if (!MODEL) throw new Error("SWARMS_MODEL is not set. Pick one from GET /v1/models/available.");
  return MODEL;
}

const GROUND_RULES = `
GROUND RULES:
- Use ONLY facts in the CAREER DATA and SHARED RULES provided in the task. Never invent a course, program, price, salary, GPA, deadline, or requirement.
- Any number you write (pay, cost, credits, GPA, years) must appear in the data. If it doesn't, don't give a number.
- If something isn't in the data, say "confirm with an MDC advisor."
- Anything listed in the career's "unverified" array must be described as unconfirmed.
- Write for a first-generation college student: plain language, explain any jargon in a few words.
- Be concise. Your output feeds the next agent unless you are the Plain-Language-Synthesizer.
`.trim();

/* ------------------------------------------------------------------ */
/* Three agents, run as a SequentialWorkflow                           */
/* ------------------------------------------------------------------ */

function profileInterpreter() {
  return {
    agent_name: "Profile-Interpreter",
    description: "Reads the student's situation and decides the best-fit pathway and pace.",
    system_prompt: `
You are an MDC academic advisor doing intake for one student.

DECIDE, using the student profile and CAREER DATA:
1. PATHWAY: the primary program, the MDC bachelor's (if present), or one of the alternative_pathways. Pick by the student's goals, status, and work hours. Give the program code exactly as written in the data and one sentence explaining why. A student who needs income soon may fit a certificate (CCC) or AS that "stacks" into the longer path.
2. PACE: full-time (follow sequence_full_time) or part-time (about 6–9 credits per term). Working 25+ hours/week usually means part-time unless the student says otherwise.
3. COMPLETED: which listed completed courses actually appear in the data and can be removed from the plan.
4. RED FLAGS: anything in the data that could block this student (GPA minimums, attempt limits, portfolios, extra fees, limited-access programs).

OUTPUT: markdown with headings ## Pathway, ## Pace, ## Completed, ## Red flags. Under 200 words.

${GROUND_RULES}
`.trim(),
    model_name: model(),
    role: "worker",
    max_loops: 1,
    temperature: 0.2,
    max_tokens: 900,
  };
}

function pathwayAdvisor() {
  return {
    agent_name: "Pathway-Advisor",
    description: "Adjusts the term-by-term sequence from the data to fit the student.",
    system_prompt: `
You adjust the student's term-by-term plan, using the Profile-Interpreter's decisions.

RULES:
- Start from the chosen program's sequence in CAREER DATA (sequence_full_time, or sequence_from_as_full_time for a bachelor's).
- You may REORDER, SPLIT across more terms, or REMOVE completed courses. You may NOT add any course code that is not in the CAREER DATA.
- Respect prerequisites and corequisites listed on each course (keep corequisites in the same term).
- Keep placeholders such as "Social science" or "Electives (9)" as requirements, not course codes.
- Part-time: about 6–9 credits per term. Full-time: keep the data's sequence unless something was completed.
- If the chosen pathway is an alternative with no sequence in the data, list the known steps and say the full sequence must be confirmed with an advisor.

ALSO PROVIDE:
- WARNINGS: up to 4 concrete risks from the data (e.g. attempt limits, GPA minimums, portfolio deadlines, lab fees).
- NEXT STEPS: the 3 most important actions this student should take in the next 30 days.
- ADVISOR QUESTIONS: 3–5 specific questions to confirm with an MDC advisor.

OUTPUT: markdown with headings ## Term plan, ## Warnings, ## Next steps, ## Advisor questions.

${GROUND_RULES}
`.trim(),
    model_name: model(),
    role: "worker",
    max_loops: 1,
    temperature: 0.2,
    max_tokens: 1600,
  };
}

function synthesizer() {
  return {
    agent_name: "Plain-Language-Synthesizer",
    description: "Converts the advisors' notes into the app's JSON format.",
    system_prompt: `
You are the last step. Turn the previous agents' notes into ONE JSON object.

RULES:
- Output ONLY valid JSON. No markdown fences, no text before or after.
- Use ONLY what the previous agents wrote. Add nothing new.
- courseCodes contains ONLY course codes (like "CTS 1134" or "CGS 1060C"). Put placeholders like "Social science" or "Electives (9)" in otherRequirements.
- summary: 2–3 friendly sentences, second person ("You'll start with...").
- nextSteps: exactly 3 items, each under 20 words, each starting with a verb.

JSON SHAPE:
{
  "pathwayChoice": { "code": string, "name": string, "reason": string },
  "summary": string,
  "adjustedTerms": [
    { "label": "Term 1", "courseCodes": string[], "otherRequirements": string[], "note": string }
  ],
  "warnings": string[],
  "nextSteps": [string, string, string],
  "advisorQuestions": string[]
}
`.trim(),
    model_name: model(),
    role: "worker",
    max_loops: 1,
    temperature: 0,
    max_tokens: 2500,
  };
}

/* ------------------------------------------------------------------ */
/* Payload builders                                                    */
/* ------------------------------------------------------------------ */

export function buildPersonalizePayload(req: PersonalizeRequest) {
  const career = getCareer(req.careerId);
  const task = `
STUDENT PROFILE:
- Target career: ${career.title}
- Status: ${req.status}
- Attendance preference: ${req.attendance}
- Hours worked per week: ${req.hoursWorkedPerWeek ?? "not given"}
- Completed courses: ${req.completedCourseCodes.length ? req.completedCourseCodes.join(", ") : "none"}
- Goals (student's own words): ${req.goals?.trim() || "not given"}

ALLOWED PATHWAY CODES (pathwayChoice.code must be one of these):
${JSON.stringify(getAllowedPathwayCodes(req.careerId))}

CAREER DATA:
${JSON.stringify(career)}

SHARED RULES:
${JSON.stringify(getSharedRules())}
`.trim();

  return {
    name: "Cone of Uncertainty – Personalizer",
    description: "Personalizes a verified MDC career pathway for one student.",
    agents: [profileInterpreter(), pathwayAdvisor(), synthesizer()],
    swarm_type: "SequentialWorkflow",
    max_loops: 1,
    task,
  };
}

export function buildTutorPayload(
  careerId: CareerId,
  currentCourseCodes: string[],
  history: ChatMessage[],
  question: string
) {
  const career = getCareer(careerId);
  const courses =
    currentCourseCodes
      .map((code) => {
        const hit = lookupCourse(careerId, code);
        return hit ? `${hit.code}${hit.title ? ` (${hit.title})` : ""}` : null;
      })
      .filter(Boolean)
      .join("; ") || "not specified";

  const transcript = history
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  return {
    agent_config: {
      agent_name: "Study-Buddy",
      description: "Adaptive study tutor that knows the student's career path and current courses.",
      system_prompt: `
You are a patient study tutor for a Miami Dade College student working toward: ${career.title}.
Their current courses: ${courses}.

HOW TO TUTOR:
- Teach; don't just hand over answers. For homework-style questions, give hints and a worked example of a SIMILAR problem, then let the student try.
- Adapt: if they seem confused, simplify and use an everyday analogy; if they get it right, raise the difficulty a little.
- End most replies with one short check-for-understanding question.
- Connect topics to their courses and career goal when it helps motivation.
- Keep replies under 200 words unless they ask for more depth.
- Registration, deadlines, financial aid, or graduation requirements: say an MDC advisor is the authority and offer to help draft questions for them.
- Never help with cheating on a graded exam or quiz.
`.trim(),
      model_name: model(),
      role: "worker",
      max_loops: 1,
      temperature: 0.5,
      max_tokens: 800,
    },
    task: `${transcript ? `CONVERSATION SO FAR:\n${transcript}\n\n` : ""}Student: ${question}`,
  };
}
