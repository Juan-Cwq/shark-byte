import type { VerifyLabel } from "@/lib/types";

const STYLES: Record<VerifyLabel, { text: string; className: string; icon: string }> = {
  verified: { text: "Verified", className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: "✓" },
  suspicious: { text: "Suspicious", className: "border-red-300 bg-red-50 text-red-800", icon: "!" },
  unverified: { text: "Unverified", className: "border-amber-300 bg-amber-50 text-amber-900", icon: "?" },
};

export function AlertLabelBadge({ label }: { label: VerifyLabel }) {
  const s = STYLES[label];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wider ${s.className}`}
    >
      <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs">
        {s.icon}
      </span>
      {s.text}
    </span>
  );
}
