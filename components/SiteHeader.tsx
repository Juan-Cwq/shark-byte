import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="z-40 bg-white">
      <div className="bg-mdc-navy">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
          <span>Career Pathways</span>
          <span className="hidden sm:inline">Learn · Plan · Achieve</span>
        </div>
      </div>
      <div className="border-b border-mdc-line">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex min-w-0 items-center gap-4">
            <Image
              src="/mdc-logo.png"
              alt="Miami Dade College"
              width={580}
              height={600}
              priority
              className="h-12 w-auto sm:h-14"
            />
            <span aria-hidden className="h-10 w-px bg-mdc-line" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-lg font-semibold tracking-tight text-mdc-navy sm:text-xl">
                Cone of Uncertainty
              </span>
              <span className="hidden text-sm text-mdc-muted sm:inline">Plan your path from MDC to a career</span>
            </span>
          </Link>
          <span className="text-sm font-medium text-mdc-muted" aria-label="Language: English">
            EN
          </span>
        </div>
      </div>
    </header>
  );
}
