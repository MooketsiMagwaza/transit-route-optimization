"use client";

/** Replays queued drafts when the connection returns, and once on load. */

import { useEffect } from "react";
import { accountApi, getAccountToken } from "@/lib/account-api";
import { flushOutbox, pendingPosts } from "@/lib/outbox";

const PERMANENT = new Set([400, 404, 413, 422]);

async function flush() {
  if (!getAccountToken() || pendingPosts().length === 0) return;
  const delivered = await flushOutbox(
    async (draft) => { await accountApi.createPost(draft.payload, draft.id); },
    (error) => PERMANENT.has((error as { status?: number }).status ?? 0),
  );
  if (delivered > 0) window.dispatchEvent(new CustomEvent("tsela:posted", { detail: { delivered } }));
}

export function OutboxFlusher() {
  useEffect(() => {
    const run = () => { void flush(); };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, []);
  return null;
}
