"use client";

import { useState } from "react";
import { CareerCompare } from "@/components/CareerCompare";
import { FiuTransferCheck } from "@/components/FiuTransferCheck";
import { PathProgress } from "@/components/PathProgress";
import { RecordImport } from "@/components/RecordImport";
import { clearAcademicRecord, requestPlanRemaining, useAcademicRecord } from "@/lib/academic-record";
import type { ProgressPlan } from "@/lib/types";

type View = "path" | "compare";

export function ProgressTracker({ plan, allPlans }: { plan: ProgressPlan; allPlans: ProgressPlan[] }) {
  const record = useAcademicRecord();
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View>("path");
  const [planningFiu, setPlanningFiu] = useState(false);

  const tab = (v: View, label: string) => (
    <button
      type="button"
      onClick={() => setView(v)}
      aria-pressed={view === v}
      className={`px-3 py-1.5 text-sm font-medium ${
        view === v ? "bg-mdc-blue text-white" : "border border-mdc-line text-mdc-muted hover:border-mdc-blue hover:text-mdc-blue"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section id="progress" className="scroll-mt-20 my-10 border border-mdc-blue/40 bg-white/70 p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-mdc-ink">Track my progress</h2>

      {editing ? (
        <RecordImport initial={record?.courses ?? null} onDone={() => setEditing(false)} />
      ) : record ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tab("path", "This path")}
            {tab("compare", "Compare careers")}
            {plan.fiu ? (
              <label className="ml-auto flex items-center gap-2 text-sm text-mdc-ink">
                <input
                  type="checkbox"
                  checked={planningFiu}
                  onChange={(e) => setPlanningFiu(e.target.checked)}
                  className="h-4 w-4 accent-mdc-blue"
                />
                I plan to transfer to FIU
              </label>
            ) : null}
          </div>

          {view === "path" ? (
            <>
              {planningFiu && plan.fiu ? <FiuTransferCheck fiu={plan.fiu} record={record} /> : null}
              <PathProgress record={record} plan={plan} />
            </>
          ) : (
            <CareerCompare plans={allPlans} record={record} currentId={plan.careerId} />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                requestPlanRemaining({ goal: planningFiu && plan.fiu ? `Transfer to FIU for ${plan.fiu.degree}` : null })
              }
              className="rounded-full bg-mdc-blue px-5 py-2 text-sm font-bold text-white hover:bg-mdc-blue-bright"
            >
              Plan what&apos;s left
            </button>
            <span className="text-xs text-mdc-muted">
              Runs Personalize below with your record (in-progress courses count as done).
            </span>
          </div>

          <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mdc-muted">
            <span>
              {record.courses.length} courses saved on this device · updated{" "}
              {new Date(record.savedAt).toLocaleDateString()}
            </span>
            <button type="button" onClick={() => setEditing(true)} className="text-mdc-blue hover:underline">
              Edit
            </button>
            <button type="button" onClick={clearAcademicRecord} className="text-mdc-blue hover:underline">
              Clear
            </button>
          </p>
          <p className="mt-2 text-xs text-mdc-muted">
            A planning aid, not a degree audit. Confirm with an MDC advisor before registering.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-mdc-muted">
            Upload or paste your MAP or unofficial transcript to see which courses on this path you&apos;ve finished,
            what&apos;s left and what it may cost, how your courses carry over to other careers, and what you need to
            transfer to FIU.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 rounded-full bg-mdc-blue px-5 py-2 text-sm font-bold text-white hover:bg-mdc-blue-bright"
          >
            Import my MAP
          </button>
        </>
      )}
    </section>
  );
}
