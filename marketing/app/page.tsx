/** Marketing homepage: one clear promise, how it works, and direct entry points. */

import Link from "next/link";
import { Hero } from "../components/hero";
import { DOCS_URL, RIDER_URL } from "../lib/urls";

const STEPS = [
  { title: "Set your places", copy: "Use your location or tap a familiar place. Search for the destination; never type coordinates." },
  { title: "Compare real options", copy: "See boarding point, walking distance, time, and transfers. Pick one and the rest step aside." },
  { title: "Ride one clear route", copy: "Follow the road-following corridor stop by stop, with a reminder before you need to ask to stop." },
  { title: "Keep the map true", copy: "Riders add tips and corrections. Builders use the same reviewed network through the API." },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section className="section" id="how-it-works" aria-labelledby="how-title">
        <div className="container">
          <header className="section-header">
            <p className="kicker">One trip, four steps</p>
            <h2 id="how-title">From two places to the right stop.</h2>
          </header>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li className="step" key={step.title}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-tint" id="start-here" aria-labelledby="start-title">
        <div className="container">
          <header className="section-header">
            <p className="kicker">Start here</p>
            <h2 id="start-title">One network. Four ways in.</h2>
            <p className="lede">Whether you are getting somewhere, learning the platform, or building on the network, the next step should be obvious.</p>
          </header>
          <div className="gateway-grid">
            <a className="gateway-card gateway-primary" href={RIDER_URL}>
              <span className="kicker">01 · Ride</span>
              <h3>Plan a trip</h3>
              <p>Set two places and compare road-following combi routes.</p>
              <b>Open the rider app →</b>
            </a>
            <Link className="gateway-card" href="/services">
              <span className="kicker">02 · Product</span>
              <h3>Explore services</h3>
              <p>See the rider, operations, community, and data tools separately.</p>
              <b>See every service →</b>
            </Link>
            <a className="gateway-card" href={DOCS_URL}>
              <span className="kicker">03 · Developers</span>
              <h3>Read the API</h3>
              <p>Authentication, endpoint reference, examples, and error responses.</p>
              <b>Open the developer guide →</b>
            </a>
            <a className="gateway-card" href={`${DOCS_URL}/login`}>
              <span className="kicker">04 · Access</span>
              <h3>Get an API key</h3>
              <p>Create an account, issue a key, and watch usage from the console.</p>
              <b>Open the console →</b>
            </a>
          </div>
          <div className="build-strip">
            <div><span className="kicker">Build in public</span><h3>Follow the network as it grows.</h3></div>
            <p>Design decisions, route research, shipped changes, and the questions still being worked through.</p>
            <Link className="button button-small" href="/journal">Read the blog →</Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="closing-title">
        <div className="container">
          <div className="closing">
            <p className="kicker">The first step is still the simplest</p>
            <h2 id="closing-title">Where are you going?</h2>
            <a className="button button-lime" href={RIDER_URL}>Choose my destination <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
