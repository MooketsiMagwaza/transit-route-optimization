/** Marketing homepage: one clear promise, the real product, how it works, and direct entry points. */

import Link from "next/link";
import { Hero } from "../components/hero";
import { Showcase } from "../components/showcase";
import { TselaArt, type ArtName } from "../components/tsela-art";
import { ClayIcon, type ClayIconName, type ClayTone } from "../components/tsela-icon";
import { DOCS_URL, RIDER_URL } from "../lib/urls";

// The homepage shows live network numbers, so it renders per request (the data itself is cached for five minutes).
export const dynamic = "force-dynamic";

const STEPS: { title: string; copy: string; icon: ClayIconName; tone: ClayTone }[] = [
  { title: "Set your places", copy: "Use your location or tap a familiar spot. Search for where you are going; never type coordinates.", icon: "pin", tone: "green" },
  { title: "Compare real options", copy: "See where to board, how far you walk, the time, and any transfers. Pick one and the rest step aside.", icon: "routes", tone: "blue" },
  { title: "Ride one clear route", copy: "Follow the road-following route stop by stop, with a nudge before you need to ask to stop.", icon: "check", tone: "amber" },
  { title: "Keep the map true", copy: "Riders add tips and corrections. Builders use the same reviewed network through the API.", icon: "community", tone: "teal" },
];

const GATEWAYS: { kicker: string; title: string; copy: string; action: string; href: string; art: ArtName; primary?: boolean; internal?: boolean }[] = [
  { kicker: "Ride", title: "Plan a trip", copy: "Set two places and compare road-following combi routes.", action: "Open the rider app", href: RIDER_URL, art: "stop", primary: true },
  { kicker: "Product", title: "Explore services", copy: "See the rider, operations, community, and data tools separately.", action: "See every service", href: "/services", art: "map", internal: true },
  { kicker: "Developers", title: "Read the API", copy: "Authentication, endpoint reference, examples, and error responses.", action: "Open the developer guide", href: DOCS_URL, art: "guide" },
  { kicker: "Access", title: "Get an API key", copy: "Create an account, issue a key, and watch usage from the console.", action: "Open the console", href: `${DOCS_URL}/login`, art: "success" },
];

export default function Home() {
  return (
    <>
      <Hero />
      <Showcase />

      <section className="section" id="how-it-works" aria-labelledby="how-title">
        <div className="container">
          <header className="section-header">
            <p className="kicker">One trip, four steps</p>
            <h2 id="how-title">From two places to the right stop.</h2>
          </header>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li className="step" key={step.title}>
                <ClayIcon name={step.icon} tone={step.tone} size={64} />
                <span className="step-number">Step {index + 1}</span>
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
            {GATEWAYS.map((gateway) => {
              const body = (
                <>
                  <div>
                    <span className="kicker">{gateway.kicker}</span>
                    <h3>{gateway.title}</h3>
                    <p>{gateway.copy}</p>
                    <b>{gateway.action} →</b>
                  </div>
                  <TselaArt name={gateway.art} />
                </>
              );
              const className = `gateway-card${gateway.primary ? " gateway-primary" : ""}`;
              return gateway.internal
                ? <Link className={className} href={gateway.href} key={gateway.title}>{body}</Link>
                : <a className={className} href={gateway.href} key={gateway.title}>{body}</a>;
            })}
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
