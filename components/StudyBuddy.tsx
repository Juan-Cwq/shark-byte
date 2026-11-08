"use client";

import { useRef, useState } from "react";
import { LearnerMemoryView } from "@/components/LearnerMemoryView";
import { SignInLink } from "@/components/SignInLink";
import { SavedStudyList } from "@/components/SavedStudyList";
import { TutorMessage } from "@/components/TutorMessage";
import {
  addArtifact,
  clearMemory,
  deleteArtifact,
  loadArtifacts,
  loadProfile,
  saveProfile,
} from "@/lib/learner-memory";
import {
  LearnerProfileFields,
  type CareerId,
  type ChatMessage,
  type StoredLearnerProfile,
  type StudyArtifact,
} from "@/lib/types";

type Tab = "chat" | "saved" | "memory";

// Summarize into memory every few exchanges, and whenever the panel closes.
const SYNC_EVERY_MESSAGES = 8;

function toFields(profile: StoredLearnerProfile | null): LearnerProfileFields {
  return LearnerProfileFields.parse(profile ?? {});
}

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
  const [tab, setTab] = useState<Tab>("chat");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [profile, setProfile] = useState<StoredLearnerProfile | null>(null);
  const [artifacts, setArtifacts] = useState<StudyArtifact[]>([]);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const syncedUpTo = useRef(0);
  const syncing = useRef(false);

  function openPanel() {
    setProfile(loadProfile());
    setArtifacts(loadArtifacts());
    setOpen(true);
  }

  async function syncMemory(messages: ChatMessage[]) {
    const fresh = messages.slice(syncedUpTo.current);
    if (syncing.current || fresh.length < 2) return;
    syncing.current = true;
    const end = messages.length;
    try {
      const current = loadProfile();
      const res = await fetch("/api/tutor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerId, profile: toFields(current), history: fresh.slice(-40) }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { profile?: unknown };
      const parsed = LearnerProfileFields.safeParse(data.profile);
      if (!parsed.success) return;
      setProfile(saveProfile(parsed.data, loadProfile()?.questionsAsked ?? 0));
      syncedUpTo.current = end;
    } catch {
      // Memory is best-effort; the chat keeps working without it.
    } finally {
      syncing.current = false;
    }
  }

  function closePanel() {
    setOpen(false);
    void syncMemory(history);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setNeedsSignIn(false);
    setLoading(true);
    setTab("chat");
    const nextHistory = [...history, { role: "user" as const, content: trimmed }];
    setHistory(nextHistory);
    setQuestion("");

    const memory = loadProfile();
    const questionsAsked = (memory?.questionsAsked ?? 0) + 1;
    setProfile(saveProfile(toFields(memory), questionsAsked));

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerId,
          currentCourseCodes: starterCourseCodes,
          history: nextHistory.slice(0, -1).slice(-10),
          question: trimmed,
          profile: memory ? toFields(memory) : undefined,
          questionsAsked: memory?.questionsAsked,
        }),
      });
      if (res.status === 401) {
        setHistory(history);
        setQuestion(trimmed);
        setNeedsSignIn(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tutor unavailable");
      const withReply: ChatMessage[] = [...nextHistory, { role: "assistant", content: data.reply }];
      setHistory(withReply);
      if (withReply.length - syncedUpTo.current >= SYNC_EVERY_MESSAGES) void syncMemory(withReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor unavailable");
    } finally {
      setLoading(false);
    }
  }

  function saveReply(index: number) {
    const reply = history[index];
    const asked = history
      .slice(0, index)
      .findLast((m) => m.role === "user")
      ?.content.trim();
    const title = asked ? (asked.length > 80 ? `${asked.slice(0, 77)}…` : asked) : "Study note";
    setArtifacts(addArtifact({ careerId, title, content: reply.content.slice(0, 6000) }));
    setSavedIndexes((s) => new Set(s).add(index));
  }

  function resetMemory() {
    clearMemory();
    setProfile(null);
    setArtifacts([]);
    setSavedIndexes(new Set());
    syncedUpTo.current = history.length;
  }

  const lastTopic = profile?.topicsCovered[0];
  const tabs: { id: Tab; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "saved", label: `Saved${artifacts.length ? ` (${artifacts.length})` : ""}` },
    { id: "memory", label: "Memory" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-14 right-4 z-40 rounded-full bg-mdc-blue px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-mdc-blue-bright sm:bottom-16"
      >
        Study buddy
      </button>
      {open ? (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-mdc-line bg-white shadow-2xl">
          <header className="border-b border-mdc-line px-4 pt-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-mdc-navy">Study buddy</h2>
              <button type="button" className="text-sm text-mdc-muted hover:text-mdc-blue" onClick={closePanel}>
                Close
              </button>
            </div>
            <nav className="mt-2 flex gap-5 text-sm" aria-label="Study buddy sections">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={`-mb-px border-b-2 pb-2 font-semibold ${
                    tab === t.id
                      ? "border-mdc-blue text-mdc-navy"
                      : "border-transparent text-mdc-muted hover:text-mdc-blue"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </header>

          {tab === "chat" ? (
            <>
              <div className="flex flex-wrap gap-2 border-b border-mdc-line px-4 py-3">
                {starterChips.map((c) => (
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
                  <p className="text-sm text-mdc-muted">
                    {lastTopic
                      ? `Welcome back! Last time we worked on "${lastTopic}". Pick up there, or ask something new.`
                      : "Ask about a concept from your first-term courses. I'll hint, not hand over answers."}
                  </p>
                ) : null}
                {history.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="ml-auto max-w-[90%] bg-mdc-blue/20 px-3 py-2 text-sm text-mdc-ink">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="max-w-[90%]">
                      <div className="bg-white px-3 py-2 text-sm text-mdc-muted">
                        <TutorMessage content={m.content} />
                      </div>
                      <button
                        type="button"
                        disabled={savedIndexes.has(i)}
                        onClick={() => saveReply(i)}
                        className="ml-3 text-xs font-semibold text-mdc-blue hover:text-mdc-navy disabled:text-mdc-muted"
                      >
                        {savedIndexes.has(i) ? "Saved" : "Save"}
                      </button>
                    </div>
                  )
                )}
                {loading ? <p className="animate-pulse text-sm text-mdc-blue">Thinking…</p> : null}
                {error ? <p className="text-sm text-mdc-blue">{error}</p> : null}
                {needsSignIn ? (
                  <p className="text-sm text-mdc-ink">
                    <SignInLink className="font-semibold text-mdc-blue underline underline-offset-2">Sign in</SignInLink>{" "}
                    to chat with your Study Buddy. Your saved notes stay on this device.
                  </p>
                ) : null}
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
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {tab === "saved" ? (
                <SavedStudyList artifacts={artifacts} onDelete={(id) => setArtifacts(deleteArtifact(id))} />
              ) : (
                <LearnerMemoryView profile={profile} onReset={resetMemory} />
              )}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
