/** One internal handbook page, rendered from the repository Markdown source. */

import { HandbookArticle } from "@/components/handbook";

export default async function HandbookArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HandbookArticle slug={slug} />;
}
