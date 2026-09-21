/** Sticky public header with skip link, brand, and responsive navigation. */

import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="Tsela home"><BrandMark /></Link>
        <SiteNav />
      </div>
    </header>
  );
}
