/** Says how far a route can be trusted, from its provenance and last field verification. */

import type { Route } from "@/lib/api-client";

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function trustSummary(route: Pick<Route, "verificationStatus" | "verifiedAt">): { tone: "good" | "warn" | "muted"; title: string; detail: string } {
  if (route.verificationStatus === "field_verified" && route.verifiedAt) {
    const days = daysSince(route.verifiedAt);
    return { tone: "good", title: days === 0 ? "Field verified today" : `Field verified ${days} day${days === 1 ? "" : "s"} ago`, detail: "Someone rode this route and confirmed the stops. Fares and times can still change." };
  }
  if (route.verificationStatus === "stale") {
    return { tone: "warn", title: "Verification is out of date", detail: "This route was confirmed a while ago. Check with the driver before relying on it." };
  }
  return { tone: "muted", title: "Community-sourced, not yet field verified", detail: "Shared by riders and reviewed for basic sense, but nobody has confirmed it on the road yet." };
}

export function TrustNotice({ route }: { route: Pick<Route, "verificationStatus" | "verifiedAt"> }) {
  const summary = trustSummary(route);
  return (
    <div className={`trust-notice ${summary.tone}`} role="note">
      <strong>{summary.title}</strong>
      <span>{summary.detail}</span>
    </div>
  );
}
