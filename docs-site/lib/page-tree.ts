/** Fumadocs page tree for the public developer guide: overview, guides, then one page per endpoint. */

import type * as PageTree from "fumadocs-core/page-tree";
import { ENDPOINT_GROUPS, ENDPOINTS } from "./catalog";
import { GUIDES } from "./guides";

export const pageTree: PageTree.Root = {
  name: "Tsela API",
  children: [
    { type: "page", name: "Overview", url: "/reference" },
    { type: "separator", name: "Guides" },
    ...GUIDES.map((guide) => ({ type: "page" as const, name: guide.title, url: `/reference/${guide.slug}` })),
    ...ENDPOINT_GROUPS.flatMap((group) => [
      { type: "separator" as const, name: `${group} endpoints` },
      ...ENDPOINTS.filter((endpoint) => endpoint.group === group).map((endpoint) => ({
        type: "page" as const,
        name: endpoint.title,
        url: `/reference/${endpoint.slug}`,
      })),
    ]),
  ],
};
