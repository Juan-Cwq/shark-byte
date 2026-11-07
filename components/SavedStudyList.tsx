"use client";

import type { StudyArtifact } from "@/lib/types";

export function SavedStudyList({
  artifacts,
  onDelete,
}: {
  artifacts: StudyArtifact[];
  onDelete: (id: string) => void;
}) {
  if (artifacts.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-mdc-line px-3 py-4 text-sm text-mdc-muted">
        No saved notes yet. Tap &ldquo;Save&rdquo; under any explanation to keep it here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {artifacts.map((a) => (
        <li key={a.id} className="rounded-md border border-mdc-line">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5">
              <span className="text-sm font-semibold text-mdc-ink">{a.title}</span>
              <span className="shrink-0 text-xs text-mdc-muted">{new Date(a.createdAt).toLocaleDateString()}</span>
            </summary>
            <div className="border-t border-mdc-line px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm text-mdc-muted">{a.content}</p>
              <button
                type="button"
                onClick={() => onDelete(a.id)}
                className="mt-2 text-xs font-semibold text-mdc-muted hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
