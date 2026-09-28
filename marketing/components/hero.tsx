/** Marketing hero: one promise, the hand-drawn combi, and the network's live numbers. */

import { RIDER_URL } from "../lib/urls";
import { getNetworkStats } from "../lib/network-stats";
import { TselaArt } from "./tsela-art";

export async function Hero() {
  const stats = await getNetworkStats();
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Know which combi gets you there.</h1>
        <p className="lede">
          Choose where you are and where you&apos;re going. Tsela shows the route, where to hop on,
          and where to get off, on real roads.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={RIDER_URL}>Plan my trip</a>
          <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">→</span></a>
        </div>
        <dl className="hero-stats" aria-label="The network today">
          <div><dt>Routes mapped</dt><dd>{stats ? stats.routes : "7+"}</dd></div>
          <div><dt>Field verified</dt><dd>{stats ? stats.verified : "0"}</dd></div>
          <div><dt>Where it comes from</dt><dd>Riders</dd></div>
        </dl>
      </div>
      <div className="hero-art">
        <TselaArt name="combi" title="A combi with passengers heading down the road" />
      </div>
    </section>
  );
}
