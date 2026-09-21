"use client";

/** Non-enumerating password-recovery request and local-development handoff. */

import Link from "next/link";
import { useState } from "react";
import { accountApi } from "@/lib/account-api";
import { EXTERNAL_AUTH, identity } from "@/lib/identity";

export default function RecoverPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [debugToken, setDebugToken] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); try { if (EXTERNAL_AUTH) { await identity.recover(email, `${window.location.origin}/account/reset`).catch(() => undefined); setMessage("If that account exists, a recovery link is on its way."); } else { const result = await accountApi.requestRecovery(email); setMessage(result.message); setDebugToken(result.debugToken ?? ""); } } catch { setMessage("If that account exists, a recovery link has been prepared."); } finally { setLoading(false); } }
  return <div className="account-page"><section className="account-card"><Link className="account-back" href="/account/login">← Sign in</Link><span className="page-eyebrow">Account recovery</span><h1>Reset your password.</h1><p>Enter your email. The response is deliberately identical whether or not an account exists.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button className="btn btn-dark" disabled={loading}>{loading ? "Preparing…" : "Send recovery link →"}</button></form>{message && <div className="contribution-success"><span>✓</span><div><strong>Request received</strong><p>{message}</p></div></div>}{debugToken && <div className="auth-provider-note"><strong>Local debug token</strong><p>Only shown when PASSWORD_RESET_DEBUG is enabled. Copy it to the reset screen.</p><code>{debugToken}</code><Link href="/account/reset">Continue to reset →</Link></div>}</section></div>;
}
