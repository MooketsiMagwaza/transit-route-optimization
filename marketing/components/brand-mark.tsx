/** Reusable Tsela mark and wordmark for public-facing identity surfaces. */

import { TselaMark } from "./tsela-icon";

export function BrandMark({ compact = false, large = false }: { compact?: boolean; large?: boolean }) {
  return <span className={`brand-lockup${compact ? " compact" : ""}${large ? " large" : ""}`} role="img" aria-label="Tsela">
    <TselaMark size={large ? 72 : 36} />
    {!compact && <strong aria-hidden="true">Tsela</strong>}
  </span>;
}
