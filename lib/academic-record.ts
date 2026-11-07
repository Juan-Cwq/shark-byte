// lib/academic-record.ts
// The student's imported record in localStorage, shared live between components on the page.
// Client-only. Lives on this device; clearing site data erases it.

import { useSyncExternalStore } from "react";
import { normalizeRecordCode } from "./record-parse";
import { StoredAcademicRecord, type RecordCourse } from "./types";

const KEY = "cone:academic-record:v1";
const CHANGE_EVENT = "cone:academic-record-change";

let cachedRaw: string | null | undefined;
let cachedRecord: StoredAcademicRecord | null = null;

// useSyncExternalStore needs the same object back until the stored value actually changes.
function getSnapshot(): StoredAcademicRecord | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode): behave as if empty.
  }
  if (raw === cachedRaw) return cachedRecord;
  cachedRaw = raw;
  cachedRecord = null;
  if (raw) {
    try {
      const parsed = StoredAcademicRecord.safeParse(JSON.parse(raw));
      if (parsed.success) cachedRecord = parsed.data;
    } catch {
      // Corrupted JSON: treat as empty.
    }
  }
  return cachedRecord;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useAcademicRecord(): StoredAcademicRecord | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function saveAcademicRecord(courses: RecordCourse[]): void {
  const record: StoredAcademicRecord = { version: 1, savedAt: new Date().toISOString(), courses };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Quota exceeded or storage blocked: the record just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearAcademicRecord(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Map of normalized code ("ENC1101") → course from the record. */
export function recordByCode(record: StoredAcademicRecord | null): Map<string, RecordCourse> {
  return new Map((record?.courses ?? []).map((c) => [normalizeRecordCode(c.code), c]));
}
