"use client";

import { useMyPath } from "@/lib/my-path";
import type { CareerId } from "@/lib/types";

export function MyPathBadge({ careerId }: { careerId: CareerId }) {
  if (useMyPath() !== careerId) return null;
  return (
    <span className="relative mb-2 self-start rounded-full bg-mdc-blue px-2.5 py-0.5 text-xs font-semibold text-white">
      ★ Your path
    </span>
  );
}
