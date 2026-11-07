// Run: npx tsx --env-file=.env.local scripts/probe-swarms.ts
// Sends tiny requests so you can see the real response shape before building the API routes.
// Costs a fraction of a cent.

const KEY = process.env.SWARMS_API_KEY;
const MODEL = process.env.SWARMS_MODEL;
if (!KEY || !MODEL) throw new Error("Set SWARMS_API_KEY and SWARMS_MODEL in .env.local");

async function post(path: string, body: unknown) {
  const res = await fetch(`https://api.swarms.world${path}`, {
    method: "POST",
    headers: { "x-api-key": KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`\n=== ${path} → HTTP ${res.status} ===`);
  console.log(JSON.stringify(await res.json(), null, 2).slice(0, 4000));
}

const agent = (name: string, prompt: string) => ({
  agent_name: name,
  description: name,
  system_prompt: prompt,
  model_name: MODEL,
  role: "worker",
  max_loops: 1,
  temperature: 0,
  max_tokens: 100,
});

async function main() {
  await post("/v1/swarm/completions", {
    name: "probe",
    description: "shape probe",
    agents: [
      agent("First", "Reply with exactly: FIRST_DONE"),
      agent("Second", 'Reply with exactly this JSON and nothing else: {"ok": true}'),
    ],
    swarm_type: "SequentialWorkflow",
    max_loops: 1,
    task: "Do your one job.",
  });

  await post("/v1/agent/completions", {
    agent_config: agent("Solo", "Reply with exactly: SOLO_DONE"),
    task: "Do your one job.",
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
