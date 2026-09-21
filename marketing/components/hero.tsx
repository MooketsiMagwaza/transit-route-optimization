/** Static product hero that explains Tsela without downloading a browser map. */

import { RIDER_URL } from "../lib/urls";
import { RouteNetworkIllustration } from "./route-network-illustration";

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span aria-hidden="true" />Built with Gaborone, route by route</p>
        <h1 id="hero-title">Know which combi gets you there.</h1>
        <p className="lede">
          Choose where you are and where you&apos;re going. Tsela compares the route,
          boarding point, transfers, and the right stop.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={RIDER_URL}>Plan my trip <span aria-hidden="true">→</span></a>
          <a className="text-link" href="#how-it-works">See how it works</a>
        </div>
        <dl className="proof-list" aria-label="Product capabilities">
          <div><dt>Road aligned</dt><dd>Routes follow streets</dd></div>
          <div><dt>Local first</dt><dd>Built for Gaborone</dd></div>
          <div><dt>One clear answer</dt><dd>Start to right stop</dd></div>
        </dl>
      </div>
      <RouteNetworkIllustration />
    </section>
  );
}
