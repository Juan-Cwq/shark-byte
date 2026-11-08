"use client";

import Link from "next/link";
import { useAcademicRecord } from "@/lib/academic-record";
import { useMyPath } from "@/lib/my-path";
import type { CareerId } from "@/lib/types";

export function MyPathBanner({ titles }: { titles: Record<CareerId, string> }) {
  const myPath = useMyPath();
  const record = useAcademicRecord();

  if (!myPath) {
    return (
      <p className="mt-4 text-sm text-mdc-muted">
        Open a career and choose <span className="font-semibold text-mdc-ink">Make it my path</span>, then import your
        MAP or transcript to track your progress.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-mdc-blue/40 bg-white px-4 py-3 text-sm">
      <span className="text-mdc-ink">
        Your path: <span className="font-semibold">{titles[myPath]}</span>
      </span>
      <Link href={`/career/${myPath}#progress`} className="font-semibold text-mdc-blue hover:underline">
        {record ? "Track my progress →" : "Import my MAP or transcript →"}
      </Link>
    </div>
  );
}
