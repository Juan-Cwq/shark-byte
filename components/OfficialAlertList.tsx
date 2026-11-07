import type { Alert } from "@/lib/types";

const SEVERITY_DOT: Record<string, string> = {
  Extreme: "bg-red-600",
  Severe: "bg-orange-500",
  Moderate: "bg-amber-400",
  Minor: "bg-mdc-sky",
};

function formatTime(iso: string | null): string {
  if (!iso) return "until further notice";
  return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function OfficialAlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-mdc-muted">No active National Weather Service alerts for Florida.</p>;
  }
  return (
    <ul className="divide-y divide-mdc-line rounded-md border border-mdc-line">
      {alerts.map((a) => (
        <li key={a.id} className="flex gap-3 px-4 py-3">
          <span
            aria-hidden
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[a.severity] ?? "bg-mdc-line"}`}
          />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-mdc-navy">
              {a.event} <span className="font-normal text-mdc-muted">· {a.severity}</span>
            </p>
            <p className="truncate text-mdc-muted" title={a.areaDesc}>
              {a.areaDesc}
            </p>
            <p className="text-xs text-mdc-muted">
              {a.senderName} · expires {formatTime(a.expires)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
