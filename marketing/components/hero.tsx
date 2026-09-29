/** Marketing hero: one promise on a dark band, read by the real product screenshot below it. */

import { RIDER_URL } from "../lib/urls";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <h1 id="hero-title">Know which combi gets you there.</h1>
        <p className="lede">
          Choose where you are and where you&apos;re going. Tsela shows the route, where to hop on,
          and where to get off, on real roads.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={RIDER_URL}>Plan my trip</a>
          <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
  );
}
