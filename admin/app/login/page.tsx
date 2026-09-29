"use client";

/**
 * Administrator-only sign-in. With the identity provider enabled, operators must complete
 * TOTP multi-factor authentication; the API then re-checks role and MFA on every request.
 */

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EXTERNAL_AUTH, identity, TotpEnrollment } from "@/lib/identity";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
type Step = { name: "credentials" } | { name: "verify"; token: string; factorId: string } | { name: "enroll"; token: string; enrollment: TotpEnrollment };

async function confirmAdmin(token: string): Promise<void> {
  const check = await fetch(`${BASE}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } });
  if (check.status === 403) {
    const detail = (await check.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(detail?.detail ?? "This account does not have administrator access");
  }
  if (!check.ok) throw new Error("Could not verify administrator access");
  localStorage.setItem("tsela_admin_token", token);
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ name: "credentials" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (value) { setError(value instanceof Error ? value.message : "Could not sign in"); } finally { setBusy(false); }
  }

  const signIn = (event: FormEvent) => { event.preventDefault(); void run(async () => {
    if (!EXTERNAL_AUTH) {
      const login = await fetch(`${BASE}/api/developer/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!login.ok) throw new Error("Email or password is incorrect");
      const result = (await login.json()) as { token: string };
      await confirmAdmin(result.token);
      router.replace("/dashboard");
      return;
    }
    const { accessToken } = await identity.signIn(email, password);
    const verified = (await identity.factors(accessToken)).find((factor) => factor.factorType === "totp" && factor.status === "verified");
    if (verified) setStep({ name: "verify", token: accessToken, factorId: verified.id });
    else setStep({ name: "enroll", token: accessToken, enrollment: await identity.enrollTotp(accessToken, `Tsela operator ${new Date().toISOString().slice(0, 10)}`) });
  }); };

  const submitCode = (event: FormEvent) => { event.preventDefault(); if (step.name === "credentials") return; void run(async () => {
    const factorId = step.name === "verify" ? step.factorId : step.enrollment.factorId;
    const session = await identity.verifyTotp(step.token, factorId, code.trim());
    await confirmAdmin(session.accessToken);
    router.replace("/dashboard");
  }); };

  return <section className="admin-login">
    <div>
      <span>Restricted operations</span>
      <h1>Administrator sign in.</h1>
      <p>Rider and developer accounts cannot enter this workspace. Access is checked again by every admin API endpoint{EXTERNAL_AUTH ? ", which also requires a verified second factor" : ""}.</p>
    </div>
    {step.name === "credentials" ? (
      <form onSubmit={signIn}>
        <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Verifying access…" : "Sign in"}</button>
      </form>
    ) : (
      <form onSubmit={submitCode}>
        {step.name === "enroll" && <>
          <p>Scan this code with an authenticator app (1Password, Authy, Google Authenticator), then enter the 6-digit code it shows.</p>
          {/* The provider returns the QR as an SVG data URI; it is displayed as an image, never injected as markup. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.enrollment.qrCode} alt="Authenticator setup QR code" width={180} height={180} />
          <p>Cannot scan? Enter this key manually: <code>{step.enrollment.secret}</code></p>
        </>}
        <label>Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required autoFocus /></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy || code.trim().length !== 6}>{busy ? "Checking code…" : step.name === "enroll" ? "Confirm and sign in" : "Verify and sign in"}</button>
      </form>
    )}
  </section>;
}
