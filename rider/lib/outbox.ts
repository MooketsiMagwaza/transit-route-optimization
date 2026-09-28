/**
 * Offline outbox for drafts that are safe to replay.
 *
 * Each draft carries its own random Idempotency-Key. The API returns the original result for a
 * repeated key, so a retry after a timeout, a double tap, or a reconnect can never post twice.
 * Only community posts are queued; anything that is not idempotent stays online-only.
 */

const KEY = "tsela.outbox.v1";
const MAX_DRAFTS = 20;

export type PostDraft = { routeId?: number; kind: "tip" | "discussion"; title: string; body: string };
export type QueuedPost = { id: string; payload: PostDraft; queuedAt: string; attempts: number };

function read(): QueuedPost[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedPost[]; } catch { return []; }
}
function write(queue: QueuedPost[]) {
  try { localStorage.setItem(KEY, JSON.stringify(queue.slice(-MAX_DRAFTS))); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new CustomEvent("tsela:outbox"));
}

export function pendingPosts(): QueuedPost[] { return read(); }

export function queuePost(payload: PostDraft, id: string = crypto.randomUUID().replaceAll("-", "")): QueuedPost {
  const draft: QueuedPost = { id, payload, queuedAt: new Date().toISOString(), attempts: 0 };
  write([...read(), draft]);
  return draft;
}

/** True for failures that mean "no connection" rather than "the server said no". */
export function isNetworkFailure(error: unknown): boolean {
  return typeof navigator !== "undefined" && (!navigator.onLine || error instanceof TypeError);
}

/**
 * Send queued drafts in order. Stops at the first network failure so order is preserved,
 * drops drafts the server permanently rejects, and reports how many were delivered.
 */
export async function flushOutbox(send: (draft: QueuedPost) => Promise<void>, isPermanent: (error: unknown) => boolean): Promise<number> {
  let delivered = 0;
  for (const draft of read()) {
    try {
      await send(draft);
      write(read().filter((item) => item.id !== draft.id));
      delivered += 1;
    } catch (error) {
      if (isNetworkFailure(error)) break;
      if (isPermanent(error)) write(read().filter((item) => item.id !== draft.id));
      else write(read().map((item) => (item.id === draft.id ? { ...item, attempts: item.attempts + 1 } : item)));
      break;
    }
  }
  return delivered;
}
