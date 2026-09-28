/** Mission, principles, metadata, and evidence boundaries for the company surface. */

import type { Metadata } from "next";
import { TselaArt } from "../../components/tsela-art";

export const metadata: Metadata = { title: "About", description: "Why Tsela is building a community-checked map of Gaborone's combi network.", alternates: { canonical: "/company" } };

export default function CompanyPage() {
  return (
    <>
      <section className="page-hero container">
      <div>
        <p className="kicker">About Tsela</p>
        <h1>A combi map built from local truth.</h1>
        <p className="lede">In Gaborone, useful routes exist, but the knowledge often lives in conversations, habits, and handwritten lists. Tsela makes that shared intelligence visible without pretending informal transit is a fixed timetable.</p>
      
      </div>
      <TselaArt name="community" />
      </section>
      <section className="section">
        <div className="container split">
          <header>
            <p className="kicker">How we build</p>
            <h2>Not a timetable with a new logo.</h2>
          </header>
          <dl className="principle-list">
            <div><dt>Flexible</dt><dd>Routes, request stops, and local landmarks, not imaginary precision.</dd></div>
            <div><dt>Trustworthy</dt><dd>Evidence, freshness, confidence, and review states on community data.</dd></div>
            <div><dt>Reachable</dt><dd>Map-first on the web, with a path toward low-data, SMS, and USSD access.</dd></div>
          </dl>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="callout-band">
            <p className="kicker">Built first for Gaborone</p>
            <h2>The network grows from verified local knowledge, not imported assumptions.</h2>
            <p>Every expansion should make the map more honest, useful, and accountable to the people who use it.</p>
          </div>
        </div>
      </section>
    </>
  );
}
