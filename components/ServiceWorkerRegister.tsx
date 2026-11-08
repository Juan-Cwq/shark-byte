"use client";

import { useEffect } from "react";

// Dev mode is skipped: a service worker caching HMR bundles makes local development confusing.
export function ServiceWorkerRegister({ precacheUrls }: { precacheUrls: string[] }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => reg.active?.postMessage({ type: "PRECACHE", urls: precacheUrls }))
      .catch(() => undefined);
  }, [precacheUrls]);
  return null;
}
