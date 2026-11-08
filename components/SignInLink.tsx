"use client";

import { useRouter } from "next/navigation";

/** Link to the sign-in page that brings the student back to the page they were on. */
export function SignInLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const back = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?returnTo=${encodeURIComponent(back)}`);
  };
  return (
    <a href="/login" onClick={go} className={className}>
      {children}
    </a>
  );
}
