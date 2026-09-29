/** Marketing homepage: one clear promise, the real product, how it works, and direct entry points. */

import Link from "next/link";
import { Hero } from "../components/hero";
import { Showcase } from "../components/showcase";
import { TselaArt } from "../components/tsela-art";
import { getNetworkStats } from "../lib/network-stats";
import { DOCS_URL, RIDER_URL } from "../lib/urls";

// The homepage shows live network numbers, so it renders per request (the data itself is cached for five minutes).
export const dynamic = "force-dynamic";

const STEPS: { title: string; copy: string }[] = [
  { title: "Set your places", copy: "Use your location or tap a familiar spot. Search for where you are going; never type coordinates." },
  { title: "Compare real options", copy: "See where to board, how far you walk, the time, and any transfers. Pick one and the rest step aside." },
  { title: "Ride one clear route", copy: "Follow the road-following route stop by stop, with a nudge before you need to ask to stop." },
  { title: "Keep the map true", copy: "Riders add tips and corrections. Builders use the same reviewed network through the API." },
];

const GATEWAYS: { kicker: string; title: string; copy: string; action: string; href: string; internal?: boolean }[] = [
  { kicker: "Ride", title: "Plan a trip", copy: "Set two places and compare road-following combi routes.", action: "Open the rider app", href: RIDER_URL },
  { kicker: "Product", title: "Explore services", copy: "See the rider, operations, community, and data tools separately.", action: "See every service", href: "/services", internal: true },
  { kicker: "Developers", title: "Read the API", copy: "Authentication, endpoint reference, examples, and error responses.", action: "Open the developer guide", href: DOCS_URL },
  { kicker: "Access", title: "Get an API key", copy: "Create an account, issue a key, and watch usage from the console.", action: "Open the console", href: `${DOCS_URL}/login` },
  { kicker: "Blog", title: "Build in public", copy: "Design decisions, route research, and the questions still being worked through.", action: "Read the journal", href: "/journal", internal: true },
];

export default async function Home() {
  const stats = await getNetworkStats();

  return (
    <>
      <Hero />
      <Showcase />

      <section className="section" id="how-it-works" aria-labelledby="how-title">
        <div className="container how-grid">
          <div>
            <p className="kicker">How it works</p>
            <h2 id="how-title">From two places to the right stop.</h2>
            <p className="lede">Set where you are and where you&apos;re going. Tsela does the comparing, and keeps the map honest as riders correct it.</p>
          </div>
          <ol className="how-list">
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-tint" id="start-here" aria-labelledby="start-title">
        <div className="container start-panel">
          <div>
            <p className="kicker">Start here</p>
            <h2 id="start-title">One network. Four ways in.</h2>
            <p className="lede">Whether you are getting somewhere, learning the platform, or building on the network, the next step should be obvious.</p>
            <table className="stat-table" aria-label="The network today">
              <tbody>
                <tr><th scope="row">Routes mapped</th><td>{stats ? stats.routes : "7+"}</td></tr>
                <tr><th scope="row">Field verified</th><td>{stats ? stats.verified : "0"}</td></tr>
                <tr><th scope="row">Where it comes from</th><td>Riders</td></tr>
              </tbody>
            </table>
          </div>
          <ul className="start-list">
            {GATEWAYS.map((gateway) => {
              const body = (
                <>
                  <span className="start-kicker">{gateway.kicker}</span>
                  <h3>{gateway.title} <span aria-hidden="true">→</span></h3>
                  <p>{gateway.copy}</p>
                </>
              );
              return (
                <li key={gateway.title}>
                  {gateway.internal
                    ? <Link href={gateway.href}>{body}</Link>
                    : <a href={gateway.href}>{body}</a>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="closing-title">
        <div className="container">
          <div className="closing">
            <div>
              <p className="kicker">The first step is still the simplest</p>
              <h2 id="closing-title">Where are you going?</h2>
              <a className="button button-primary" href={RIDER_URL}>Choose my destination</a>
            </div>
            <TselaArt name="stop" />
          </div>
        </div>
      </section>
    </>
  );
}
