import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunk, rank, tokenize } from "./retrieval";
import { buildPassages, citedRefs, findSources, recallExchanges } from "./study-context";
import type { StoredExchange, StudyNote } from "./types";

const note = (id: string, title: string, text: string): StudyNote => ({ id, title, kind: "paste", text, createdAt: "" });

describe("findSources", () => {
  const passages = buildPassages(
    [
      note("n1", "Networking week 3", "A subnet mask splits an IP address into network and host bits."),
      note("n2", "Baking", "Yeast makes bread rise."),
    ],
    []
  );

  it("numbers matching passages S1, S2... and keeps which note they came from", () => {
    const sources = findSources("what does a subnet mask do", passages);
    assert.equal(sources.length, 1);
    assert.deepEqual([sources[0].ref, sources[0].docId], ["S1", "n1"]);
  });

  it("reports only the refs the reply cites", () => {
    const sources = findSources("subnet mask ip", passages);
    assert.deepEqual(citedRefs("Per your notes [S1], the mask...", sources).map((s) => s.ref), ["S1"]);
    assert.deepEqual(citedRefs("No citations here.", sources), []);
  });
});

describe("recallExchanges", () => {
  const exchanges: StoredExchange[] = [
    { id: "e1", careerId: "cybersecurity", question: "What is a firewall?", answer: "It filters traffic.", at: "2026-11-01T00:00:00Z" },
    { id: "e2", careerId: "cybersecurity", question: "How do I bake bread?", answer: "Use yeast.", at: "2026-11-02T00:00:00Z" },
  ];

  it("recalls the related past session and skips ones already in this chat", () => {
    assert.equal(recallExchanges("firewall rules", exchanges, new Set())[0]?.question, "What is a firewall?");
    assert.deepEqual(recallExchanges("firewall rules", exchanges, new Set(["e1"])), []);
  });
});

describe("tokenize", () => {
  it("lowercases, drops stopwords and one-letter tokens", () => {
    assert.deepEqual(tokenize("What is a Subnet Mask in CTS 1134?"), ["subnet", "mask", "cts", "1134"]);
  });
});

describe("chunk", () => {
  it("keeps short paragraphs together and splits long text into bounded passages", () => {
    const long = "Sentence about routing tables. ".repeat(80);
    const passages = chunk("n1", "Notes", `Intro paragraph.\n\nSecond paragraph.\n\n${long}`);
    assert.ok(passages.length > 1);
    assert.ok(passages.every((p) => p.text.length <= 900 && p.docId === "n1"));
    assert.match(passages[0].text, /^Intro paragraph\. Second paragraph\./);
  });
});

describe("rank", () => {
  const items = [
    { id: "a", text: "A subnet mask splits an IP address into network and host parts." },
    { id: "b", text: "Recipes for bread need flour, water, salt and yeast." },
    { id: "c", text: "Routers forward packets between networks using routing tables." },
  ];

  it("puts the passage that shares the rare query terms first", () => {
    const hits = rank("how does a subnet mask work", items, (i) => i.text, 3);
    assert.equal(hits[0].item.id, "a");
  });

  it("returns nothing for items that share no terms", () => {
    assert.deepEqual(rank("photosynthesis chlorophyll", items, (i) => i.text, 3), []);
  });

  it("respects the limit", () => {
    assert.equal(rank("network networks ip routing", items, (i) => i.text, 1).length, 1);
  });
});
