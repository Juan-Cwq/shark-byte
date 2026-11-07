"use client";

import { recordByCode } from "@/lib/academic-record";
import { normalizeRecordCode } from "@/lib/record-parse";
import type { PathProgressTerm, RecordCourse, StoredAcademicRecord } from "@/lib/types";

type EntryState = "done" | "in_progress" | "remaining" | "slot";

const ICON: Record<EntryState, { mark: string; className: string; label: string }> = {
  done: { mark: "✓", className: "text-emerald-700", label: "Done" },
  in_progress: { mark: "◐", className: "text-amber", label: "In progress" },
  remaining: { mark: "○", className: "text-mdc-muted", label: "Still needed" },
  slot: { mark: "?", className: "text-mdc-blue", label: "Advisor matches your courses to this" },
};

export function PathProgress({
  record,
  terms,
  programLabel,
}: {
  record: StoredAcademicRecord;
  terms: PathProgressTerm[];
  programLabel: string;
}) {
  const byCode = recordByCode(record);

  // Compound entries ("CTS 1134 or CTS 1650", "Social science (AMH 2010/POS 2041)") need any one code.
  function entryState(codes: string[]): { state: EntryState; match?: RecordCourse } {
    if (codes.length === 0) return { state: "slot" };
    const hits = codes.map((c) => byCode.get(c)).filter((c): c is RecordCourse => c != null);
    const done = hits.find((c) => c.status === "completed");
    if (done) return { state: "done", match: done };
    const going = hits.find((c) => c.status === "in_progress");
    if (going) return { state: "in_progress", match: going };
    return { state: "remaining" };
  }

  const states = terms.flatMap((t) => t.entries.map((e) => entryState(e.codes)));
  const required = states.filter((s) => s.state !== "slot").length;
  const done = states.filter((s) => s.state === "done").length;
  const inProgress = states.filter((s) => s.state === "in_progress").length;
  const slots = states.length - required;
  const pct = required ? Math.round((done / required) * 100) : 0;

  const pathCodes = new Set(terms.flatMap((t) => t.entries.flatMap((e) => e.codes)));
  const lowGrades = record.courses.filter((c) => c.note && pathCodes.has(normalizeRecordCode(c.code)));
  const otherCourses = record.courses.filter(
    (c) => c.status === "completed" && !pathCodes.has(normalizeRecordCode(c.code))
  );

  return (
    <div className="mt-5">
      <p className="text-sm text-mdc-muted">{programLabel}</p>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-mdc-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Required courses completed"
      >
        <div className="h-full bg-mdc-blue" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-mdc-ink">
        <span className="font-semibold">
          {done} of {required}
        </span>{" "}
        listed courses done{inProgress ? ` · ${inProgress} in progress` : ""}
        {slots ? ` · ${slots} gen-ed or elective slot${slots === 1 ? "" : "s"} for your advisor to match` : ""}
      </p>

      <ol className="mt-6 grid gap-4 sm:grid-cols-2">
        {terms.map((term, ti) => (
          <li key={term.term} className="border border-mdc-line bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mdc-blue">{term.term}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {term.entries.map((entry, ei) => {
                const { state, match } = entryState(entry.codes);
                const icon = ICON[state];
                return (
                  <li key={`${ti}-${ei}`} className="flex gap-2">
                    <span className={`w-4 shrink-0 font-bold ${icon.className}`} title={icon.label} aria-label={icon.label}>
                      {icon.mark}
                    </span>
                    <span className={state === "done" ? "text-mdc-muted" : "text-mdc-ink"}>
                      {entry.label}
                      {entry.title ? <span className="text-mdc-muted"> {entry.title}</span> : null}
                      {match && entry.codes.length > 1 ? (
                        <span className="text-xs text-mdc-muted"> (you took {match.code})</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {lowGrades.length ? (
        <ul className="mt-6 space-y-1 text-sm text-amber">
          {lowGrades.map((c) => (
            <li key={c.code}>
              {c.code}: {c.note}
            </li>
          ))}
        </ul>
      ) : null}

      {otherCourses.length ? (
        <p className="mt-4 text-sm text-mdc-muted">
          Also completed (may count toward gen-ed or electives; ask an MDC advisor):{" "}
          {otherCourses.map((c) => c.code).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
