"use client";

import Link from "next/link";
import { formatUsd } from "@/lib/format";
import { useMyPath } from "@/lib/my-path";
import { summarizeSwitch } from "@/lib/program-switch";
import { summarizeProgress } from "@/lib/progress";
import type { CareerId, CreditRange, ProgressPlan, StoredAcademicRecord, SwitchPlan } from "@/lib/types";

/** An MDC program a career can switch into (e.g. Applied AI A.S.), compared alongside the careers. */
export interface CompareProgram {
  plan: SwitchPlan;
  viaCareerId: CareerId;
  viaTitle: string;
  switchIndex: number | null; // position in this page's switches; null if planned from another career's page
}

interface Row {
  key: string;
  title: string;
  href: string | null;
  detail: string;
  careerId: CareerId | null;
  carried: number;
  required: number;
  remaining: CreditRange;
  cost: CreditRange;
  unpriced: boolean;
  onPlan: (() => void) | null;
}

const range = (r: CreditRange, fmt: (n: number) => string | number = (n) => n) =>
  r.low === r.high ? fmt(r.low) : `${fmt(r.low)}–${fmt(r.high)}`;

export function CareerCompare({
  plans,
  programs,
  record,
  currentId,
  homeId,
  knownCredits,
  onPlanCareer,
  onPlanSwitch,
}: {
  plans: ProgressPlan[];
  programs: CompareProgram[];
  record: StoredAcademicRecord;
  currentId: CareerId;
  homeId: CareerId; // the student's chosen path, or this page if none
  knownCredits: Record<string, CreditRange>;
  onPlanCareer: (id: CareerId) => void;
  onPlanSwitch: (index: number) => void;
}) {
  const myPath = useMyPath();

  const careerRows: Row[] = plans.map((plan) => {
    const s = summarizeProgress(plan, record);
    return {
      key: plan.careerId,
      title: plan.careerTitle,
      href: plan.careerId === currentId ? null : `/career/${plan.careerId}#progress`,
      detail: plan.programLabel,
      careerId: plan.careerId,
      carried: s.done + s.inProgress,
      required: s.required,
      remaining: s.remaining,
      cost: s.cost,
      unpriced: s.noCreditData.length > 0,
      onPlan: plan.careerId === homeId ? null : () => onPlanCareer(plan.careerId),
    };
  });

  const programRows: Row[] = programs.map(({ plan, viaCareerId, viaTitle, switchIndex }) => {
    const s = summarizeSwitch(plan, record, knownCredits);
    const states = [...s.entries.flat().filter((e) => e.state !== "slot"), ...s.prereqs];
    return {
      key: plan.target.code,
      title: plan.target.name,
      href: `/career/${viaCareerId}#progress`,
      detail: `${plan.target.label} · ${plan.target.credits} credits · switch option from ${viaTitle}`,
      careerId: null,
      carried: states.filter((e) => e.state === "done" || e.state === "in_progress").length,
      required: states.length,
      remaining: s.remaining,
      cost: { low: Math.round(s.cost.low), high: Math.round(s.cost.high) },
      unpriced: s.unknownCredits.length > 0,
      onPlan: switchIndex == null ? null : () => onPlanSwitch(switchIndex),
    };
  });

  const rows = [...careerRows, ...programRows].sort((a, b) => a.remaining.low - b.remaining.low);

  return (
    <div className="mt-5 overflow-x-auto">
      <p className="text-sm text-mdc-muted">
        How your courses carry over if you switch. Each career uses its main MDC program; in-progress courses count
        as covered.{programs.length ? " Related MDC programs you can switch into are listed too." : ""}
      </p>
      <table className="mt-3 w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-mdc-line text-mdc-muted">
            <th className="py-2 pr-4 font-medium">Career or program</th>
            <th className="py-2 pr-4 font-medium">Courses that carry over</th>
            <th className="py-2 pr-4 font-medium">Credits left</th>
            <th className="py-2 font-medium">Est. cost to finish</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const mine = row.careerId != null && row.careerId === myPath;
            return (
              <tr key={row.key} className={`border-b border-mdc-line align-top ${mine ? "bg-mdc-blue/5" : ""}`}>
                <td className="py-2 pr-4">
                  {row.href ? (
                    <Link href={row.href} className="font-semibold text-mdc-blue hover:underline">
                      {row.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-mdc-ink">{row.title} (this page)</span>
                  )}
                  {mine ? (
                    <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-mdc-blue px-2 py-0.5 text-xs font-semibold text-white">★ Your path</span>
                  ) : null}
                  <p className="text-xs text-mdc-muted">{row.detail}</p>
                  {row.onPlan ? (
                    <button
                      type="button"
                      onClick={row.onPlan}
                      className="mt-1 text-xs font-semibold text-mdc-blue hover:underline"
                    >
                      Plan a transfer here →
                    </button>
                  ) : null}
                </td>
                <td className="py-2 pr-4 text-mdc-ink">
                  {row.carried} of {row.required}
                </td>
                <td className="py-2 pr-4 text-mdc-ink">
                  {range(row.remaining)}
                  {row.unpriced ? <span className="text-amber"> *</span> : null}
                </td>
                <td className="py-2 text-mdc-ink">{range(row.cost, formatUsd)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.some((r) => r.unpriced) ? (
        <p className="mt-2 text-xs text-amber">
          * Includes courses our catalog data has no credit value for, so this count is approximate. Ask an MDC
          advisor for an exact count.
        </p>
      ) : null}
    </div>
  );
}
