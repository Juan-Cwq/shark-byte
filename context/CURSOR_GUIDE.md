# Cone of Uncertainty — Build Guide for Cursor

**Pick a career. Get the path. Start at MDC.**

How to use this: put `project.mdc` in `.cursor/rules/`, keep `mdc_pathways.json` in `/data/`, copy the hand-written contract files into `/lib/` (see Phase 1), then paste the prompts below into Cursor **one at a time**. Review each diff, run the app, commit, then move on. Don't paste the whole guide at once.

---

## The architecture (read this once yourself)

```
Student picks career + profile
        │
        ▼
/lib/pathways.ts  ──►  Deterministic roadmap from mdc_pathways.json
        │               (courses, sequence, costs, pay, transfer, alternatives)
        ▼
/api/personalize  ──►  Swarms SequentialWorkflow (3 agents)
        │               adjusts for the student's situation, explains in plain language
        ▼
Roadmap page  ◄── facts from JSON + AI advice layer (clearly labeled)
        │
        ▼
/api/tutor  ──►  Swarms single agent, knows the student's current courses
```

**Why this split:** facts never come from the LLM, so nothing is hallucinated. The swarm adds what a static catalog can't: "I already took MAC 1105 and work 30 hrs/week, what changes?"

**No database required.** Pathway data is static JSON. Personalization and tutoring are server-side API routes that call Swarms. Tutor chat history stays in the browser. Cached demo responses live in `/data/cache/*.json`. Do **not** add Supabase (or any DB) unless you later need accounts / saved plans — and only after the demo works.

**Budget:** use a cheap `SWARMS_MODEL`, run `scripts/probe-swarms.ts` once, cache personalize results for demo, avoid re-running the 3-agent swarm while polishing UI.

### The three agents (SequentialWorkflow)

| Agent | Job | Temp |
|---|---|---|
| **Profile Interpreter** | Reads the student's situation and the career data. Decides: primary pathway or one of the `alternative_pathways`? Full-time or part-time pacing? Which completed courses to remove? | 0.2 |
| **Pathway Advisor** | Adjusts the term sequence (only reorders/removes codes that exist in the data), flags risks, picks the next 3 concrete actions. | 0.2 |
| **Plain-Language Synthesizer** | Outputs strict JSON: personalized summary, adjusted terms, warnings, next steps, advisor questions. | 0 |

---

## Team workflow (3 people)

Coordinate through **Git branches + PRs**.

| Person | Owns | Stay out of |
|---|---|---|
| A — Contract / data | `mdc_pathways.json`, `/lib/types.ts`, `/lib/pathways.ts`, `/lib/agents.ts`, `/lib/swarms.ts`, scripts | UI chrome |
| B — UI | `/app`, `/components`, static career pages | Agent prompts, zod schemas |
| C — API / demo | `/app/api/*`, `/data/cache`, deploy, `DEMO_MODE` | Rewriting pathway data |

**Frozen contract:** `/lib/types.ts`, `/lib/pathways.ts`, `/lib/agents.ts`, `/lib/swarms.ts` — do not let Cursor regenerate them.

### Git rules
- Protect `main`: merge only via PR. One branch per task. Never force-push shared branches.
- Never commit `.env.local`. Tag `demo-safe` once Phase 2 works.

---

## Phase 0 — Setup (30 min)

> Next.js + TypeScript + Tailwind + App Router, src-less. Install zod + `server-only`. Folders: `/app`, `/app/api`, `/components`, `/lib`, `/data`, `/data/cache`, `/scripts`. `.env.example` with `SWARMS_API_KEY=`, `SWARMS_MODEL=`, `DEMO_MODE=false`. Stubs: `/app/alerts/page.tsx`, `/lib/weather.ts`. `npm run build`.

Put real secrets only in `.env.local` (gitignored).

---

## Phase 1 — Data layer (already written)

| Staging file | Install as |
|---|---|
| `project.mdc` | `.cursor/rules/project.mdc` |
| `mdc_pathways.json` | `/data/mdc_pathways.json` |
| `types-2.ts` | `/lib/types.ts` |
| `pathways.ts` | `/lib/pathways.ts` |
| `agents-2.ts` | `/lib/agents.ts` |
| `swarms.ts` | `/lib/swarms.ts` |
| `check-data.ts` | `/scripts/check-data.ts` |
| `probe-swarms.ts` | `/scripts/probe-swarms.ts` |

> Install `tsx`, add `"check-data": "tsx scripts/check-data.ts"` and `"probe-swarms": "tsx --env-file=.env.local scripts/probe-swarms.ts"`. Run `npm run check-data`.

✅ **Check:** 5 careers; sanitizer removes `FAKE 1234` / `XYZ 9999`. Commit.

---

## Phase 2 — Static roadmap UI (2 hrs) ← submittable

Same as before: Miami storm-cone look, home + `/career/[id]` from `/lib/pathways.ts` only. No Swarms required for a valid submission.

---

## Phase 3 — Swarms personalization (2 hrs)

> First run `npm run probe-swarms` and read the response shape. Then simplify `extractFinalText` in `/lib/swarms.ts` if needed.
>
> Build `POST /api/personalize`:
> 1. Validate with `PersonalizeRequest`.
> 2. `callSwarm(buildPersonalizePayload(req))`.
> 3. `extractFinalText` → `parseJsonLoose` → `PersonalizedPlan`.
> 4. `sanitizePlan(req.careerId, plan)`.
> 5. Retry once on failure; then `/data/cache/<careerId>.json`.
> 6. Return `{ plan, unknownCodesRemoved, fromCache }`.
>
> UI: "Personalize my path" panel; show the three agent names while loading; label the result as AI-generated.

✅ Cache one good plan per career under `/data/cache/`.

---

## Phase 4 — Study tutor (1 hr)

> `POST /api/tutor` via `callAgent(buildTutorPayload(...))`. Slide-out Study buddy; history in React state (last 10 messages).

---

## Phase 5 — Demo hardening (1 hr)

> `DEMO_MODE=true` returns cache instantly. Skeletons, errors, "How it works" modal. Deploy to Vercel with env vars set in the dashboard (never commit the key).

---

## Phase 6 — Hurricane alerts (only if time)

NWS/NHC facts first; Swarms only to explain in plain language if budget allows.

---

## Pitch

> "Cone of Uncertainty turns MDC's real catalog into a step-by-step career roadmap. A three-agent Swarms pipeline personalizes it, and every course code is verified against the catalog before you see it."

## Time budget (~6.75 hrs)
| Phase | Time | Cumulative |
|---|---|---|
| 0 Setup | 0.5h | 0.5h |
| 1 Data layer | 0.25h | 0.75h |
| 2 Static UI ← **submittable** | 2h | 2.75h |
| 3 Swarms personalization | 2h | 4.75h |
| 4 Tutor | 1h | 5.75h |
| 5 Hardening + deploy | 1h | 6.75h |
