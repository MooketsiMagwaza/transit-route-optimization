/** The real product: a screenshot of the running rider app, framed, no browser chrome to fake. */

import Image from "next/image";

export function Showcase() {
  return (
    <section className="section showcase" aria-labelledby="showcase-title">
      <div className="container showcase-stage">
        <figure className="window">
          <Image src="/shots/rider-routes-desktop.webp" alt="The Tsela rider app on a laptop: a full-screen map of Gaborone with seven coloured combi routes and a list of routes on the left" width={1440} height={900} unoptimized />
        </figure>
        <figcaption>A screenshot of the rider app as it runs today, not a mock-up.</figcaption>
      </div>
    </section>
  );
}
