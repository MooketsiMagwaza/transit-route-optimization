/** One complete documentation page for a single public endpoint, driven by the API catalog. */

import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { API_VERSION, type Endpoint, SHARED_RESPONSE_HEADERS, withBaseUrl } from "../lib/catalog";
import { API_URL } from "../lib/urls";
import { CodeBlock } from "./code-block";
import { CopyButton } from "./copy-button";
import { TryIt } from "./try-it";

const TOC = [
  { title: "Access", url: "#access", depth: 2 },
  { title: "Parameters", url: "#parameters", depth: 2 },
  { title: "Example requests", url: "#example-requests", depth: 2 },
  { title: "Try it", url: "#try-it", depth: 2 },
  { title: "Response", url: "#response", depth: 2 },
  { title: "Errors", url: "#errors", depth: 2 },
  { title: "Behaviour", url: "#behaviour", depth: 2 },
];

export function EndpointPage({ endpoint }: { endpoint: Endpoint }) {
  const responseText = JSON.stringify(endpoint.response.example, null, 2);
  const inputs = endpoint.parameters.filter((parameter) => parameter.in !== "header");
  return (
    <DocsPage toc={TOC}>
      <DocsTitle>{endpoint.title}</DocsTitle>
      <DocsDescription>{endpoint.summary}</DocsDescription>
      <DocsBody className="reference-body">
        <div className="endpoint-signature">
          <span className="method">{endpoint.method}</span>
          <code>{endpoint.path}</code>
          <span className={`stability ${endpoint.stability}`}>{endpoint.stability}</span>
          <CopyButton value={`${API_URL}${endpoint.path}`} label="Copy URL" />
        </div>

        <section className="reference-section">
          <h2 id="access">Access</h2>
          <dl className="fact-grid">
            <div><dt>Credential</dt><dd>API key in the <code>{endpoint.auth.header}</code> header</dd></div>
            <div><dt>Required scope</dt><dd><code>{endpoint.auth.scope}</code></dd></div>
            <div><dt>Quota cost</dt><dd>{endpoint.quotaCost} request{endpoint.quotaCost === 1 ? "" : "s"} per call</dd></div>
            <div><dt>Idempotency</dt><dd>{endpoint.idempotency}</dd></div>
            <div><dt>Stability</dt><dd>{endpoint.stability}, available since {endpoint.since} ({API_VERSION})</dd></div>
          </dl>
        </section>

        <section className="reference-section">
          <h2 id="parameters">Parameters</h2>
          {inputs.length ? (
            <div className="table-scroll"><table className="ref-table">
              <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Constraints</th><th scope="col">Default</th><th scope="col">Description</th></tr></thead>
              <tbody>{inputs.map((parameter) => (
                <tr key={`${parameter.in}:${parameter.name}`}>
                  <th scope="row"><code>{parameter.name}</code><small>{parameter.in}{parameter.required ? " · required" : " · optional"}</small></th>
                  <td>{parameter.type}</td>
                  <td>{parameter.constraints}</td>
                  <td>{parameter.default === null ? "none" : String(parameter.default)}</td>
                  <td>{parameter.description} Example: <code>{String(parameter.example)}</code></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="reference-muted">This endpoint takes no parameters.</p>}
          <p className="reference-muted">Authentication is sent as the <code>{endpoint.auth.header}</code> header; it is never accepted in the query string.</p>
        </section>

        <section className="reference-section">
          <h2 id="example-requests">Example requests</h2>
          <CodeBlock label="cURL" value={withBaseUrl(endpoint.examples.curl)} />
          <CodeBlock label="JavaScript (server-side)" value={endpoint.examples.javascript} />
        </section>

        <section className="reference-section">
          <h2 id="try-it">Try it</h2>
          {endpoint.sandbox.enabled
            ? <TryIt slug={endpoint.slug} title={endpoint.title} path={endpoint.path} parameters={inputs.map((parameter) => ({ name: parameter.name, in: parameter.in as "path" | "query", type: parameter.type, required: parameter.required, example: String(endpoint.sandbox.sample[parameter.name] ?? parameter.example) }))} />
            : <p className="reference-muted">This endpoint is not available in the sandbox.</p>}
        </section>

        <section className="reference-section">
          <h2 id="response">Response</h2>
          <p className="response-label"><span>{endpoint.response.status}</span> {endpoint.response.description}</p>
          <p className="reference-muted">Schema: <code>{endpoint.response.schema}</code>, <code>application/json</code>.</p>
          <CodeBlock label="application/json" value={responseText} light />
          <div className="table-scroll"><table className="ref-table">
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Description</th></tr></thead>
            <tbody>{endpoint.response.fields.map((field) => (
              <tr key={field.name}><th scope="row"><code>{field.name}</code></th><td>{field.type}</td><td>{field.description}</td></tr>
            ))}</tbody>
          </table></div>
          <h3>Response headers</h3>
          <div className="table-scroll"><table className="ref-table">
            <thead><tr><th scope="col">Header</th><th scope="col">Meaning</th></tr></thead>
            <tbody>{SHARED_RESPONSE_HEADERS.map((header) => <tr key={header.name}><th scope="row"><code>{header.name}</code></th><td>{header.description}</td></tr>)}</tbody>
          </table></div>
        </section>

        <section className="reference-section">
          <h2 id="errors">Errors</h2>
          <div className="table-scroll"><table className="ref-table">
            <thead><tr><th scope="col">Status</th><th scope="col">Meaning</th><th scope="col">Retry guidance</th></tr></thead>
            <tbody>{endpoint.errors.map((error) => <tr key={error.status}><th scope="row"><code>{error.status}</code></th><td>{error.meaning}</td><td>{error.retry}</td></tr>)}</tbody>
          </table></div>
          <p className="reference-muted">Error bodies are JSON with a <code>detail</code> field. Every response carries <code>X-Request-ID</code>; include it in support requests.</p>
        </section>

        <section className="reference-section">
          <h2 id="behaviour">Behaviour</h2>
          <dl className="note-list">
            <div><dt>Pagination</dt><dd>{endpoint.pagination}</dd></div>
            <div><dt>Caching</dt><dd>{endpoint.caching}</dd></div>
            <div><dt>Timeouts</dt><dd>{endpoint.timeout}</dd></div>
            <div><dt>Data freshness</dt><dd>{endpoint.freshness}</dd></div>
            <div><dt>Rate limits</dt><dd>Hourly and monthly limits apply per key and are reported in the response headers above. See the rate limits guide.</dd></div>
          </dl>
        </section>
      </DocsBody>
    </DocsPage>
  );
}
