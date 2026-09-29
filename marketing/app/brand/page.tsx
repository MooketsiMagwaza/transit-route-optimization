/** Public identity reference with downloadable Tsela logo and icon usage guidance. */

import type { Metadata } from "next";
import { TselaArt } from "../../components/tsela-art";
import { BrandMark } from "../../components/brand-mark";

export const metadata: Metadata = { title: "Brand and icons", description: "The working Tsela name, route mark, app icon, hand-drawn illustration style, and public colour system.", alternates: { canonical: "/brand" } };

const swatches = [
  { name: "Brand green", hex: "#146C2E", className: "green" },
  { name: "Action blue", hex: "#0B57D0", className: "blue" },
  { name: "Canvas", hex: "#F8F9FA", className: "cream" },
  { name: "Ink", hex: "#1F1F1F", className: "ink" },
];

export default function BrandPage() {
  return (
    <>
      <section className="page-hero container">
      <div>
        <p className="kicker">Identity · working direction</p>
        <h1>A name that feels like a way forward.</h1>
        <p className="lede">Tsela means path, road, or way in Setswana. The public identity is warm and direct; TransitOS remains only the internal platform name while local-language, domain, and trademark validation continues.</p>
      
      </div>
      <TselaArt name="success" />
      </section>
      <section className="container brand-showcase" aria-label="Logo and icon">
        <article className="brand-card brand-card-lockup">
          <span className="kicker">Primary lockup</span>
          <BrandMark large />
          <a className="text-link" href="/brand/tsela-mark.svg" download>Download SVG ↓</a>
        </article>
        <article className="brand-card brand-card-icon">
          <span className="kicker">App icon</span>
          <BrandMark compact large />
          <p>The route loops from a starting point to a destination and stays legible at favicon and home-screen size.</p>
        </article>
      </section>
      <section className="section">
        <div className="container split">
          <header>
            <p className="kicker">Colour system</p>
            <h2>Warm enough to welcome. Clear enough to trust.</h2>
          </header>
          <div className="swatches">
            {swatches.map((swatch) => <span className={`swatch ${swatch.className}`} key={swatch.name}><b>{swatch.name}</b><code>{swatch.hex}</code></span>)}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container split">
          <header>
            <p className="kicker">Illustration</p>
            <h2>Hand-drawn, not generated.</h2>
            <p>Every scene is drawn from simple shapes by a seeded pen that wobbles each stroke, printed in black ink with the spot colour a few pixels off-register. Used sparingly: onboarding, empty states, and a single moment per marketing page.</p>
          </header>
          <div className="brand-showcase">
            <article className="brand-card"><TselaArt name="guide" title="A signpost with the road ahead" /></article>
            <article className="brand-card"><TselaArt name="stop" title="A combi stop with a shelter and a bench" /></article>
          </div>
        </div>
      </section>
      <section className="container brand-caution-wrap">
        <div className="brand-caution">
          <strong>Working identity, not legal clearance.</strong>
          <p>Before public launch, complete Botswana and regional trademark searches, domain and handle checks, and pronunciation testing with Setswana-speaking riders.</p>
        </div>
      </section>
    </>
  );
}
