import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAuth0Client } from "@/lib/auth0";

function safeReturnTo(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return "/";

  try {
    const destination = new URL(candidate, "https://local.invalid");
    return destination.origin === "https://local.invalid"
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "/";
  } catch {
    return "/";
  }
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const auth0 = getAuth0Client();
  if (auth0 && (await auth0.getSession())) redirect(returnTo);

  const signInHref = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  const signUpHref = `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className="flex flex-1 items-center bg-[#f4f8fc] px-5 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(0,56,118,0.14)] lg:min-h-[36rem] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-mdc-navy lg:block">
          <Image
            src="/mdc-campus-hero.jpg"
            alt="Miami Dade College campus"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#00264f]/95 via-[#003876]/50 to-[#003876]/10" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Miami Dade College</p>
            <h1 className="mt-4 max-w-md font-display text-4xl font-semibold leading-tight xl:text-5xl">
              Your next chapter starts here.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
              Explore career pathways, plan your courses, and get support built around your goals.
            </p>
          </div>
        </section>

        <section className="flex flex-col justify-center px-7 py-10 sm:px-12 lg:px-14">
          <Image src="/mdc-logo.png" alt="Miami Dade College" width={116} height={120} className="h-14 w-auto object-contain object-left" />
          <p className="mt-9 text-xs font-semibold uppercase tracking-[0.18em] text-mdc-blue">Cone of Uncertainty</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-mdc-navy sm:text-4xl">
            Welcome back
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-mdc-muted">
            Sign in to continue to your personalized MDC student companion.
          </p>

          {auth0 ? (
            <>
              <a
                href={signInHref}
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-mdc-blue px-5 py-3 font-semibold text-white shadow-lg shadow-mdc-blue/20 transition hover:bg-mdc-blue-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mdc-blue"
              >
                <span>Sign in securely</span>
                <ArrowIcon />
              </a>
              <p className="mt-4 text-center text-sm text-mdc-muted">
                New to the platform?{" "}
                <a href={signUpHref} className="font-semibold text-mdc-blue underline decoration-mdc-blue/30 underline-offset-4 hover:text-mdc-blue-bright">
                  Create an account
                </a>
              </p>
            </>
          ) : (
            <p role="status" className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              Sign-in is not configured yet. Add your Auth0 settings to <strong>.env.local</strong> and restart the dev server.
            </p>
          )}

          <div className="mt-8 flex items-center gap-3 text-xs leading-relaxed text-mdc-muted">
            <span aria-hidden className="h-px flex-1 bg-mdc-line" />
            <span>Secure authentication powered by Auth0</span>
            <span aria-hidden className="h-px flex-1 bg-mdc-line" />
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#f4f8fc] px-5 py-12">
      <p className="rounded-xl bg-white px-6 py-5 text-sm text-mdc-muted shadow-md">Loading secure sign in…</p>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
