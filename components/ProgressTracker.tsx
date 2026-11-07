"use client";

import { useState } from "react";
import { PathProgress } from "@/components/PathProgress";
import { RecordImport } from "@/components/RecordImport";
import { clearAcademicRecord, useAcademicRecord } from "@/lib/academic-record";
import type { PathProgressTerm } from "@/lib/types";

export function ProgressTracker({ terms, programLabel }: { terms: PathProgressTerm[]; programLabel: string }) {
  const record = useAcademicRecord();
  const [editing, setEditing] = useState(false);

  return (
    <section id="progress" className="scroll-mt-20 my-10 border border-mdc-blue/40 bg-white/70 p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold text-mdc-ink">Track my progress</h2>

      {editing ? (
        <RecordImport initial={record?.courses ?? null} onDone={() => setEditing(false)} />
      ) : record ? (
        <>
          <PathProgress record={record} terms={terms} programLabel={programLabel} />
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
            Paste your MAP or unofficial transcript to see which courses on this path you&apos;ve finished and
            what&apos;s left. Your completed courses also fill in the personalized plan below.
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
