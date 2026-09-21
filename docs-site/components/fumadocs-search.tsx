"use client";

/** In-memory Fumadocs search over the public guides and endpoint catalog only. */

import { useMemo, useState } from "react";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SearchItemType,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { ENDPOINTS } from "../lib/catalog";
import { GUIDES } from "../lib/guides";

type Entry = { id: string; url: string; title: string; trail: string[]; text: string };

const ENTRIES: Entry[] = [
  ...GUIDES.map((guide) => ({
    id: guide.slug,
    url: `/reference/${guide.slug}`,
    title: guide.title,
    trail: ["Guides"],
    text: `${guide.title} ${guide.description} ${guide.sections.map((section) => section.title).join(" ")}`,
  })),
  ...ENDPOINTS.map((endpoint) => ({
    id: endpoint.slug,
    url: `/reference/${endpoint.slug}`,
    title: endpoint.title,
    trail: [`${endpoint.group} endpoints`, `${endpoint.method} ${endpoint.path}`],
    text: `${endpoint.title} ${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.group} ${endpoint.auth.scope}`,
  })),
];

export default function TselaSearchDialog(props: SharedProps) {
  const [search, setSearch] = useState("");
  const items = useMemo<SearchItemType[]>(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ENTRIES.filter((entry) => words.every((word) => entry.text.toLowerCase().includes(word))).map((entry) => ({
      id: entry.id,
      type: "page" as const,
      url: entry.url,
      content: entry.title,
      breadcrumbs: entry.trail,
    }));
  }, [search]);

  return <SearchDialog search={search} onSearchChange={setSearch} {...props}>
    <SearchDialogOverlay />
    <SearchDialogContent>
      <SearchDialogHeader><SearchDialogIcon /><SearchDialogInput placeholder="Search guides, endpoints, or paths" /><SearchDialogClose /></SearchDialogHeader>
      <SearchDialogList items={items} />
      <SearchDialogFooter><span>Tsela developer guide</span><kbd>Esc</kbd></SearchDialogFooter>
    </SearchDialogContent>
  </SearchDialog>;
}
