"use client";

import { setMyPath, useMyPath } from "@/lib/my-path";
import type { CareerId } from "@/lib/types";

export function MyPathButton({ careerId, title }: { careerId: CareerId; title: string }) {
  const myPath = useMyPath();

  if (myPath === careerId) {
    return (
      <p className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-mdc-blue px-3 py-1 font-semibold text-white">★ Your path</span>
        <a href="#progress" className="font-semibold text-mdc-blue hover:underline">
          Track my progress
        </a>
        <button type="button" onClick={() => setMyPath(null)} className="text-mdc-muted hover:text-mdc-blue hover:underline">
          Remove
        </button>
      </p>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => setMyPath(careerId)}
        className="rounded-full border border-mdc-blue px-4 py-1.5 font-semibold text-mdc-blue hover:bg-mdc-blue hover:text-white"
      >
        Make {title} my path
      </button>
      {myPath ? <span className="text-mdc-muted">Replaces your current pick.</span> : null}
    </div>
  );
}
