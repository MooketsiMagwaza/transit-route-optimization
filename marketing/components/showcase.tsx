/** The real product: screenshots of the running rider app in a window and on a phone. */

import Image from "next/image";

export function Showcase() {
  return (
    <section className="section showcase" aria-labelledby="showcase-title">
      <div className="container">
        <header className="section-header">
          <p className="kicker">The real thing</p>
          <h2 id="showcase-title">Every route on one map, before you leave home.</h2>
          <p className="lede">These are screenshots of the app as it runs, not mock-ups.</p>
        </header>
        <div className="showcase-stage">
          <figure className="window">
            <div className="window-bar" aria-hidden="true"><i /><i /><i /><span>Tsela · Routes</span></div>
            <Image src="/shots/rider-routes-desktop.webp" alt="The Tsela rider app on a laptop: a full-screen map of Gaborone with seven coloured combi routes and a list of routes on the left" width={1440} height={900} unoptimized />
          </figure>
          <figure className="phone">
            <Image src="/shots/rider-home-phone.webp" alt="The Tsela rider app on a phone: Where to today, with the hand-drawn combi and a blue Plan my trip button" width={780} height={1688} unoptimized />
          </figure>
        </div>
      </div>
    </section>
  );
}
