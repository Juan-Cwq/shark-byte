import Link from "next/link";
import { AlertChecker } from "@/components/AlertChecker";

export default function AlertsPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="text-sm font-medium text-mdc-blue hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold text-mdc-navy sm:text-4xl">Storm Alert Checker</h1>
        <p className="mt-2 max-w-2xl text-mdc-muted">
          Got a hurricane alert, text or post? Paste it below. We compare it with live National Weather Service alerts
          and check links for scams. Works offline with the last saved alerts.
        </p>
        <div className="mt-8">
          <AlertChecker />
        </div>
        <p className="mt-10 border-t border-mdc-line pt-4 text-xs text-mdc-muted">
          A planning aid, not an emergency service. Always follow instructions from the National Weather Service and
          your county emergency management. In an emergency, call 911.
        </p>
      </div>
    </main>
  );
}
