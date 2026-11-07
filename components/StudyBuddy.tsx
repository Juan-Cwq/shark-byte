"use client";

import { useState } from "react";
import type { CareerId, ChatMessage } from "@/lib/types";

export function StudyBuddy({
  careerId,
  starterCourseCodes,
  starterChips,
}: {
  careerId: CareerId;
  starterCourseCodes: string[];
  starterChips: { code: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chips = starterChips;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLoading(true);
    const nextHistory = [...history, { role: "user" as const, content: trimmed }];
    setHistory(nextHistory);
    setQuestion("");
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerId,
          currentCourseCodes: starterCourseCodes,
          history: nextHistory.slice(0, -1).slice(-10),
          question: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tutor unavailable");
      setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-14 right-4 z-40 rounded-full bg-mdc-blue px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-mdc-blue-bright sm:bottom-16"
      >
        Study buddy
      </button>
      {open ? (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-mdc-line bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-mdc-line px-4 py-3">
            <h2 className="font-display text-lg font-bold text-mdc-ink">Study buddy</h2>
            <button type="button" className="text-mdc-muted hover:text-mdc-blue" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <div className="flex flex-wrap gap-2 border-b border-mdc-line px-4 py-3">
            {chips.map((c) => (
              <button
                key={c.code}
                type="button"
                className="border border-mdc-line px-2 py-1 text-left text-xs text-mdc-muted hover:border-mdc-blue hover:text-mdc-blue"
                onClick={() => send(c.label)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {history.length === 0 ? (
              <p className="text-sm text-mdc-muted">Ask about a concept from your first-term courses. I&apos;ll hint, not hand over answers.</p>
            ) : null}
            {history.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[90%] px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-auto bg-mdc-blue/20 text-mdc-ink" : "bg-white text-mdc-muted"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading ? <p className="text-sm text-mdc-blue animate-pulse">Thinking…</p> : null}
            {error ? <p className="text-sm text-mdc-blue">{error}</p> : null}
          </div>
          <form
            className="flex gap-2 border-t border-mdc-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(question);
            }}
          >
            <input
              className="flex-1 border border-mdc-line bg-white px-3 py-2 text-sm text-mdc-ink"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a study question…"
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-mdc-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
