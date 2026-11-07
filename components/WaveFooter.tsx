import { HowItWorks } from "@/components/HowItWorks";

export function WaveFooter() {
  return (
    <footer className="mt-auto bg-white">
      {/* Smooth SVG wave — content stays fully on navy, never clipped */}
      <svg
        className="block w-full text-mdc-navy"
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path fill="currentColor" d="M0,72 L0,28 C360,72 720,0 1080,28 C1260,42 1380,48 1440,36 L1440,72 Z" />
      </svg>

      <div className="bg-mdc-navy px-5 pb-12 pt-2 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-lg">
            <p className="font-display text-base font-bold tracking-[0.22em] sm:text-lg">
              LEARN • PLAN • ACHIEVE
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Pay data: U.S. Bureau of Labor Statistics. Pathways curated from the MDC catalog.
            </p>
            <div className="mt-4 text-mdc-sky [&_button]:font-semibold [&_button]:hover:text-white">
              <HowItWorks />
            </div>
          </div>
          <Skyline className="h-20 w-full max-w-sm shrink-0 md:h-24" />
        </div>
      </div>
    </footer>
  );
}

function Skyline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 100" fill="none" aria-hidden>
      <rect x="0" y="58" width="420" height="42" fill="#4AA3E8" opacity="0.28" />
      <g fill="#8ec6f0">
        <rect x="12" y="48" width="22" height="52" />
        <rect x="40" y="36" width="18" height="64" />
        <rect x="64" y="28" width="28" height="72" />
        <rect x="98" y="44" width="16" height="56" />
        <rect x="120" y="22" width="24" height="78" />
        <rect x="150" y="40" width="20" height="60" />
        <rect x="176" y="30" width="34" height="70" />
        <rect x="216" y="48" width="18" height="52" />
        <rect x="240" y="18" width="26" height="82" />
        <rect x="272" y="38" width="22" height="62" />
        <rect x="300" y="26" width="30" height="74" />
        <rect x="336" y="42" width="20" height="58" />
        <rect x="362" y="32" width="40" height="68" />
      </g>
    </svg>
  );
}
