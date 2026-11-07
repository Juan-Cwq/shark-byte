// lib/verify.ts
// Rule-based alert checker. Pure and deterministic: no network, no LLM.
// Label precedence: any red flag -> "suspicious"; else an official match or official link -> "verified";
// else "unverified".

import type { Alert, VerifyResult } from "./types";

export const OFFICIAL_DOMAINS = [
  "weather.gov", // NWS (incl. api.weather.gov, forecast offices)
  "noaa.gov", // NOAA (incl. nhc.noaa.gov)
  "fema.gov",
  "ready.gov",
  "floridadisaster.org", // Florida Division of Emergency Management
  "miamidade.gov",
  "usa.gov",
] as const;

// Brand names scammers squeeze into lookalike domains (compared after squashing punctuation/homoglyphs).
const BRAND_TOKENS = [
  "noaa",
  "fema",
  "weathergov",
  "nationalweather",
  "hurricanecenter",
  "floridadisaster",
  "miamidade",
  "readygov",
];

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc"];

const SCAM_PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /gift ?cards?|wire (the )?(money|funds|transfer)|bitcoin|crypto|zelle|cash ?app|venmo|western union|moneygram|prepaid card/i,
    reason: "Asks for payment by gift card, wire, crypto or a payment app. Agencies never collect money this way.",
  },
  {
    re: /social security|\bssn\b|bank account|routing number|credit card|card number|password|verify your (identity|account)/i,
    reason: "Asks for personal or banking information. Real weather alerts never do.",
  },
  {
    re: /processing fee|registration fee|release fee|pay (a|the)? ?\$?\d*.{0,30}(to (receive|claim|get|unlock)|fee)/i,
    reason: "Asks you to pay a fee to receive aid. FEMA and the state do not charge fees for assistance.",
  },
  {
    re: /act now|within \d+ (hours?|minutes?)|limited time|last chance|share (this )?(now|with everyone)|forward (this )?to everyone|before (it'?s|this is) deleted|they don'?t want you to know|media (won'?t|isn'?t) (tell|report)/i,
    reason: "Uses pressure or chain-message language (\"share before it's deleted\", \"act now\"), a common sign of fake alerts.",
  },
];

// Ordered longest-first so "flash flood warning" isn't also counted as "flood warning".
const EVENT_CLAIMS = [
  "extreme wind warning",
  "tropical storm warning",
  "tropical storm watch",
  "storm surge warning",
  "storm surge watch",
  "flash flood warning",
  "flash flood watch",
  "coastal flood warning",
  "hurricane warning",
  "hurricane watch",
  "tornado warning",
  "tornado watch",
  "flood warning",
  "flood watch",
];

// Places people mention -> token found in NWS areaDesc after squashing punctuation.
const PLACES: { re: RegExp; area: string; name: string }[] = [
  { re: /miami[- ]?dade|\bmiami\b|hialeah|homestead/i, area: "miamidade", name: "Miami-Dade" },
  { re: /broward|fort lauderdale|hollywood/i, area: "broward", name: "Broward" },
  { re: /palm beach/i, area: "palmbeach", name: "Palm Beach" },
  { re: /monroe|florida keys|key west|\bkeys\b/i, area: "monroe", name: "Monroe (Keys)" },
  { re: /collier|naples/i, area: "collier", name: "Collier" },
  { re: /hillsborough|\btampa\b/i, area: "hillsborough", name: "Hillsborough (Tampa)" },
  { re: /pinellas|st\.? petersburg|clearwater/i, area: "pinellas", name: "Pinellas" },
  { re: /orlando|orange county/i, area: "orange", name: "Orange (Orlando)" },
  { re: /jacksonville|duval/i, area: "duval", name: "Duval (Jacksonville)" },
  { re: /tallahassee|leon county/i, area: "leon", name: "Leon (Tallahassee)" },
];

