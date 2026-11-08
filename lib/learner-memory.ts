// lib/learner-memory.ts
// Study buddy memory in the browser's localStorage. Client-only: call from event handlers, not during render.
// Memory lives on this device only; clearing site data erases it.

import { z } from "zod";
import { StoredExchange, StoredLearnerProfile, StudyArtifact, type LearnerProfileFields } from "./types";

const PROFILE_KEY = "cone:learner-profile:v1";
const ARTIFACTS_KEY = "cone:study-artifacts:v1";
const MAX_ARTIFACTS = 50;
const EXCHANGES_KEY = "cone:study-exchanges:v1";
const MAX_EXCHANGES = 150;

function read<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    window.localStorage.removeItem(key);
  } catch {
    // Storage blocked (private mode) or corrupted JSON: behave as if empty.
  }
  return null;
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked: memory just won't persist.
  }
}

export function loadProfile(): StoredLearnerProfile | null {
  return read(PROFILE_KEY, StoredLearnerProfile);
}

export function saveProfile(fields: LearnerProfileFields, questionsAsked: number): StoredLearnerProfile {
  const stored: StoredLearnerProfile = {
    ...fields,
    version: 1,
    questionsAsked,
    updatedAt: new Date().toISOString(),
  };
  write(PROFILE_KEY, stored);
  return stored;
}

export function loadArtifacts(): StudyArtifact[] {
  return read(ARTIFACTS_KEY, z.array(StudyArtifact)) ?? [];
}

export function addArtifact(artifact: Omit<StudyArtifact, "id" | "createdAt">): StudyArtifact[] {
  const next = [
    { ...artifact, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ...loadArtifacts(),
  ].slice(0, MAX_ARTIFACTS);
  write(ARTIFACTS_KEY, next);
  return next;
}

export function deleteArtifact(id: string): StudyArtifact[] {
  const next = loadArtifacts().filter((a) => a.id !== id);
  write(ARTIFACTS_KEY, next);
  return next;
}

export function loadExchanges(): StoredExchange[] {
  return read(EXCHANGES_KEY, z.array(StoredExchange)) ?? [];
}

export function addExchange(exchange: Omit<StoredExchange, "id" | "at">): StoredExchange {
  const stored: StoredExchange = {
    ...exchange,
    question: exchange.question.slice(0, 4000),
    answer: exchange.answer.slice(0, 4000),
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  write(EXCHANGES_KEY, [stored, ...loadExchanges()].slice(0, MAX_EXCHANGES));
  return stored;
}

export function deleteExchange(id: string): StoredExchange[] {
  const next = loadExchanges().filter((e) => e.id !== id);
  write(EXCHANGES_KEY, next);
  return next;
}

export function clearMemory(): void {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(ARTIFACTS_KEY);
    window.localStorage.removeItem(EXCHANGES_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
