"use client";

/** Sign-in and registration form for developer access. */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSession, developerApi } from "../lib/developer-api";
import { EXTERNAL_AUTH, GOOGLE_AUTH, identity } from "../lib/identity";
import { CopyButton } from "./copy-button";
import { MARKETING_URL } from "../lib/urls";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [notice, setNotice] = useState("");
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true" && !EXTERNAL_AUTH;
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@tsela.local";
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "TselaDemo2026!";

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      let token: string;
      if (EXTERNAL_AUTH) {
        if (mode === "register") {
          const created = await identity.signUp(email, password, displayName, `${window.location.origin}/auth/callback`);
          if (!created) { setNotice("Check your email and open the confirmation link, then sign in."); setPassword(""); return; }
          token = created.accessToken;
        } else token = (await identity.signIn(email, password)).accessToken;
      } else {
        token = (mode === "register" ? await developerApi.register({ email, password, displayName }) : await developerApi.login({ email, password })).token;
      }
      await createBrowserSession(token);
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath ? new URL(requestedPath, window.location.origin) : null;
      const safePath = destination?.origin === window.location.origin
        ? `${destination.pathname}${destination.search}${destination.hash}`
        : "/console";
      router.push(safePath);
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Could not continue");
    } finally { setLoading(false); }
  }

  function useDemo() {
    setMode("login"); setEmail(demoEmail); setPassword(demoPassword); setError("");
  }

  return <div className="auth-card" id="access"><div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Create account</button></div>{demoEnabled && mode === "login" && <div className="auth-demo"><div><span>LOCAL DEMO</span><button type="button" onClick={useDemo}>Fill credentials</button></div><p><code>{demoEmail}</code><CopyButton value={demoEmail} /></p><p><code>{demoPassword}</code><CopyButton value={demoPassword} /></p></div>}<form onSubmit={submit}>{mode === "register" && <label>Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} autoComplete="name" /></label>}<label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>{mode === "register" && <><p className="auth-hint">Use at least 10 characters. Passwords are hashed and never stored in readable form.</p><label className="auth-consent"><input type="checkbox" checked={acceptedTerms} onChange={(event)=>setAcceptedTerms(event.target.checked)} required/><span>I agree to the <a href={`${MARKETING_URL}/legal/terms`}>terms</a> and have read the <a href={`${MARKETING_URL}/legal/privacy`}>privacy policy</a>.</span></label></>}{error && <div className="auth-error" role="alert">{error}</div>}{notice && <div className="auth-notice" role="status">{notice}</div>}<button className="console-primary" disabled={loading || (mode === "register" && !acceptedTerms)}>{loading ? "Securing your session…" : mode === "register" ? "Create developer account" : "Sign in to console"}</button>{loading && <div className="auth-progress"><span /></div>}</form>{GOOGLE_AUTH && <a className="auth-google" href={identity.googleUrl(`${typeof window === "undefined" ? "" : window.location.origin}/auth/callback`)}>Continue with Google</a>}<Link href="/recover">Forgot your password?</Link></div>;
}
