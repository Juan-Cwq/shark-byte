"use client";

import { useState } from "react";
import { extractPdfText } from "@/lib/pdf-text";
import { addNote, deleteNote, NOTES_CHAR_BUDGET, notesSize } from "@/lib/study-notes";
import type { StudyNote } from "@/lib/types";

const words = (chars: number) => `~${Math.max(1, Math.round(chars / 6)).toLocaleString()} words`;

export function StudyNotesPanel({ notes, onChange }: { notes: StudyNote[]; onChange: (notes: StudyNote[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  function save(input: Parameters<typeof addNote>[0]): boolean {
    const result = addNote(input);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setError(null);
    onChange(result.notes);
    return true;
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        const content = isPdf ? await extractPdfText(file) : await file.text();
        if (!save({ title: file.name.replace(/\.(pdf|txt|md)$/i, ""), kind: isPdf ? "pdf" : "text", text: content })) break;
      }
    } catch (err) {
      console.error("Note upload failed", err);
      setError("Couldn't read that file. Try a text-based PDF, a .txt or .md file, or paste the text instead.");
    } finally {
      setBusy(false);
    }
  }

  const used = notesSize(notes);

  return (
    <div className="space-y-4 text-sm">
      <p className="text-mdc-muted">
        Add your class notes, slides or study guides. Study buddy answers from them and shows which note it used. Notes
        stay in this browser; only the few passages that match your question are sent to the AI.
      </p>

      <div className="flex flex-wrap gap-2">
        <label
          className={`cursor-pointer rounded-md bg-mdc-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-mdc-blue-bright ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {busy ? "Reading…" : "Upload PDF or text"}
          <input
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            multiple
            className="sr-only"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPasting((p) => !p)}
          className="rounded-md border border-mdc-line px-3 py-1.5 text-xs font-semibold text-mdc-muted hover:border-mdc-blue hover:text-mdc-blue"
        >
          {pasting ? "Cancel" : "Paste text"}
        </button>
      </div>

      {pasting ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (save({ title, kind: "paste", text })) {
              setTitle("");
              setText("");
              setPasting(false);
            }
          }}
        >
          <input
            className="w-full border border-mdc-line px-3 py-2 text-sm text-mdc-ink"
            placeholder="Title (e.g. CTS 1134 week 3)"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="h-40 w-full border border-mdc-line px-3 py-2 text-sm text-mdc-ink"
            placeholder="Paste your notes here"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="rounded-md bg-mdc-blue px-3 py-1.5 text-xs font-bold text-white">
            Save note
          </button>
        </form>
      ) : null}

      {error ? <p className="text-amber">{error}</p> : null}

      {notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-mdc-line px-3 py-4 text-mdc-muted">
          No notes yet. Upload one and ask a question about it.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 rounded-md border border-mdc-line px-3 py-2.5">
              <span>
                <span className="block font-semibold text-mdc-ink">{n.title}</span>
                <span className="text-xs text-mdc-muted">
                  {n.kind === "pdf" ? "PDF" : n.kind === "paste" ? "Pasted" : "Text"} · {words(n.text.length)} · added{" "}
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onChange(deleteNote(n.id))}
                className="shrink-0 text-xs font-semibold text-mdc-muted hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-mdc-muted">
        {Math.min(100, Math.round((used / NOTES_CHAR_BUDGET) * 100))}% of on-device note space used.
      </p>
    </div>
  );
}
