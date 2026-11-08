"use client";

import { useEffect, useState } from "react";
import { SignInLink } from "@/components/SignInLink";

type State = { kind: "loading" } | { kind: "signed_out" } | { kind: "signed_in"; name: string | null } | { kind: "off" };

// Checked in the browser so pages stay static and cacheable offline without any user data in them.
export function AuthLink() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/auth/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!alive) return;
        if (res.ok) {
          const user = (await res.json()) as { given_name?: string; name?: string };
          setState({ kind: "signed_in", name: user.given_name ?? user.name ?? null });
        } else {
          setState(res.status === 401 || res.status === 204 ? { kind: "signed_out" } : { kind: "off" });
        }
      })
      .catch(() => alive && setState({ kind: "off" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "signed_in") {
    return (
      <span className="flex items-center gap-3 text-sm">
        {state.name ? <span className="hidden text-mdc-muted sm:inline">Hi, {state.name}</span> : null}
        <a href="/auth/logout" className="font-semibold text-mdc-blue hover:text-mdc-blue-bright">
          Sign out
        </a>
      </span>
    );
  }
  if (state.kind === "signed_out") {
    return <SignInLink className="text-sm font-semibold text-mdc-blue hover:text-mdc-blue-bright">Sign in</SignInLink>;
  }
  return null;
}
