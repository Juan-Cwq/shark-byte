"use client";

import type { StoredLearnerProfile } from "@/lib/types";

const SECTIONS = [
  { key: "goals", label: "Your goals" },
  { key: "strengths", label: "What you're good at" },
  { key: "struggles", label: "What we're working on" },
  { key: "topicsCovered", label: "Topics we've covered" },
] as const;

export function LearnerMemoryView({
  profile,
  onReset,
}: {
  profile: StoredLearnerProfile | null;
  onReset: () => void;
}) {
  const isEmpty =
    !profile || (!profile.learningStyle && SECTIONS.every((s) => profile[s.key].length === 0));

  return (
    <div className="space-y-5 text-sm">
      <p className="text-mdc-muted">
        Study buddy learns how you study as you chat. This memory is kept in this browser only and is never saved on
        our servers.
      </p>

      {isEmpty ? (
        <p className="rounded-md border border-dashed border-mdc-line px-3 py-4 text-mdc-muted">
          Nothing yet. Chat for a few questions and I&apos;ll start remembering what helps you.
        </p>
      ) : (
        <>
          {profile.learningStyle ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-mdc-navy">How you like to learn</h3>
              <p className="mt-1 text-mdc-ink">{profile.learningStyle}</p>
            </section>
          ) : null}
          {SECTIONS.map(({ key, label }) =>
            profile[key].length > 0 ? (
              <section key={key}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-mdc-navy">{label}</h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile[key].map((item) => (
                    <li key={item} className="rounded-full bg-mdc-blue/10 px-2.5 py-0.5 text-xs text-mdc-ink">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          )}
          <p className="text-xs text-mdc-muted">
            {profile.questionsAsked} questions asked · updated {new Date(profile.updatedAt).toLocaleDateString()}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Erase everything study buddy remembers, including saved notes?")) onReset();
        }}
        className="rounded-md border border-mdc-line px-3 py-1.5 text-xs font-semibold text-mdc-muted hover:border-red-300 hover:text-red-700"
      >
        Reset memory
      </button>
    </div>
  );
}
