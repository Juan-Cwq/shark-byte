import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPay } from "@/lib/format";
import { getAllCareers } from "@/lib/pathways";

export default function HomePage() {
  const careers = getAllCareers();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/mdc-campus-hero.jpg"
            alt=""
            fill
            priority
            className="object-cover object-[70%_40%]"
            sizes="100vw"
          />
          <div className="hero-panel absolute inset-0" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pb-20 sm:pt-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mdc-blue">Welcome to</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-mdc-navy sm:text-5xl">
              Cone of Uncertainty
            </h1>
            <div className="mt-5 h-[3px] w-12 bg-mdc-blue" aria-hidden />
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mdc-muted">
              Your MDC student companion for a smarter future — real catalog pathways, costs, and transfer
              rules in one place.
            </p>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-3">
            <FeatureCard
              href="#careers"
              title="Career Navigator"
              description="Explore careers and build your personalized roadmap."
              icon={<GradCapIcon />}
            />
            <FeatureCard
              href="#careers"
              title="AI Study Buddy"
              description="Get help with your studies, anytime you need it."
              icon={<BuddyIcon />}
            />
            <FeatureCard
              href="/alerts"
              title="Storm Alerts"
              description="Stay informed about hurricanes and severe weather."
              icon={<StormIcon />}
            />
          </ul>
        </div>
      </section>

      <section id="careers" className="scroll-mt-8 border-t border-mdc-line bg-[#f7fafc] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold text-mdc-navy">Pick a career path</h2>
          <p className="mt-3 max-w-2xl text-mdc-muted">
            Catalog-backed roadmaps from Miami Dade College — courses, costs, transfer rules, and next steps.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {careers.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/career/${c.id}`}
                  className="feature-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-mdc-line p-5 transition hover:-translate-y-0.5 hover:border-mdc-blue/35"
                >
                  <h3 className="relative font-display text-xl font-bold text-mdc-navy">{c.title}</h3>
                  <p className="relative mt-2 line-clamp-3 flex-1 text-sm text-mdc-muted">{c.summary}</p>
                  <p className="relative mt-4 text-sm font-semibold text-mdc-blue">
                    {formatPay(c.medianPay, c.payYear)}
                  </p>
                  <p className="relative mt-1 text-xs text-mdc-muted">{c.outlook}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  const className =
    "feature-card group relative flex h-full min-h-[12rem] flex-col overflow-hidden rounded-2xl border border-mdc-line/80 p-5 transition hover:-translate-y-1 hover:shadow-lg";

  const inner = (
    <>
      <div className="relative z-[1] text-mdc-blue">{icon}</div>
      <h2 className="relative z-[1] mt-4 font-display text-lg font-bold text-mdc-navy">{title}</h2>
      <p className="relative z-[1] mt-2 flex-1 text-sm leading-relaxed text-mdc-muted">{description}</p>
      <span className="relative z-[1] mt-5 inline-flex h-9 w-9 items-center justify-center self-end rounded-full bg-mdc-blue text-white transition group-hover:bg-mdc-blue-bright">
        <ArrowIcon />
      </span>
    </>
  );

  return (
    <li>
      {href.startsWith("/") ? (
        <Link href={href} className={className}>
          {inner}
        </Link>
      ) : (
        <a href={href} className={className}>
          {inner}
        </a>
      )}
    </li>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GradCapIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 9l10-5 10 5-10 5L2 9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M6 11.5v4.2c0 1.2 2.7 3.3 6 3.3s6-2.1 6-3.3v-4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M22 9v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BuddyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="7" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9.5" cy="12.5" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="1.2" fill="currentColor" />
      <path
        d="M12 3v4M9 19.5c.8.7 1.9 1 3 1s2.2-.3 3-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StormIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 18a4.5 4.5 0 1 1 1.2-8.8A6 6 0 0 1 20 12.5 3.5 3.5 0 0 1 17.5 18H7.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 11l-2 4h3l-2 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
