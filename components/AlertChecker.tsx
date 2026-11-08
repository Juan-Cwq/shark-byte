"use client";

import { useEffect, useState } from "react";
import { AlertLabelBadge } from "@/components/AlertLabelBadge";
import { OfficialAlertList } from "@/components/OfficialAlertList";
import { SignInLink } from "@/components/SignInLink";
import { loadCachedAlerts, saveCachedAlerts } from "@/lib/alerts-cache";
import { AlertsSnapshot, type VerifyResult } from "@/lib/types";
import { verifyAlert } from "@/lib/verify";

const EXAMPLES = [
  { label: "Official link", text: "NWS Miami forecast and warnings: https://www.weather.gov/mfl/" },
  {
    label: "Relief scam",
    text: "URGENT: FEMA hurricane relief payment of $750 approved! Claim at fema-relief-gov.com and pay the $25 processing fee with a gift card.",
  },
  { label: "Rumor", text: "Mandatory evacuation for Zone A starting tomorrow, see miaminewsdaily.com" },
];

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours} hr ago` : `${Math.round(hours / 24)} days ago`;
}

export function AlertChecker() {
  const [snapshot, setSnapshot] = useState<AlertsSnapshot | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [alertsError, setAlertsError] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainNeedsSignIn, setExplainNeedsSignIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let gotLive = false;

    async function refresh() {
      try {
        const res = await fetch("/api/alerts", { cache: "no-store" });
        const parsed = AlertsSnapshot.safeParse(await res.json());
        if (!res.ok || !parsed.success) throw new Error("bad response");
        if (cancelled) return;
        const servedFromCache = res.headers.get("x-sw-cache") === "1";
        gotLive = true;
        setSnapshot(parsed.data);
        setFromCache(servedFromCache);
        setAlertsError(servedFromCache);
        if (!servedFromCache) void saveCachedAlerts(parsed.data);
      } catch {
        if (!cancelled) setAlertsError(true);
      }
    }

    void loadCachedAlerts().then((cached) => {
      if (cached && !cancelled && !gotLive) {
        setSnapshot(cached);
        setFromCache(true);
      }
    });
    void refresh();
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("online", refresh);
    };
  }, []);

  async function check(text: string) {
    const verdict = verifyAlert(text, snapshot?.alerts ?? null);
    setResult(verdict);
    setExplanation(null);
    setExplainNeedsSignIn(false);
    if (!navigator.onLine) return;

    setExplaining(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verdict),
      });
      if (res.status === 401) {
        setExplainNeedsSignIn(true);
        return;
      }
      const data = (await res.json()) as { explanation?: string | null };
      if (res.ok && typeof data.explanation === "string") setExplanation(data.explanation);
    } catch {
      // Offline or failed: the reasons list below is the explanation.
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) void check(input);
        }}
      >
        <label htmlFor="alert-input" className="block text-sm font-semibold text-mdc-navy">
          Paste an alert, text message, social post or link
        </label>
        <textarea
          id="alert-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="e.g. HURRICANE WARNING for Miami-Dade! Claim your FEMA relief at…"
          className="w-full rounded-md border border-mdc-line bg-white px-3 py-2 text-sm text-mdc-ink focus:border-mdc-blue focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-md bg-mdc-blue px-5 py-2 text-sm font-bold text-white hover:bg-mdc-blue-bright disabled:opacity-50"
          >
            Check alert
          </button>
          <span className="text-xs text-mdc-muted">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setInput(ex.text);
                void check(ex.text);
              }}
              className="rounded-full border border-mdc-line px-3 py-1 text-xs text-mdc-muted hover:border-mdc-blue hover:text-mdc-blue"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </form>

      {result ? (
        <section aria-live="polite" className="space-y-4 rounded-lg border border-mdc-line p-5">
          <AlertLabelBadge label={result.label} />
          {explaining ? (
            <p className="animate-pulse text-sm text-mdc-blue">Writing a plain-language explanation…</p>
          ) : explanation ? (
            <div>
              <p className="text-mdc-ink">{explanation}</p>
              <p className="mt-1 text-xs text-mdc-muted">AI summary of the checks below. The label comes from the rules, not the AI.</p>
            </div>
          ) : explainNeedsSignIn ? (
            <p className="text-sm text-mdc-muted">
              <SignInLink className="font-semibold text-mdc-blue underline underline-offset-2">Sign in</SignInLink> for a
              plain-language AI explanation. The label and checks below work without an account.
            </p>
          ) : null}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-mdc-navy">Why</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mdc-muted">
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-mdc-navy">Active official alerts · Florida</h2>
          <p className="text-xs text-mdc-muted">
            {snapshot ? (
              <>
                Last updated {new Date(snapshot.fetchedAt).toLocaleString()} ({timeAgo(snapshot.fetchedAt)})
                {fromCache ? " · saved copy" : ""}
              </>
            ) : alertsError ? (
              "Offline and no saved alerts yet"
            ) : (
              "Loading from weather.gov…"
            )}
          </p>
        </div>
        {alertsError && snapshot ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Can&apos;t reach the National Weather Service right now. Checks use the saved copy above.
          </p>
        ) : null}
        {snapshot ? <OfficialAlertList alerts={snapshot.alerts} /> : null}
        <p className="text-xs text-mdc-muted">Source: National Weather Service (api.weather.gov).</p>
      </section>
    </div>
  );
}
