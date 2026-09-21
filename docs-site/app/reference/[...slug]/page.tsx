/** Public guide and endpoint pages, generated from the guide list and the API catalog. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { CodeBlock } from "../../../components/code-block";
import { EndpointPage } from "../../../components/endpoint-page";
import { FumadocsShell } from "../../../components/fumadocs-shell";
import { ENDPOINTS, findEndpoint } from "../../../lib/catalog";
import { findGuide, GUIDES, sectionId } from "../../../lib/guides";

type PageProps = { params: Promise<{ slug: string[] }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...ENDPOINTS.map((endpoint) => ({ slug: endpoint.slug.split("/") })),
    ...GUIDES.map((guide) => ({ slug: guide.slug.split("/") })),
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params).slug;
  const entry = findEndpoint(slug) ?? findGuide(slug);
  return entry ? { title: `${entry.title} | Tsela Developers` } : {};
}

export default async function ReferencePage({ params }: PageProps) {
  const slug = (await params).slug;
  const endpoint = findEndpoint(slug);
  if (endpoint) return <FumadocsShell><EndpointPage endpoint={endpoint} /></FumadocsShell>;

  const guide = findGuide(slug);
  if (!guide) notFound();
  const toc = guide.sections.map((section) => ({ title: section.title, url: `#${sectionId(section.title)}`, depth: 2 }));
  return (
    <FumadocsShell>
      <DocsPage toc={toc}>
        <DocsTitle>{guide.title}</DocsTitle>
        <DocsDescription>{guide.description}</DocsDescription>
        <DocsBody className="reference-body">
          {guide.sections.map((section) => (
            <section className="reference-section" key={section.title}>
              <h2 id={sectionId(section.title)}>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && <ul className="reference-notes">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              {section.code && <CodeBlock label={section.code.label} value={section.code.value} />}
            </section>
          ))}
        </DocsBody>
      </DocsPage>
    </FumadocsShell>
  );
}
