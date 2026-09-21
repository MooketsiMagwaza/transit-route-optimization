/** Structured public footer: product, company, and legal destinations. */

import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { DOCS_URL, RIDER_URL } from "../lib/urls";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="brand" href="/" aria-label="Tsela home"><BrandMark /></Link>
          <p>Know which combi gets you there.</p>
        </div>
        <nav aria-labelledby="footer-product">
          <h2 id="footer-product">Product</h2>
          <a href={RIDER_URL}>Rider app</a>
          <Link href="/services">Services</Link>
          <Link href="/developers">Developers</Link>
          <a href={DOCS_URL}>API access</a>
        </nav>
        <nav aria-labelledby="footer-company">
          <h2 id="footer-company">Company</h2>
          <Link href="/company">About</Link>
          <Link href="/journal">Blog</Link>
          <Link href="/brand">Brand</Link>
        </nav>
        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal">Legal</h2>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/refunds">Refunds</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </nav>
      </div>
      <div className="container footer-base">
        <span>Built in Gaborone. Route details need recent local confirmation.</span>
        <span>Tsela is a working brand name.</span>
      </div>
    </footer>
  );
}
