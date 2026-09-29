/** Service catalog metadata and separate rider, operations, and developer products. */

import type { Metadata } from "next";
import { TselaArt } from "../../components/tsela-art";
import { DOCS_URL, RIDER_URL } from "../../lib/urls";

export const metadata: Metadata = { title: "Product", description: "Explore Tsela's rider trip planner, community-checked network operations, and developer API.", alternates: { canonical: "/services" } };

const services = [
  { number: "01", title: "Rider map", status: "Live preview", copy: "Search every route, choose places directly on the map, widen the search area, and compare journeys that follow the road network.", action: "Plan a journey", href: RIDER_URL, tone: "blue" },
  { number: "02", title: "Network operations", status: "Restricted workspace", copy: "Approved operators review routes, stops, evidence, and coverage. This workspace is intentionally absent from the public rider navigation.", action: "Administrator access only", href: null, tone: "orange" },
  { number: "03", title: "Transit data API", status: "Developer preview", copy: "Read published routes and their road-following geometry through a keyed, metered JSON contract. More endpoints are added only once they are documented and tested.", action: "Read the API guide", href: DOCS_URL, tone: "lime" },
];

export default function ServicesPage() {
  return (
    <>
      <section className="page-hero-band">
        <div className="page-hero container">
          <div>
            <p className="kicker">The Tsela product</p>
            <h1>One route network. Three useful tools.</h1>
            <p className="lede">Riders get clear trip choices. Community and operations keep the map accountable. Builders get a readable, metered API.</p>
          </div>
          <TselaArt name="map" />
        </div>
      </section>
      <section className="container service-list" aria-label="Services">
        {services.map((service) => (
          <article className={`service-row tone-${service.tone}`} key={service.title}>
            <span className="service-number">{service.number}</span>
            <div>
              <span className="status-label">{service.status}</span>
              <h2>{service.title}</h2>
              <p>{service.copy}</p>
            </div>
            {service.href ? <a className="button button-small" href={service.href}>{service.action} <span aria-hidden="true">↗</span></a> : <strong className="service-note">{service.action}</strong>}
          </article>
        ))}
        <p className="lede service-list-note">Low-data and USSD channels come after the core network is trustworthy: reach is only useful once the route knowledge underneath it is clear, fresh, and reviewable.</p>
      </section>
    </>
  );
}
