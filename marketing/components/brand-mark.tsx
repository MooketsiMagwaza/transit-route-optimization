/** Reusable Tsela route-loop symbol and wordmark for public-facing identity surfaces. */

export function BrandMark({ compact = false, large = false }: { compact?: boolean; large?: boolean }) {
  return <span className={`brand-lockup${compact ? " compact" : ""}${large ? " large" : ""}`} role="img" aria-label="Tsela">
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" />
      <path d="M12 14h15c6.2 0 9 3.2 9 8s-3.2 7.5-8.5 7.5H22c-4.5 0-7 2.4-7 6.5" />
      <circle cx="12" cy="14" r="3.5" /><circle cx="15" cy="36" r="3.5" />
    </svg>
    {!compact && <strong aria-hidden="true">Tsela</strong>}
  </span>;
}
