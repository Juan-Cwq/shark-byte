// lib/study-context.ts
// Pure, browser-safe: picks which note passages and past sessions go with a tutor question.

import { chunk, rank, type Passage } from "./retrieval";
import type { NoteSource, RecalledExchange, StoredExchange, StudyArtifact, StudyNote } from "./types";

const MAX_SOURCES = 4;
const MAX_RECALLED = 2;
// Weak matches (a shared common word) only add noise to the prompt.
const MIN_RELATIVE_SCORE = 0.35;
const MIN_SCORE = 0.5;

export interface CitedSource extends NoteSource {
  docId: string;
}

export function buildPassages(notes: StudyNote[], artifacts: StudyArtifact[]): Passage[] {
  return [
    ...notes.flatMap((n) => chunk(n.id, n.title, n.text)),
    ...artifacts.flatMap((a) => chunk(a.id, `Saved answer: ${a.title}`, a.content)),
  ];
}

function strong<T>(hits: { item: T; score: number }[]): T[] {
  const top = hits[0]?.score ?? 0;
  return hits.filter((h) => h.score >= MIN_SCORE && h.score >= top * MIN_RELATIVE_SCORE).map((h) => h.item);
}

export function findSources(query: string, passages: Passage[]): CitedSource[] {
  return strong(rank(query, passages, (p) => `${p.title} ${p.text}`, MAX_SOURCES)).map((p, i) => ({
    ref: `S${i + 1}`,
    docId: p.docId,
    title: p.title.slice(0, 120),
    text: p.text.slice(0, 1500),
  }));
}

/** Related exchanges from earlier sessions, skipping ones already in the current conversation. */
export function recallExchanges(query: string, exchanges: StoredExchange[], skip: Set<string>): RecalledExchange[] {
  const pool = exchanges.filter((e) => !skip.has(e.id));
  return strong(rank(query, pool, (e) => `${e.question} ${e.question} ${e.answer}`, MAX_RECALLED)).map((e) => ({
    question: e.question.slice(0, 500),
    answer: e.answer.slice(0, 1200),
    at: e.at.slice(0, 10),
  }));
}

/** Refs like [S2] the tutor actually cited, in the order of the sources list. */
export function citedRefs(reply: string, sources: CitedSource[]): CitedSource[] {
  const used = new Set(reply.match(/\[S\d{1,2}\]/g)?.map((m) => m.slice(1, -1)) ?? []);
  return sources.filter((s) => used.has(s.ref));
}
