"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CareerCompare, type CompareProgram } from "@/components/CareerCompare";
import { FiuTransferCheck } from "@/components/FiuTransferCheck";
import { PathProgress } from "@/components/PathProgress";
import { PlanDrawer } from "@/components/PlanDrawer";
import { ProgramSwitches } from "@/components/ProgramSwitches";
import { RecordImport } from "@/components/RecordImport";
import { clearAcademicRecord, requestPlanRemaining, useAcademicRecord } from "@/lib/academic-record";
import type { PlanSource } from "@/lib/finish-plan";
import { useMyPath } from "@/lib/my-path";
import type { CareerId, ProgressPlan } from "@/lib/types";

type View = "path" | "compare" | "switch";

export function ProgressTracker({ plan, allPlans }: { plan: ProgressPlan; allPlans: ProgressPlan[] }) {
  const record = useAcademicRecord();
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View>("path");
  const [planningFiu, setPlanningFiu] = useState(false);
  const [switchIndex, setSwitchIndex] = useState(0);
  const [drawer, setDrawer] = useState<{ plan: ProgressPlan; source: PlanSource } | null>(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const myPath = useMyPath();
  const myPathPlan = myPath && myPath !== plan.careerId ? allPlans.find((p) => p.careerId === myPath) : undefined;
  // Where the student is coming from: their chosen path, or this page if they haven't picked one.
  const home = myPathPlan ?? plan;
  const shortLabel = (p: ProgressPlan) => p.programLabel.split(" · ").slice(0, 2).join(" ");
  const planTransfer = (id: CareerId) => {
    const target = allPlans.find((p) => p.careerId === id);
    if (target) setDrawer({ plan: target, source: { kind: "path", fiu: false } });
  };

  // Programs a student starts from scratch (A.S.) compare like careers; bachelor's switches need a prior degree.
  const comparePrograms = useMemo(() => {
    const byCode = new Map<string, CompareProgram>();
    for (const p of allPlans) {
      for (const sw of p.switches) {
        if (sw.target.basis !== "full_program" || byCode.has(sw.target.code)) continue;
        const index = plan.switches.findIndex((s) => s.target.code === sw.target.code);
        byCode.set(sw.target.code, {
          plan: sw,
          viaCareerId: p.careerId,
          viaTitle: p.careerTitle,
          switchIndex: index >= 0 ? index : null,
        });
      }
    }
    return [...byCode.values()];
  }, [allPlans, plan.switches]);

  const onSwitch = view === "switch" && plan.switches.length > 0;
  const openPlan = () =>
    setDrawer({
      plan,
      source: onSwitch ? { kind: "switch", index: switchIndex } : { kind: "path", fiu: planningFiu && plan.fiu != null },
    });

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
      {myPathPlan ? (
        <p className="mt-2 text-sm text-mdc-muted">
          Your path is{" "}
          <Link href={`/career/${myPathPlan.careerId}#progress`} className="font-semibold text-mdc-blue hover:underline">
            {myPathPlan.careerTitle}
          </Link>
          . This page shows how your courses would fit {plan.careerTitle} instead.
        </p>
      ) : null}

      {editing ? (
        <RecordImport initial={record?.courses ?? null} onDone={() => setEditing(false)} />
      ) : record ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tab("path", "This path")}
            {tab("compare", "Compare careers")}
            {plan.switches.length ? tab("switch", "Switch programs") : null}
            {plan.fiu && view === "path" ? (
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
          ) : view === "switch" ? (
            <ProgramSwitches
              switches={plan.switches}
              record={record}
              knownCredits={plan.knownCredits}
              selected={switchIndex}
              onSelect={setSwitchIndex}
            />
          ) : (
            <CareerCompare
              plans={allPlans}
              programs={comparePrograms}
              record={record}
              currentId={plan.careerId}
              homeId={home.careerId}
              knownCredits={plan.knownCredits}
              onPlanCareer={planTransfer}
              onPlanSwitch={(index) => setDrawer({ plan, source: { kind: "switch", index } })}
            />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={openPlan}
              className="rounded-full bg-mdc-blue px-5 py-2 text-sm font-bold text-white hover:bg-mdc-blue-bright"
            >
              Plan what&apos;s left
            </button>
            <span className="text-xs text-mdc-muted">
              {onSwitch
                ? `Full plan for: ${plan.switches[switchIndex]?.label}`
                : `Full plan for ${myPathPlan ? `switching from your ${shortLabel(home)} to the` : "your"} ${shortLabel(plan)}${
                    planningFiu && plan.fiu ? " plus FIU prerequisites" : ""
                  }`}
              : {onSwitch || myPathPlan || (planningFiu && plan.fiu) ? "what carries over" : "what you've done"}, what&apos;s
              left, and a semester-by-semester schedule.
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

          {drawer ? (
            <PlanDrawer
              plan={drawer.plan}
              record={record}
              source={drawer.source}
              transferFrom={
                drawer.source.kind === "path" && drawer.plan.careerId !== home.careerId ? shortLabel(home) : null
              }
              onClose={closeDrawer}
              onAskAi={
                drawer.source.kind === "path" && drawer.plan.careerId === plan.careerId
                  ? () => {
                      const fiu = drawer.source.kind === "path" && drawer.source.fiu && plan.fiu;
                      setDrawer(null);
                      requestPlanRemaining({ goal: fiu ? `Transfer to FIU for ${fiu.degree}` : null });
                    }
                  : null
              }
            />
          ) : null}
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
