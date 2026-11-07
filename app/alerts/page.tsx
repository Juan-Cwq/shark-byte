import Link from "next/link";

export default function AlertsPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4 px-5 py-16">
        <Link href="/" className="text-sm font-medium text-mdc-blue hover:underline">
          ← Home
        </Link>
        <h1 className="font-display text-3xl font-semibold text-mdc-navy sm:text-4xl">Storm Alerts</h1>
        <p className="text-mdc-muted">Coming soon: hurricane alert checker using official NWS / NHC sources.</p>
      </div>
    </main>
  );
}
