/** Shared Fumadocs layout for the documentation index and all reference pages. */

import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { pageTree } from "../lib/page-tree";
import { MARKETING_URL } from "../lib/urls";

export function FumadocsShell({ children }: { children: ReactNode }) {
  return <DocsLayout
    tree={pageTree}
    nav={{ title: <span className="fuma-brand"><b>T</b><span>Tsela <small>Developers</small></span></span>, url: "/reference" }}
    links={[
      { type: "main", text: "Guides", url: "/reference/guides/getting-started" },
      { type: "main", text: "API reference", url: "/reference/routes/list" },
      { type: "button", text: "Console", url: "/console" },
      { type: "main", text: "Tsela ↗", url: MARKETING_URL, external: true },
    ]}
    sidebar={{ defaultOpenLevel: 1, collapsible: true }}
    tabs={false}
    containerProps={{ className: "tsela-fumadocs" }}
  >{children}</DocsLayout>;
}
