"use client";

import type { StoredExchange } from "@/lib/types";

export function RememberedSessions({
  exchanges,
  onDelete,
}: {
  exchanges: StoredExchange[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-mdc-navy">
        Past questions I can recall ({exchanges.length})
      </h3>
      {exchanges.length === 0 ? (
        <p className="mt-1 text-mdc-muted">None yet. When you ask something related later, I&apos;ll build on these.</p>
      ) : (
        <ul className="mt-1.5 max-h-64 space-y-1 overflow-y-auto">
          {exchanges.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 border-b border-mdc-line/60 py-1.5">
              <span className="text-mdc-ink">
                {e.question.length > 100 ? `${e.question.slice(0, 97)}…` : e.question}
                <span className="block text-xs text-mdc-muted">{new Date(e.at).toLocaleDateString()}</span>
              </span>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                className="shrink-0 text-xs font-semibold text-mdc-muted hover:text-red-700"
              >
                Forget
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
