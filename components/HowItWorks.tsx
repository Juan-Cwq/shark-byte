"use client";

import { useState } from "react";

export function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-semibold underline-offset-4 hover:underline"
      >
        How it works
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-mdc-navy/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="how-title" className="font-display text-2xl font-bold text-mdc-navy">
              How it works
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-mdc-muted">
              <li>
                <strong className="text-mdc-ink">Pathway data</strong> — courses, costs, transfer rules, and pay come
                from curated MDC catalog JSON, not from an AI guess.
              </li>
              <li>
                <strong className="text-mdc-ink">3-agent swarm</strong> — Profile Interpreter → Pathway Advisor →
                Plain-Language Synthesizer personalizes the path to your situation.
              </li>
              <li>
                <strong className="text-mdc-ink">Verified plan</strong> — every course code is checked against the MDC
                catalog data before you see it.
              </li>
            </ol>
            <button
              type="button"
              className="mt-6 w-full rounded-full bg-mdc-blue px-4 py-3 font-semibold text-white hover:bg-mdc-blue-bright"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
