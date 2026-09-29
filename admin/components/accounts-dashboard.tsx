"use client";

/** Account visibility for operators without exposing password, session, or API-key secrets. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccount, AdminOverview, apiClient } from "@/lib/api-client";

function when(value: string | null): string {
  if (!value) return "No requests yet";
  return new Intl.DateTimeFormat("en-BW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AccountsDashboard() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [accountData, overviewData] = await Promise.all([
        apiClient.admin.accounts(),
        apiClient.admin.overview(),
      ]);
      setAccounts(accountData);
      setOverview(overviewData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Account data is unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? accounts.filter((account) => `${account.displayName} ${account.email}`.toLowerCase().includes(needle)) : accounts;
  }, [accounts, query]);

  return <div className="page-container ops-platform-page">
    <header className="ops-platform-hero">
      <div><span className="page-eyebrow">Developer access</span><h1>Accounts,<br />without blind spots.</h1><p>See who has joined, whether they have active keys, and how the API is being used. Secret material never enters this view.</p></div>
      <div className="ops-hero-stat"><span>Registered</span><strong>{overview?.accounts ?? accounts.length}</strong><small>developer accounts</small></div>
    </header>

    <section className="ops-utility-bar"><label>Search accounts<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" /></label><button className="btn btn-primary" onClick={() => void load()}>Refresh</button></section>
    {error && <div className="alert alert-error">{error}</div>}

    <section className="ops-account-table" aria-label="Developer accounts">
      <header><span>Account</span><span>Credentials</span><span>Requests</span><span>Last activity</span></header>
      {loading ? [1, 2, 3].map((row) => <div className="ops-table-skeleton" key={row} />) : visible.map((account) => <article key={account.id}>
        <div><b>{account.displayName}</b><small>{account.email}</small></div>
        <div><strong>{account.activeApiKeyCount}</strong><small>{account.apiKeyCount} total keys</small></div>
        <div><strong>{account.requestCount}</strong><small>lifetime calls</small></div>
        <time>{when(account.lastRequestAt)}</time>
      </article>)}
      {!loading && !visible.length && <p className="ops-empty">No account matches that search.</p>}
    </section>
  </div>;
}
