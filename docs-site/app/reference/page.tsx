/** Authenticated documentation overview inside the shared Fumadocs shell. */

import Link from "next/link";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { FumadocsShell } from "../../components/fumadocs-shell";
import { API_VERSION, ENDPOINTS } from "../../lib/catalog";
import { GUIDES } from "../../lib/guides";
import { API_URL } from "../../lib/urls";

export default function ReferenceOverview() {
  return (
    <FumadocsShell>
      <DocsPage>
        <DocsTitle>Developer documentation</DocsTitle>
        <DocsDescription>Build against Tsela&apos;s credentialed route API. Every supported endpoint has its own page.</DocsDescription>
        <DocsBody className="docs-overview">
          <dl className="fact-grid">
            <div><dt>Base URL</dt><dd><code>{API_URL}</code></dd></div>
            <div><dt>Version</dt><dd><code>{API_VERSION}</code>, in the path</dd></div>
            <div><dt>Authentication</dt><dd>API key in <code>X-API-Key</code></dd></div>
            <div><dt>Format</dt><dd>JSON over HTTPS</dd></div>
          </dl>

          <div className="overview-grid">
            <Link href="/reference/guides/getting-started"><small>Start here</small><strong>Make your first request</strong><span>Create a key and call the API in a few minutes.</span></Link>
            <Link href="/reference/routes/list"><small>API reference</small><strong>Browse endpoints</strong><span>Parameters, examples, responses, errors, and a live sandbox.</span></Link>
            <Link href="/console"><small>Developer console</small><strong>Manage credentials</strong><span>Create, rotate, and revoke keys; watch your usage.</span></Link>
            <Link href="/reference/guides/errors-and-retries"><small>Reliability</small><strong>Handle errors and limits</strong><span>Status codes, retries, and rate-limit headers.</span></Link>
          </div>

          <h2 className="overview-heading">Endpoints</h2>
          <div className="table-scroll"><table className="ref-table">
            <thead><tr><th scope="col">Method and path</th><th scope="col">Summary</th><th scope="col">Scope</th></tr></thead>
            <tbody>{ENDPOINTS.map((endpoint) => (
              <tr key={endpoint.slug}>
                <th scope="row"><Link href={`/reference/${endpoint.slug}`}><span className="method">{endpoint.method}</span> <code>{endpoint.path}</code></Link></th>
                <td>{endpoint.summary}</td>
                <td><code>{endpoint.auth.scope}</code></td>
              </tr>
            ))}</tbody>
          </table></div>

          <h2 className="overview-heading">Guides</h2>
          <ul className="guide-list">{GUIDES.map((guide) => <li key={guide.slug}><Link href={`/reference/${guide.slug}`}><strong>{guide.title}</strong><span>{guide.description}</span></Link></li>)}</ul>
        </DocsBody>
      </DocsPage>
    </FumadocsShell>
  );
}
