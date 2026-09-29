"use client";

/** Internal handbook for operators. Content is fetched with the admin token; the API enforces the role. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient, HandbookPage, HandbookPageSummary } from "@/lib/api-client";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";

function useHandbookIndex() {
  const [pages, setPages] = useState<HandbookPageSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    apiClient.handbook.index()
      .then((result) => { if (!cancelled) setPages(result); })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "The handbook is unavailable"); });
    return () => { cancelled = true; };
  }, []);
  return { pages, error };
}

export function HandbookIndex() {
  const { pages, error } = useHandbookIndex();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = (pages ?? []).filter((page) => !needle || `${page.title} ${page.summary} ${page.group}`.toLowerCase().includes(needle));
    return [...new Set(visible.map((page) => page.group))].map((group) => ({ group, pages: visible.filter((page) => page.group === group) }));
  }, [pages, query]);

  return <div className="page-container handbook-page">
    <header className="ops-platform-hero">
      <div><span className="page-eyebrow">Internal handbook</span><h1>How Tsela runs.</h1><p>Architecture, security, recovery, and delivery notes for operators. This library is separate from the public developer guide and is checked against your administrator role on every request.</p></div>
      <div className="ops-hero-stat"><span>Pages</span><strong>{pages?.length ?? "–"}</strong><small>maintained in the repository</small></div>
    </header>
    <section className="ops-utility-bar"><label>Search the handbook<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Backup, security, launch…" /></label></section>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {!pages && !error && <div className="ops-table-skeleton" />}
    {groups.map(({ group, pages: groupPages }) => <section className="handbook-group" key={group} aria-labelledby={`hb-${group}`}>
      <h2 id={`hb-${group}`}>{group}</h2>
      <ul>{groupPages.map((page) => <li key={page.slug}><Link href={`/handbook/${page.slug}`}><strong>{page.title}</strong><span>{page.summary}</span></Link></li>)}</ul>
    </section>)}
    {pages && !groups.length && <p className="ops-empty">No page matches that search.</p>}
  </div>;
}

export function HandbookArticle({ slug }: { slug: string }) {
  const { pages } = useHandbookIndex();
  const [page, setPage] = useState<HandbookPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiClient.handbook.page(slug)
      .then((result) => { if (!cancelled) { setPage(result); setError(""); } })
      .catch((loadError: unknown) => { if (!cancelled) { setPage(null); setError(loadError instanceof Error ? loadError.message : "This page is unavailable"); } });
    return () => { cancelled = true; };
  }, [slug]);

  const bySource = useMemo(() => new Map((pages ?? []).map((item) => [item.source.toLowerCase(), item.slug])), [pages]);
  const content = useMemo(() => {
    if (!page) return null;
    // Links to sibling repository docs (WORK_ORDER.md) become handbook routes; anything else stays inert.
    const resolve = (href: string) => {
      const file = href.split("#")[0].split("/").pop()?.toLowerCase() ?? "";
      const target = bySource.get(file);
      return target ? `/handbook/${target}${href.includes("#") ? `#${href.split("#")[1]}` : ""}` : null;
    };
    return renderMarkdown(page.markdown, resolve);
  }, [page, bySource]);
  const headings = useMemo(() => (page ? extractHeadings(page.markdown) : []), [page]);

  if (error) return <div className="page-container handbook-page"><Link className="handbook-back" href="/handbook">← Handbook</Link><div className="alert alert-error" role="alert">{error}</div></div>;
  if (!page) return <div className="page-container handbook-page"><div className="ops-table-skeleton" /><div className="ops-table-skeleton" /></div>;

  return <div className="page-container handbook-page">
    <Link className="handbook-back" href="/handbook">← Handbook</Link>
    <div className="handbook-layout">
      <article className="handbook-article">
        <p className="handbook-meta">{page.group} · updated {new Intl.DateTimeFormat("en-BW", { dateStyle: "medium" }).format(new Date(page.updatedAt))}</p>
        {content}
      </article>
      {headings.length > 0 && <aside className="handbook-toc" aria-label="On this page">
        <strong>On this page</strong>
        <ul>{headings.map((heading) => <li className={`depth-${heading.depth}`} key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ul>
      </aside>}
    </div>
  </div>;
}
