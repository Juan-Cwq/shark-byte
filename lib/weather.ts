// lib/weather.ts
// Official NWS alerts for Florida. Server-only: call from /app/api/alerts, never from a client component.
// Client-side persistence (IndexedDB) lives in lib/alerts-cache.ts.

import { z } from "zod";
import { AlertSchema, type Alert, type AlertsSnapshot } from "./types";

const NWS_URL = "https://api.weather.gov/alerts/active?area=FL";
const TIMEOUT_MS = 10_000;
const MEMORY_TTL_MS = 60_000; // NWS asks clients not to poll aggressively

// NWS requires a User-Agent identifying the app and a contact.
function userAgent(): string {
  return process.env.NWS_USER_AGENT || "(ConeOfUncertainty MDC hackathon app, github.com/Juan-Cwq/shark-byte)";
}

const NwsFeature = z.object({
  properties: z
    .object({
      "@id": z.string(),
      id: z.string(),
      status: z.string(),
      event: z.string(),
      headline: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      instruction: z.string().nullable().optional(),
      severity: z.string().nullable().optional(),
      urgency: z.string().nullable().optional(),
      certainty: z.string().nullable().optional(),
      areaDesc: z.string().nullable().optional(),
      senderName: z.string().nullable().optional(),
      sent: z.string(),
      effective: z.string().nullable().optional(),
      expires: z.string().nullable().optional(),
    })
    .passthrough(),
});
const NwsResponse = z.object({ features: z.array(z.unknown()) }).passthrough();

export function normalizeNwsAlerts(json: unknown): Alert[] {
  const alerts: Alert[] = [];
  for (const raw of NwsResponse.parse(json).features) {
    const parsed = NwsFeature.safeParse(raw);
    if (!parsed.success) continue;
    const p = parsed.data.properties;
    if (p.status !== "Actual") continue; // skip Test / Exercise / System messages
    alerts.push(
      AlertSchema.parse({
        id: p.id,
        url: p["@id"],
        event: p.event,
        headline: p.headline ?? null,
        description: p.description ?? "",
        instruction: p.instruction ?? null,
        severity: p.severity ?? "Unknown",
        urgency: p.urgency ?? "Unknown",
        certainty: p.certainty ?? "Unknown",
        areaDesc: p.areaDesc ?? "",
        senderName: p.senderName ?? "National Weather Service",
        sent: p.sent,
        effective: p.effective ?? null,
        expires: p.expires ?? null,
      })
    );
  }
  return alerts;
}

let memo: { snapshot: AlertsSnapshot; at: number } | null = null;

export async function fetchFloridaAlerts(): Promise<AlertsSnapshot> {
  if (memo && Date.now() - memo.at < MEMORY_TTL_MS) return memo.snapshot;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NWS_URL, {
      headers: { "User-Agent": userAgent(), Accept: "application/geo+json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`NWS alerts failed (${res.status})`);
    const snapshot: AlertsSnapshot = {
      alerts: normalizeNwsAlerts(await res.json()),
      fetchedAt: new Date().toISOString(),
    };
    memo = { snapshot, at: Date.now() };
    return snapshot;
  } finally {
    clearTimeout(timer);
  }
}
