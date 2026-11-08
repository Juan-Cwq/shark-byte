import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkPlan, stripCreditClaims } from "./plan-check";
import type { PersonalizedPlan } from "./types";

const plan = (terms: PersonalizedPlan["adjustedTerms"]): PersonalizedPlan => ({
  pathwayChoice: { code: "10911", name: "Engineering - Mechanical Pathway", reason: "" },
  summary: "",
  adjustedTerms: terms,
  warnings: [],
  nextSteps: ["x"],
  advisorQuestions: ["x"],
});

describe("checkPlan", () => {
  it("prices a term from the catalog, not the AI's note", () => {
    const c = checkPlan(
      "mechanical_engineer",
      plan([{ label: "Term 1", courseCodes: ["ENC 1101", "EGN 1008C", "SLS 1106"], otherRequirements: [], note: "" }]),
      []
    );
    assert.deepEqual(c.terms[0].credits, { low: 7, high: 7 });
  });

  it("lists catalog courses and slots the plan left out, unless completed", () => {
    const c = checkPlan(
      "mechanical_engineer",
      plan([{ label: "Term 1", courseCodes: ["ENC 1101", "EGN 1008C", "SLS 1106"], otherRequirements: ["Humanities"], note: "" }]),
      ["MAC 1105"]
    );
    assert.ok(!c.missing.includes("MAC 1105"));
    assert.equal(c.missing.filter((m) => m === "Humanities").length, 1);
    assert.ok(c.missing.includes("MAC 2311"));
  });
});

describe("stripCreditClaims", () => {
  it("drops sentences that state credit numbers", () => {
    assert.equal(stripCreditClaims("Total Credits: 13"), "");
    assert.equal(stripCreditClaims("Start with math. This term is 14 credits."), "Start with math.");
  });
});
