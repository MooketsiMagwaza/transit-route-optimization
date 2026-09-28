"use client";

/** Says when the app is offline, when saved route data is showing, and how many drafts wait to send. */

import { useEffect, useState } from "react";
import { useOffline } from "next/offline";
import { pendingPosts } from "@/lib/outbox";

export function OfflineBanner() {
  const isOffline = useOffline();
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const onStale = (event: Event) => setCachedAt(((event as CustomEvent<{ cachedAt: string | null }>).detail?.cachedAt) ?? "");
    const onOutbox = () => setPending(pendingPosts().length);
    const onFresh = () => setCachedAt(null);
    onOutbox();
    window.addEventListener("tsela:stale", onStale);
    window.addEventListener("tsela:outbox", onOutbox);
    window.addEventListener("online", onFresh);
    return () => {
      window.removeEventListener("tsela:stale", onStale);
      window.removeEventListener("tsela:outbox", onOutbox);
      window.removeEventListener("online", onFresh);
    };
  }, []);

  if (!isOffline && cachedAt === null && pending === 0) return null;
  const saved = cachedAt ? new Intl.DateTimeFormat("en-BW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(cachedAt)) : "earlier";
  return (
    <div className="offline-banner" role="status">
      <strong>{isOffline ? "You're offline." : cachedAt !== null ? "Showing saved routes." : "Sending your drafts."}</strong>
      <span>
        {cachedAt !== null && `Route data is from ${saved} and may be out of date. `}
        {pending > 0 && `${pending} post${pending === 1 ? "" : "s"} will be sent when you reconnect. `}
        {isOffline && cachedAt === null && pending === 0 && "Saved routes remain on this device. Requests will retry when the connection returns."}
      </span>
    </div>
  );
}
