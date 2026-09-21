"use client";

/** Completes Google and email-confirmation sign-ins from the provider's URL fragment. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAccountToken } from "@/lib/account-api";
import { sessionFromHash } from "@/lib/identity";

export default function AccountCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const result = sessionFromHash(window.location.hash);
    window.history.replaceState(null, "", window.location.pathname);
    if (!result || result.error || !result.accessToken) {
      setTimeout(() => setError(result?.error ?? "The sign-in link is missing or has expired."), 0);
      return;
    }
    saveAccountToken(result.accessToken);
    router.replace("/community");
  }, [router]);

  return <div className="account-page"><section className="account-card"><span className="page-eyebrow">Sign-in</span><h1>{error ? "That did not work." : "Finishing sign-in…"}</h1>{error && <div className="alert alert-error" role="alert">{error}</div>}<Link className="account-back" href="/account/login">← Back to sign in</Link></section></div>;
}
