"use client";

import type { CitedSource } from "@/lib/study-context";

export function NoteCitations({ sources, recalled }: { sources: CitedSource[]; recalled: number }) {
  if (!sources.length && !recalled) return null;
  return (
    <div className="ml-3 mt-1 space-y-1 text-xs text-mdc-muted">
      {sources.length ? (
        <details>
          <summary className="cursor-pointer font-semibold text-mdc-blue">
            From your notes: {sources.map((s) => `[${s.ref}] ${s.title}`).join(" · ")}
          </summary>
          <ul className="mt-1 space-y-2 border-l-2 border-mdc-blue/30 pl-2">
            {sources.map((s) => (
              <li key={s.ref}>
                <span className="font-semibold text-mdc-ink">
                  [{s.ref}] {s.title}
                </span>
                <p className="mt-0.5 whitespace-pre-line">{s.text}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {recalled ? <p>Remembered {recalled === 1 ? "an earlier session" : `${recalled} earlier sessions`} on this topic.</p> : null}
    </div>
  );
}
