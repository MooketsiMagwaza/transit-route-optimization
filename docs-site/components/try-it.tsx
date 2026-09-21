"use client";

/** Live request panel backed by the server-side, read-only documentation sandbox. */

import { FormEvent, useState } from "react";
import { CopyButton } from "./copy-button";

type Field = { name: string; in: "path" | "query"; type: string; required: boolean; example: string };
type Result = {
  status: number;
  ok: boolean;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
};
type SandboxError = { detail: string };

export function TryIt({ slug, title, path, parameters }: { slug: string; title: string; path: string; parameters: Field[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(parameters.map((field) => [field.name, field.example])));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, params: values }) });
      const payload = (await response.json()) as Result | SandboxError;
      if (!response.ok) throw new Error("detail" in payload ? payload.detail : "The sandbox request failed");
      setResult(payload as Result);
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : "The sandbox request failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="try-it">
      <p className="reference-muted">Sends a real, read-only request from our server using a shared sandbox key with a low hourly limit. Your own keys never pass through this form, and only safe GET requests can be sent.</p>
      <form onSubmit={send} aria-label={`Try ${title}`}>
        <p className="try-it-path"><span>GET</span> <code>{path}</code></p>
        {parameters.map((field) => (
          <label key={field.name}>
            <span>{field.name} <small>{field.in}{field.required ? " · required" : ""}</small></span>
            <input value={values[field.name] ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} required={field.required} inputMode={field.type === "integer" ? "numeric" : "text"} spellCheck={false} autoComplete="off" />
          </label>
        ))}
        <button className="console-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
      </form>
      <div aria-live="polite">
        {busy && <div className="try-it-progress" role="status"><span /> Waiting for the API…</div>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {result && (
          <div className="try-it-result">
            <p className="response-label"><span className={result.ok ? "ok" : "fail"}>{result.status}</span> {result.ok ? "Success" : "Error response"} in {result.durationMs} ms</p>
            <dl className="header-list">{Object.entries(result.headers).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
            <figure className="code-block light"><figcaption><span>Response body{result.truncated ? " (truncated)" : ""}</span><CopyButton value={result.body} /></figcaption><pre tabIndex={0}><code>{result.body}</code></pre></figure>
          </div>
        )}
      </div>
    </div>
  );
}
