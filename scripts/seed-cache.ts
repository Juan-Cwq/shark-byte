// Run: npx tsx --env-file=.env.local scripts/seed-cache.ts
// Generates /data/cache/<careerId>.json for DEMO_MODE. Costs ~$0.03+/career (agent fees).

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { buildPersonalizePayload } from "../lib/agents";
import { sanitizePlan } from "../lib/pathways";
import { callSwarm, extractFinalText, parseJsonLoose } from "../lib/swarms";
import { CAREER_IDS, PersonalizedPlan } from "../lib/types";

async function main() {
  await mkdir(path.join(process.cwd(), "data", "cache"), { recursive: true });
  for (const careerId of CAREER_IDS) {
    console.log(`Personalizing ${careerId}…`);
    const raw = await callSwarm(
      buildPersonalizePayload({
        careerId,
        status: "new-mdc-student",
        completedCourseCodes: [],
        attendance: "full-time",
        hoursWorkedPerWeek: 10,
        goals: "Finish on time and transfer if needed",
      })
    );
    const plan = PersonalizedPlan.parse(parseJsonLoose(extractFinalText(raw)));
    const { plan: clean, unknownCodesRemoved } = sanitizePlan(careerId, plan);
    const out = path.join(process.cwd(), "data", "cache", `${careerId}.json`);
    await writeFile(out, JSON.stringify(clean, null, 2) + "\n");
    console.log(`  saved ${out} (stripped ${unknownCodesRemoved.length} codes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
