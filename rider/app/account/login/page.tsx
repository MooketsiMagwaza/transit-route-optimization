"use client";

/** Unified rider account entry for profile, bookmarks sync groundwork, and community access. */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TselaArt } from "@/components/tsela-art";
import { accountApi, saveAccountToken } from "@/lib/account-api";
import { EXTERNAL_AUTH, GOOGLE_AUTH, identity } from "@/lib/identity";

export default function AccountLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      if (EXTERNAL_AUTH) {
        if (mode === "register") {
          const created = await identity.signUp(email, password, displayName, `${window.location.origin}/account/callback`);
          if (!created) { setNotice("Check your email and open the confirmation link, then sign in."); setPassword(""); return; }
          saveAccountToken(created.accessToken);
        } else saveAccountToken((await identity.signIn(email, password)).accessToken);
      } else {
        const result = mode === "login" ? await accountApi.login({ email, password }) : await accountApi.register({ email, password, displayName });
        saveAccountToken(result.token);
      }
      router.replace("/community");
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Could not continue"); }
    finally { setLoading(false); }
  }

  return <div className="account-page"><section className="account-card"><Link className="account-back" href="/">← Rider home</Link><TselaArt name="stop" /><span className="page-eyebrow">One account</span><h1>{mode === "login" ? "Welcome back." : "Join the community."}</h1><p>Sign in to trace routes, post tips, and build your rider profile.</p><div className="account-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button></div><form onSubmit={submit}>{mode === "register" && <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={120} required /></label>}<label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 10 : 1} required /></label>{error && <div className="alert alert-error" role="alert">{error}</div>}{notice && <div className="contribution-success" role="status"><span>✓</span><div><strong>Almost there</strong><p>{notice}</p></div></div>}<button className="btn btn-dark" disabled={loading}>{loading ? "Working…" : mode === "login" ? "Sign in →" : "Create account →"}</button></form><Link className="forgot-link" href="/account/recover">Forgot your password?</Link>{GOOGLE_AUTH ? <a className="btn btn-light" href={identity.googleUrl(`${typeof window === "undefined" ? "" : window.location.origin}/account/callback`)}>Continue with Google</a> : !EXTERNAL_AUTH && <div className="auth-provider-note"><strong>Local sign-in</strong><p>Google and email confirmation are provided by self-hosted Supabase Auth when it is enabled; see the identity profile in the README.</p></div>}</section></div>;
}
