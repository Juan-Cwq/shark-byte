// lib/my-path.ts
// The career the student picked as their own, in localStorage, shared live between components.
// Client-only. Lives on this device; clearing site data erases it.

import { useSyncExternalStore } from "react";
import { CareerId } from "./types";

const KEY = "cone:my-path:v1";
const CHANGE_EVENT = "cone:my-path-change";

function getSnapshot(): CareerId | null {
  try {
    const parsed = CareerId.safeParse(window.localStorage.getItem(KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    // Storage blocked (private mode): behave as if nothing is picked.
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useMyPath(): CareerId | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function setMyPath(id: CareerId | null): void {
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
