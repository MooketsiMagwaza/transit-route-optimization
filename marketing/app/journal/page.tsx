/** Public metadata and index of Markdown-backed product and developer blog posts. */

import type { Metadata } from "next";
import Link from "next/link";
import { listJournalPosts } from "../../lib/journal";

export const metadata: Metadata = { title: "Build blog", description: "Tsela product decisions, route-data progress, shipped changes, and validation notes.", alternates: { canonical: "/journal" } };

export default async function JournalPage() {
  const posts = await listJournalPosts();
  return (
    <>
      <section className="page-hero container">
        <div>
          <p className="kicker">Build blog</p>
          <h1>The network is being built in public.</h1>
          <p className="lede">Short, plain-language notes on what changed, why it changed, and what still needs local validation.</p>
        </div>
      </section>
      <section className="container journal-list" aria-label="Posts">
        {posts.map((post) => (
          <Link className="journal-item" href={`/journal/${post.slug}`} key={post.slug}>
            <time dateTime={post.date}>{new Date(`${post.date}T00:00:00`).toLocaleDateString("en-BW", { day: "2-digit", month: "short", year: "numeric" })}</time>
            <div>
              <span className="status-label">{post.status}</span>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
            </div>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
      </section>
    </>
  );
}
