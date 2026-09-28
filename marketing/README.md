# Tsela marketing site

The editorial Next.js surface on port 3000 demonstrates the rider journey and routes visitors to separate rider, operations, and developer experiences. **Tsela** is the provisional public brand; TransitOS remains the internal platform name until legal and local-language validation is complete.

The homepage uses a server-rendered SVG route preview instead of downloading an interactive map. It demonstrates the Broadhurst-to-Main-Mall product flow while keeping the marketing route fast, stable, and usable without JavaScript. The full MapLibre experience remains in the rider application, where interaction is valuable.

## Design

One tokenised stylesheet (`app/globals.css`) shared in spirit with the rider app: warm paper, black structure, cobalt actions, lime accents, occasional pink labels. Hard shadows are reserved for interactive elements so sections stay calm. There is a sticky header with a real mobile menu, a skip link, visible focus, a compact privacy banner, and reduced-motion support. The route preview labels are HTML rather than SVG text, so they stay readable at every width. Text sizes never drop below 12px and body text is 16px or larger.

## Identity and SEO

- `components/brand-mark.tsx` owns the reusable route-loop wordmark.
- `app/icon.svg`, `app/manifest.ts`, and `app/opengraph-image.tsx` cover browser, install, and social contexts.
- `app/robots.ts` and `app/sitemap.ts` expose crawler guidance and all Markdown blog posts.
- `/brand` documents the working identity and links to the standalone SVG.
- Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin before deployment.
- Set `NEXT_PUBLIC_API_BASE` to the public API origin so the hero can load current road-aligned route geometry.

## Publishing a build-journal entry

Add a `.md` file to `content/journal/` with `title`, `date`, `summary`, and `status` frontmatter. The journal renderer intentionally supports headings, paragraphs, bullet lists, bold text, and inline code. It never injects raw HTML. Keep posts focused on shipped work, reasoning, and explicit validation gaps.

```bash
npm ci
npm run dev
npm run lint
npm run build
```

See [../docs/BRAND.md](../docs/BRAND.md).
