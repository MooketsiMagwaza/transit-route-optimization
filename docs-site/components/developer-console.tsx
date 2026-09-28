"use client";

/** Developer console for credentials, quotas, estimated cost, and request activity. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Account, ApiKey, CreatedApiKey, deleteMyAccount, destroyBrowserSession, developerApi, exportMyData, Usage } from "../lib/developer-api";
import { API_URL } from "../lib/urls";

export function DeveloperConsole() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [changingKeyId, setChangingKeyId] = useState<number | null>(null);
  const [keyName, setKeyName] = useState("My application");
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const [nextAccount, nextKeys, nextUsage] = await Promise.all([developerApi.me(), developerApi.keys(), developerApi.usage()]);
        if (!cancelled) { setAccount(nextAccount); setKeys(nextKeys); setUsage(nextUsage); }
      } catch (loadError: unknown) {
        void destroyBrowserSession();
        if (!cancelled) { setError(loadError instanceof Error ? loadError.message : "Please sign in again"); router.replace("/login?reason=session"); }
      } finally { if (!cancelled) setLoading(false); }
    }
    void loadDashboard();
    return () => { cancelled = true; };
  }, [router]);

  async function createKey() {
    setCreating(true); setError("");
    try {
      const key = await developerApi.createKey(keyName);
      const [nextKeys, nextUsage] = await Promise.all([developerApi.keys(), developerApi.usage()]);
      setCreatedKey(key); setKeys(nextKeys); setUsage(nextUsage);
    }
    catch (createError: unknown) { setError(createError instanceof Error ? createError.message : "Could not create a key"); }
    finally { setCreating(false); }
  }

  async function refreshCredentials() {
    const [nextKeys, nextUsage] = await Promise.all([developerApi.keys(), developerApi.usage()]);
    setKeys(nextKeys); setUsage(nextUsage);
  }

  async function rotateKey(key: ApiKey) {
    if (!window.confirm(`Rotate ${key.name}? The current key will stop working immediately.`)) return;
    setChangingKeyId(key.id); setError(""); setCreatedKey(null);
    try {
      const replacement = await developerApi.rotateKey(key.id);
      setCreatedKey(replacement);
      await refreshCredentials();
    } catch (changeError: unknown) {
      setError(changeError instanceof Error ? changeError.message : "Could not rotate this key");
    } finally { setChangingKeyId(null); }
  }

  async function revokeKey(key: ApiKey) {
    if (!window.confirm(`Revoke ${key.name}? Requests using it will fail immediately.`)) return;
    setChangingKeyId(key.id); setError("");
    try {
      await developerApi.revokeKey(key.id);
      await refreshCredentials();
    } catch (changeError: unknown) {
      setError(changeError instanceof Error ? changeError.message : "Could not revoke this key");
    } finally { setChangingKeyId(null); }
  }

  async function removeAccount() {
    const typed = window.prompt(`This removes your name, email, keys and posts now. Type ${account?.email ?? "your email"} to confirm.`);
    if (!typed) return;
    setError("");
    try {
      await deleteMyAccount(typed);
      await destroyBrowserSession();
      router.replace("/?deleted=1");
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the account");
    }
  }

  function downloadSecret(key: CreatedApiKey) {
    const contents = [
      "# Tsela API credential — store this file in a secret manager and never commit it.",
      `TSELA_API_KEY=${key.key}`,
      `TSELA_API_BASE=${API_URL}/v1`,
      "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `tsela-${key.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.env`;
    link.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="console-loading"><span/><span/><span/><p>Loading account, keys, and usage…</p></div>;
  if (!account) return <div className="console-signed-out"><p className="eyebrow">DEVELOPER ACCESS</p><h1>Sign in to your console.</h1><p>{error || "Create an account to issue API keys and see real request usage."}</p><Link className="console-primary" href="/login">Continue to sign in →</Link></div>;

  const percent = usage?.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;
  return <>
    <div className="console-heading"><div><p className="eyebrow">WELCOME BACK, {account.displayName.toUpperCase()}</p><h1>API console</h1><p>Credentials, monthly usage, and environment status for {account.email}.</p></div><button className="console-signout" onClick={async () => { await developerApi.logout().catch(() => undefined); await destroyBrowserSession(); setAccount(null); router.replace("/"); }}>Sign out</button></div>
    <section className="usage-panel"><div><span>Monthly requests</span><strong>{usage?.used ?? 0}<small> / {usage?.quota ?? 0}</small></strong></div><div className="quota-track"><span style={{ width: `${percent}%` }} /></div><p>{usage?.remaining ?? 0} requests remaining · 100 requests per rolling hour per key.</p><p>{usage?.estimatedCostUsd == null ? "Cost estimate unavailable until ESTIMATED_COST_PER_1000_REQUESTS_USD is configured from measured infrastructure spend." : `Estimated request cost this month: $${usage.estimatedCostUsd.toFixed(4)} USD.`}</p></section>
    <section className="console-live-grid"><article><span className="console-badge">INTERNAL</span><h2>Application gateway</h2><code>{API_URL}/api</code><p>Used by Tsela&apos;s own applications. It is not part of the public developer contract or the production public ingress.</p></article><article><span className="console-badge live">PROTECTED</span><h2>Public v1</h2><code>{API_URL}/v1</code><p>Use the documented endpoints and send your credential in the <code>X-API-Key</code> header.</p></article></section>
    <section className="keys-section"><div className="keys-heading"><div><p className="section-kicker">API KEYS</p><h2>Your credentials</h2></div><div className="create-key-inline"><input value={keyName} onChange={(event) => setKeyName(event.target.value)} aria-label="API key name"/><button className="console-primary" onClick={createKey} disabled={creating || !keyName.trim()}>{creating ? "Creating…" : "Create key"}</button></div></div>{error && <div className="auth-error">{error}</div>}{createdKey && <div className="one-time-key"><span>Save this key now — only a keyed digest is stored, so the secret cannot be shown again.</span><code>{createdKey.key}</code><div className="one-time-actions"><button onClick={() => navigator.clipboard.writeText(createdKey.key)}>Copy key</button><button onClick={() => downloadSecret(createdKey)}>Download .env</button><button onClick={() => setCreatedKey(null)}>Dismiss</button></div></div>}<div className="key-list">{keys.length === 0 ? <p>No keys yet. Name your application and create the first one.</p> : keys.map((key) => <div key={key.id}><span className={key.revokedAt ? "revoked" : "active"}/><strong>{key.name}</strong><code>{key.prefix}…</code><small>{key.revokedAt ? `Revoked ${new Date(key.revokedAt).toLocaleDateString()}` : `${key.hourlyLimit}/hour · ${key.monthlyQuota.toLocaleString()}/month`}</small><div className="key-actions">{!key.revokedAt && <><button onClick={() => rotateKey(key)} disabled={changingKeyId === key.id}>{changingKeyId === key.id ? "Working…" : "Rotate"}</button><button className="danger" onClick={() => revokeKey(key)} disabled={changingKeyId === key.id}>Revoke</button></>}</div></div>)}</div></section>
    <section className="usage-paths"><div><p className="section-kicker">REQUEST ACTIVITY</p><h2>Endpoints this month</h2></div><div>{usage && Object.keys(usage.recentPaths).length > 0 ? Object.entries(usage.recentPaths).map(([path, count]) => <p key={path}><code>{path}</code><strong>{count}</strong></p>) : <p className="empty-usage">Use a key against <code>/v1/routes</code> and activity will appear here.</p>}</div></section>
    <section className="your-data" aria-labelledby="your-data-title"><div><p className="section-kicker">PRIVACY</p><h2 id="your-data-title">Your data</h2><p>Download everything Tsela holds about you, or delete your account. Deleting removes your name, email, keys, and posts immediately and cannot be undone.</p></div><div className="your-data-actions"><button className="console-signout" onClick={() => { setError(""); exportMyData().catch((exportError: unknown) => setError(exportError instanceof Error ? exportError.message : "Could not export")); }}>Export my data</button><button className="console-signout danger" onClick={() => void removeAccount()}>Delete my account</button></div></section>
  </>;
}
