/** Developer product metadata, overview, and access entry point. */

import type { Metadata } from "next";
import { AccessModal } from "../../components/access-modal";
import { API_URL, DOCS_URL } from "../../lib/urls";

const available = ["List published routes, with search and pagination", "Fetch road-aligned geometry for one route"];
const planned = ["Search corridors around a place", "Plan an origin-to-destination journey"];

export const metadata: Metadata = { title: "Developers", description: "Build with the Tsela Gaborone transit API: published routes and road-following geometry, with keyed and metered access.", alternates: { canonical: "/developers" } };

export default function DevelopersPage() {
  return (
    <>
      <section className="page-hero container developer-hero">
        <div>
          <p className="kicker">Tsela for developers</p>
          <h1>Build on local movement.</h1>
          <p className="lede">A small, readable API for maps, community tools, low-data channels, and the next Botswana mobility product.</p>
          <div className="hero-actions"><AccessModal /><a className="text-link" href={DOCS_URL}>Read the guide ↗</a></div>
        </div>
        <figure className="api-sample">
          <figcaption><span>GET</span> /v1/routes</figcaption>
          <pre><code>{`curl "${API_URL}/v1/routes?limit=2" \\
  -H "X-API-Key: $TSELA_API_KEY"

[
  {
    "id": 1,
    "name": "Broadhurst to Main Mall",
    "description": "…",
    "createdAt": "2026-09-07T08:00:00Z"
  }
]`}</code></pre>
        </figure>
      </section>

      <section className="section">
        <div className="container split">
          <header>
            <p className="kicker">The current contract</p>
            <h2>Useful today. Explicit about tomorrow.</h2>
          </header>
          <div>
            <h3 className="list-title">Available now</h3>
            <ul className="capability-list">{available.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
            <h3 className="list-title">Planned, not yet in the contract</h3>
            <ul className="capability-list muted">{planned.map((item) => <li key={item}><span aria-hidden="true">○</span>{item}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="access-band">
            <div><p className="kicker">Access</p><h2>Real keys. Visible usage.</h2></div>
            <p>Developer accounts issue hashed API keys for the versioned <code>/v1</code> routes and track every request against an hourly and monthly quota.</p>
            <a className="button button-lime" href={`${DOCS_URL}/login`}>Sign in for API access <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
