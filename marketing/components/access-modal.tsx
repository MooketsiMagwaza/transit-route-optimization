"use client";

/** Accessible dialog that routes developer prospects to the account console. */

import { useRef } from "react";
import { DOCS_URL } from "../lib/urls";

export function AccessModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="button button-dark" onClick={() => dialogRef.current?.showModal()}>
        Get an API key <span aria-hidden="true">→</span>
      </button>
      <dialog className="access-dialog" ref={dialogRef} aria-labelledby="access-title" onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}>
        <button type="button" className="dialog-close" aria-label="Close access dialog" onClick={() => dialogRef.current?.close()}>×</button>
        <p className="kicker">Developer preview</p>
        <h2 id="access-title">Start with the live contract.</h2>
        <p>Create a developer account to issue a hashed API key, call the versioned <code>/v1</code> routes, and see your request usage.</p>
        <dl className="dialog-status">
          <div><dt>Available now</dt><dd>Accounts, API keys, quotas, usage</dd></div>
          <div><dt>Contract</dt><dd>Keyed <code>/v1</code> routes and geometry</dd></div>
        </dl>
        <div className="dialog-actions">
          <a className="button button-primary" href={`${DOCS_URL}/login`}>Sign in for API access <span aria-hidden="true">↗</span></a>
          <a className="text-link" href={DOCS_URL}>Read the guide</a>
        </div>
      </dialog>
    </>
  );
}
