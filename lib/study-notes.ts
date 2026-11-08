// lib/study-notes.ts
// The student's uploaded notes in localStorage. Client-only: call from event handlers, not during render.
// Notes live on this device only; clearing site data erases them.

import { z } from "zod";
import { StudyNote } from "./types";

const NOTES_KEY = "cone:study-notes:v1";
const MAX_NOTES = 30;
// localStorage allows ~5 MB per site (UTF-16), shared with the record and memory; leave room for those.
export const NOTES_CHAR_BUDGET = 1_500_000;
export const NOTE_MAX_CHARS = 200_000;

export function loadNotes(): StudyNote[] {
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = z.array(StudyNote).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function notesSize(notes: StudyNote[]): number {
  return notes.reduce((n, note) => n + note.text.length, 0);
}

export type AddNoteResult = { ok: true; notes: StudyNote[] } | { ok: false; error: string };

export function addNote(input: { title: string; kind: StudyNote["kind"]; text: string }): AddNoteResult {
  const text = input.text.replace(/\r\n?/g, "\n").trim();
  if (!text) return { ok: false, error: "That file has no readable text." };
  if (text.length > NOTE_MAX_CHARS) {
    return { ok: false, error: "That note is too long to keep on this device. Split it into smaller files." };
  }
  const current = loadNotes();
  if (current.length >= MAX_NOTES) return { ok: false, error: `You can keep up to ${MAX_NOTES} notes. Delete one first.` };
  if (notesSize(current) + text.length > NOTES_CHAR_BUDGET) {
    return { ok: false, error: "Your notes are over this device's storage limit. Delete some notes first." };
  }
  const note: StudyNote = {
    id: crypto.randomUUID(),
    title: input.title.trim().slice(0, 120) || "Untitled note",
    kind: input.kind,
    text,
    createdAt: new Date().toISOString(),
  };
  const next = [note, ...current];
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, error: "This browser couldn't store the note (storage full or blocked)." };
  }
  return { ok: true, notes: next };
}

export function deleteNote(id: string): StudyNote[] {
  const next = loadNotes().filter((n) => n.id !== id);
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: nothing to update.
  }
  return next;
}
