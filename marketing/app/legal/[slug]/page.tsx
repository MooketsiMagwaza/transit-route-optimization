/** Public plain-language policy page generated from the reviewed policy registry. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { policies } from "../../../lib/legal";

export function generateStaticParams() { return Object.keys(policies).map((slug) => ({ slug })); }

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const policy = policies[(await params).slug];
  return policy ? { title: policy.title, description: policy.summary } : {};
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const policy = policies[(await params).slug];
  if (!policy) notFound();
  return (
    <article className="article legal-page">
      <header>
        <p className="kicker">Trust centre · draft</p>
        <h1>{policy.title}</h1>
        <p className="lede">{policy.summary}</p>
        <p className="legal-note">Last updated {policy.updated}. Requires legal review before production launch.</p>
      </header>
      <div className="legal-body">
        {policy.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </div>
      <nav className="legal-nav" aria-label="Other policies">
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/refunds">Refunds</Link>
        <Link href="/legal/cookies">Cookies</Link>
      </nav>
    </article>
  );
}
