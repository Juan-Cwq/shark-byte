import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Alert } from "./types";
import { isLookalikeHost, isOfficialHost, verifyAlert } from "./verify";

const HURRICANE_ID = "urn:oid:2.49.0.1.840.0.test-hurricane.001.1";

const OFFICIAL: Alert[] = [
  {
    id: HURRICANE_ID,
    url: `https://api.weather.gov/alerts/${HURRICANE_ID}`,
    event: "Hurricane Warning",
    headline: "Hurricane Warning issued November 7 at 5:00AM EST by NWS Miami FL",
    description: "Hurricane conditions expected within 36 hours.",
    instruction: "Complete preparations now.",
    severity: "Extreme",
    urgency: "Expected",
    certainty: "Likely",
    areaDesc: "Coastal Miami Dade County; Coastal Broward County",
    senderName: "NWS Miami FL",
    sent: "2026-11-07T10:00:00Z",
    effective: "2026-11-07T10:00:00Z",
    expires: "2026-11-08T10:00:00Z",
  },
  {
    id: "urn:oid:2.49.0.1.840.0.test-flood.001.1",
    url: "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.test-flood.001.1",
    event: "Flood Advisory",
    headline: "Flood Advisory issued November 7 at 9:11AM EST by NWS Tampa Bay Ruskin FL",
    description: "Minor flooding in low-lying areas.",
    instruction: null,
    severity: "Minor",
    urgency: "Expected",
    certainty: "Likely",
    areaDesc: "DeSoto, FL",
    senderName: "NWS Tampa Bay Ruskin FL",
    sent: "2026-11-07T14:11:00Z",
    effective: null,
    expires: "2026-11-07T21:15:00Z",
  },
];

describe("verifyAlert: verified", () => {
  it("claim matches an active NWS alert for the same area and links to weather.gov", () => {
    const r = verifyAlert(
      "NWS Miami: Hurricane Warning in effect for coastal Miami-Dade. Details: https://www.weather.gov/mfl/",
      OFFICIAL
    );
    assert.equal(r.label, "verified");
    assert.ok(r.reasons.some((x) => x.includes("Matches an active NWS Hurricane Warning")));
    assert.ok(r.reasons.some((x) => x.includes("weather.gov")));
  });

  it("official NWS alert URL with a matching alert ID", () => {
    const r = verifyAlert(`https://api.weather.gov/alerts/${HURRICANE_ID}`, OFFICIAL);
    assert.equal(r.label, "verified");
    assert.ok(r.reasons.some((x) => x.includes("Matches the official NWS Hurricane Warning")));
  });
});

describe("verifyAlert: suspicious", () => {
  it("lookalike FEMA domain asking for a gift-card fee", () => {
    const r = verifyAlert(
      "URGENT: FEMA hurricane relief payment of $750 approved! Claim at fema-relief-gov.com and pay the $25 processing fee with a gift card.",
      OFFICIAL
    );
    assert.equal(r.label, "suspicious");
    assert.ok(r.reasons.some((x) => x.includes("fema-relief-gov.com imitates")));
    assert.ok(r.reasons.some((x) => x.includes("gift card")));
    assert.ok(r.reasons.some((x) => x.includes("fee")));
  });

  it("claims a hurricane warning for an area NWS hasn't warned, with chain-message pressure", () => {
    const r = verifyAlert(
      "BREAKING: Category 5 Hurricane Warning for Tampa! Evacuate NOW. Share with everyone before it's deleted!!",
      OFFICIAL
    );
    assert.equal(r.label, "suspicious");
    assert.ok(r.reasons.some((x) => x.includes("not for Hillsborough")));
    assert.ok(r.reasons.some((x) => x.includes("chain-message")));
  });
});

describe("verifyAlert: unverified", () => {
  it("vague rumor with no source or official claim", () => {
    const r = verifyAlert("My cousin said a storm might hit Miami next week, stock up on water.", OFFICIAL);
    assert.equal(r.label, "unverified");
    assert.ok(r.reasons[0].includes("No matching official"));
  });

  it("evacuation notice from an unofficial news site", () => {
    const r = verifyAlert("Mandatory evacuation for Zone A starting tomorrow, see miaminewsdaily.com", OFFICIAL);
    assert.equal(r.label, "unverified");
    assert.ok(r.reasons.some((x) => x.includes("miaminewsdaily.com is not an official")));
    assert.ok(r.reasons.some((x) => x.includes("county officials")));
  });
});

describe("verifyAlert: edge cases", () => {
  it("claims a warning NWS hasn't issued anywhere in Florida", () => {
    const r = verifyAlert("Tornado Warning for Broward until 6 PM", OFFICIAL);
    assert.equal(r.label, "suspicious");
    assert.ok(r.reasons.some((x) => x.includes("no active Tornado Warning")));
  });

  it("can't compare claims when no official alerts are loaded (offline, empty cache)", () => {
    const r = verifyAlert("Hurricane Warning for Miami-Dade", null);
    assert.equal(r.label, "unverified");
    assert.ok(r.reasons.some((x) => x.includes("Couldn't compare")));
  });

  it("an official link doesn't rescue a fake claim", () => {
    const r = verifyAlert("Tornado Warning for Miami! More at weather.gov", OFFICIAL);
    assert.equal(r.label, "suspicious");
  });
});

describe("domain checks", () => {
  it("accepts official domains and subdomains", () => {
    for (const host of ["weather.gov", "api.weather.gov", "nhc.noaa.gov", "fema.gov", "miamidade.gov"]) {
      assert.equal(isOfficialHost(host), true, host);
    }
  });

  it("flags lookalikes", () => {
    for (const host of ["n0aa-alerts.com", "fema.gov.claims.io", "weathr.gov.co", "xn--nnaa-9ra.com", "nationalweather-alerts.net", "fema.gob"]) {
      assert.equal(isLookalikeHost(host), true, host);
    }
  });

  it("does not flag unrelated or real government sites", () => {
    for (const host of ["miamiherald.com", "nasa.gov", "nbcmiami.com", "weather.gov"]) {
      assert.equal(isLookalikeHost(host), false, host);
    }
  });
});
