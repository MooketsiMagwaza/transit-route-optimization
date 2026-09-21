/** Labelled, copyable code sample used by guides and endpoint pages. */

import { CopyButton } from "./copy-button";

export function CodeBlock({ label, value, light = false }: { label: string; value: string; light?: boolean }) {
  return (
    <figure className={`code-block${light ? " light" : ""}`}>
      <figcaption><span>{label}</span><CopyButton value={value} /></figcaption>
      <pre tabIndex={0}><code>{value}</code></pre>
    </figure>
  );
}
