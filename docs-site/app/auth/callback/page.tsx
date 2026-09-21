"use client";

/** Completes Google and email-confirmation sign-ins by turning the provider session into the portal cookie. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSession } from "../../../lib/developer-api";
import { sessionFromHash } from "../../../lib/identity";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const result = sessionFromHash(window.location.hash);
    // Remove the token from the address bar and history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    if (!result || result.error || !result.accessToken) {
      setTimeout(() => setError(result?.error ?? "The sign-in link is missing or has expired."), 0);
      return;
    }
    createBrowserSession(result.accessToken)
      .then(() => { router.replace("/console"); router.refresh(); })
      .catch((sessionError: unknown) => setError(sessionError instanceof Error ? sessionError.message : "Could not finish signing in"));
  }, [router]);

  return <main className="auth-page"><div className="auth-intro"><p className="eyebrow">SIGN-IN</p><h1>{error ? "That did not work." : "Finishing sign-in…"}</h1>{error && <p>{error}</p>}<Link href="/#access">← Back to sign in</Link></div></main>;
}