const LINK_RE = /\b(https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?=[\s/:?#)"'<>,!.;]|$)/gi;

interface Link {
  host: string;
  scheme: "http" | "https" | null;
}

function extractLinks(text: string): Link[] {
  const links: Link[] = [];
  for (const m of text.matchAll(LINK_RE)) {
    const scheme = m[1] ? (m[1].toLowerCase().startsWith("https") ? "https" : "http") : null;
    const host = m[2].toLowerCase().replace(/^www\./, "");
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (isIp && !scheme) continue; // bare dotted numbers are usually IDs or versions, not links
    if (!links.some((l) => l.host === host)) links.push({ host, scheme });
  }
  return links;
}

export function isOfficialHost(host: string): boolean {
  return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function squash(s: string): string {
  return s
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/[^a-z]/g, "");
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

export function isLookalikeHost(host: string): boolean {
  if (isOfficialHost(host)) return false;
  if (host.includes("xn--")) return true; // punycode can disguise letters
  if (host.endsWith(".gov")) return false; // .gov is restricted to real U.S. government bodies
  if (BRAND_TOKENS.some((t) => squash(host).includes(t))) return true;
  // Compare every adjacent label pair so "weathr.gov.co" is caught, not just the last two labels.
  const labels = host.split(".");
  const pairs = labels.slice(0, -1).map((label, i) => `${label}.${labels[i + 1]}`);
  return pairs.some((pair) =>
    OFFICIAL_DOMAINS.some((d) => {
      const dist = levenshtein(pair, d);
      return dist > 0 && (dist === 1 || (dist === 2 && d.length >= 10));
    })
  );
}

function findClaims(lower: string): string[] {
  let rest = lower;
  const claims: string[] = [];
  for (const claim of EVENT_CLAIMS) {
    const re = new RegExp(`\\b${claim}s?\\b`, "g");
    if (re.test(rest)) {
      claims.push(claim);
      rest = rest.replace(re, " ");
    }
  }
  return claims;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function verifyAlert(input: string, officialAlerts: Alert[] | null): VerifyResult {
  const text = input.trim();
  if (!text) return { label: "unverified", reasons: ["There's nothing to check yet."] };

  const lower = text.toLowerCase();
  const red: string[] = [];
  const good: string[] = [];
  const info: string[] = [];

  // 1. Links: official domains, lookalikes, shorteners, raw IPs.
  for (const link of extractLinks(text)) {
    if (isOfficialHost(link.host)) {
      good.push(`Links to ${link.host}, an official government source.`);
      if (link.scheme === "http") info.push(`The ${link.host} link uses http instead of https; type the address yourself to be safe.`);
    } else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(link.host)) {
      red.push(`Links to a raw IP address (${link.host}) instead of a named website.`);
    } else if (SHORTENERS.includes(link.host)) {
      red.push(`Uses a link shortener (${link.host}) that hides where the link really goes.`);
    } else if (isLookalikeHost(link.host)) {
      red.push(`${link.host} imitates an official agency's web address but is not one.`);
    } else if (link.host.endsWith(".gov")) {
      info.push(`${link.host} is a government site, but not a weather or emergency agency we check against.`);
    } else {
      info.push(`${link.host} is not an official weather or emergency agency.`);
    }
  }

  // 2. Scam keywords and patterns.
  for (const { re, reason } of SCAM_PATTERNS) if (re.test(text)) red.push(reason);

  // 3. Claims vs. official NWS alerts.
  const claims = findClaims(lower);
  const places = PLACES.filter((p) => p.re.test(text));

  if (officialAlerts === null) {
    if (claims.length > 0) info.push("Couldn't compare with official NWS alerts because none have been loaded yet.");
  } else {
    const byId = officialAlerts.find((a) => lower.includes(a.id.toLowerCase()));
    if (byId) good.push(`Matches the official NWS ${byId.event} issued by ${byId.senderName}.`);

    const byHeadline = officialAlerts.find(
      (a) => a !== byId && a.headline && lower.includes(a.headline.toLowerCase().slice(0, 60))
    );
    if (byHeadline) good.push(`Matches the headline of an active NWS ${byHeadline.event}.`);

    for (const claim of claims) {
      const name = titleCase(claim);
      const sameEvent = officialAlerts.filter((a) => a.event.toLowerCase() === claim);
      if (sameEvent.length === 0) {
        red.push(`Claims a ${name}, but the National Weather Service has no active ${name} for Florida right now.`);
        continue;
      }
      if (places.length > 0) {
        const covered = places.filter((p) => sameEvent.some((a) => squash(a.areaDesc).includes(p.area)));
        const missing = places.filter((p) => !covered.includes(p));
        if (covered.length === 0) {
          red.push(`There is an official ${name}, but not for ${missing.map((p) => p.name).join(" or ")}.`);
          continue;
        }
      }
      good.push(`Matches an active NWS ${name} issued by ${sameEvent[0].senderName}.`);
    }
  }

  // 4. Things NWS alerts can't confirm.
  if (/evacuat/i.test(text)) {
    info.push("Evacuation orders come from county officials, not NWS. Confirm at miamidade.gov or floridadisaster.org.");
  }
  if (/category\s*[1-5]/i.test(text)) {
    info.push("Hurricane categories come from the National Hurricane Center. Confirm at nhc.noaa.gov.");
  }

  if (red.length > 0) return { label: "suspicious", reasons: [...red, ...info] };
  if (good.length > 0) return { label: "verified", reasons: [...good, ...info] };
  return {
    label: "unverified",
    reasons: ["No matching official NWS alert or official source was found.", ...info],
  };
}
