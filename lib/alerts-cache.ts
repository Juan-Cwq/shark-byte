// lib/alerts-cache.ts
// Last official alerts snapshot in IndexedDB, so the checker still works offline.
// Client-only: call from effects or event handlers.

import { AlertsSnapshot } from "./types";

const DB_NAME = "cone-alerts";
const STORE = "snapshots";
const KEY = "fl";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }).finally(() => db.close())
  );
}

export async function loadCachedAlerts(): Promise<AlertsSnapshot | null> {
  try {
    const parsed = AlertsSnapshot.safeParse(await run("readonly", (s) => s.get(KEY)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // IndexedDB blocked (private mode) or unavailable
  }
}

export async function saveCachedAlerts(snapshot: AlertsSnapshot): Promise<void> {
  try {
    await run("readwrite", (s) => s.put(snapshot, KEY));
  } catch {
    // Not fatal: the checker just won't have an offline copy.
  }
}
