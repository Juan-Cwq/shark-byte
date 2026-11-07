import { formatCredits } from "@/lib/format";
import { lookupCourse } from "@/lib/pathways";
import type { CareerId } from "@/lib/types";

export function CourseChip({
  careerId,
  codeOrLabel,
}: {
  careerId: CareerId;
  codeOrLabel: string;
}) {
  const hit = lookupCourse(careerId, codeOrLabel);
  if (!hit) {
    return (
      <span className="inline-flex max-w-full items-center border border-mdc-line bg-mdc-line/40/80 px-2.5 py-1 text-xs text-mdc-muted">
        {codeOrLabel}
      </span>
    );
  }

  const course = hit.title
    ? { code: hit.code, title: hit.title }
    : { code: hit.code, title: null };

  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 border border-mdc-blue/30 bg-white/80 px-2.5 py-1 text-xs">
      <span className="font-semibold text-mdc-blue">{course.code}</span>
      {course.title ? <span className="text-mdc-ink">{course.title}</span> : null}
    </span>
  );
}

export function CourseChipWithCredits({
  careerId,
  code,
  credits,
}: {
  careerId: CareerId;
  code: string;
  credits?: number | string;
}) {
  const hit = lookupCourse(careerId, code);
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 border border-mdc-blue/30 bg-white/80 px-2.5 py-1 text-xs">
      <span className="font-semibold text-mdc-blue">{hit?.code ?? code}</span>
      {hit?.title ? <span className="text-mdc-ink">{hit.title}</span> : null}
      {credits != null ? <span className="text-mdc-muted">{formatCredits(credits)}</span> : null}
    </span>
  );
}
