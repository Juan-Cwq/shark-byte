// lib/swarms.ts
// Hosted Swarms API client. Import only from server code (API routes / scripts) — never from client components.

const BASE_URL = "https://api.swarms.world";
const TIMEOUT_MS = 90_000; // a 3-agent sequential swarm can take a while

export class SwarmsError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function post(path: string, body: unknown): Promise<unknown> {
  const key = process.env.SWARMS_API_KEY;
  if (!key) throw new SwarmsError("SWARMS_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) throw new SwarmsError(`Swarms ${path} failed (${res.status}): ${text.slice(0, 500)}`, res.status);
    try {
      return JSON.parse(text);
    } catch {
      throw new SwarmsError(`Swarms ${path} returned non-JSON: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new SwarmsError(`Swarms ${path} timed out`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const callSwarm = (payload: unknown) => post("/v1/swarm/completions", payload);
export const callAgent = (payload: unknown) => post("/v1/agent/completions", payload);

/**
 * Pulls the final agent's text out of a Swarms response.
 * Confirmed shapes from scripts/probe-swarms.ts:
 * - swarm:  { output:  [{ role, content }, ...] }
 * - agent:  { outputs: [{ role, content }, ...] }
 */
export function extractFinalText(response: unknown): string {
  const r = response as Record<string, unknown>;
  const candidates = [r?.output, r?.outputs, r?.result, r?.response, r?.content, r?.data];

  for (const c of candidates) {
    const text = lastText(c);
    if (text) return text;
  }

  throw new SwarmsError("Could not find agent output in Swarms response. Run scripts/probe-swarms.ts.");
}

function lastText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const t = lastText(value[i]);
      if (t) return t;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const k of ["content", "output", "text", "message", "response"]) {
      const t = lastText(o[k]);
      if (t) return t;
    }
    // Outputs keyed by agent name, e.g. { "First": "...", "Second": "..." }: take the last one.
    const values = Object.values(o);
    for (let i = values.length - 1; i >= 0; i--) {
      if (typeof values[i] === "string" && (values[i] as string).trim()) return (values[i] as string).trim();
    }
  }
  return null;
}

/** Strips ```json fences and any text around the outermost JSON object, then parses. */
export function parseJsonLoose(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new SwarmsError("No JSON object found in agent output");
  return JSON.parse(unfenced.slice(start, end + 1));
}
