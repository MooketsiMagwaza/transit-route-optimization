"use client";

/** One-use reset-token form; completing a reset invalidates existing sessions. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { accountApi } from "@/lib/account-api";
import { EXTERNAL_AUTH, identity, sessionFromHash } from "@/lib/identity";

export default function ResetPage() {
  const [token, setToken] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!EXTERNAL_AUTH) return; const result = sessionFromHash(window.location.hash); window.history.replaceState(null, "", window.location.pathname); setTimeout(() => { if (result?.accessToken) setToken(result.accessToken); else setError(result?.error ?? "Open the recovery link from your email to continue."); }, 0); }, []);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(""); try { if (EXTERNAL_AUTH) await identity.updatePassword(token, password); else await accountApi.resetPassword(token, password); setMessage("Password updated. Sign in again on every device."); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Could not reset password"); } finally { setLoading(false); } }
  return <div className="account-page"><section className="account-card"><Link className="account-back" href="/account/login">← Sign in</Link><span className="page-eyebrow">Secure reset</span><h1>Choose a new password.</h1><form onSubmit={submit}>{!EXTERNAL_AUTH && <label>Recovery token<input value={token} onChange={(event) => setToken(event.target.value)} minLength={20} required /></label>}<label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /></label>{error && <div className="alert alert-error">{error}</div>}<button className="btn btn-dark" disabled={loading}>{loading ? "Updating…" : "Update password →"}</button></form>{message && <div className="contribution-success"><span>✓</span><div><strong>Done</strong><p>{message}</p><Link href="/account/login">Return to sign in</Link></div></div>}</section></div>;
}
