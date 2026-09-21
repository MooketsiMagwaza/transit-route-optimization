"use client";

/** Primary navigation with a current-page indicator and a keyboard-accessible mobile menu. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RIDER_URL } from "../lib/urls";

const LINKS = [
  { href: "/services", label: "Product" },
  { href: "/developers", label: "Developers" },
  { href: "/journal", label: "Blog" },
  { href: "/company", label: "About" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  // Remember which page the menu was opened on so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        {LINKS.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>)}
      </nav>
      <a className="button button-primary button-small header-cta" href={RIDER_URL}>Plan a trip</a>
      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        <span className="menu-icon" aria-hidden="true" />
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
          {LINKS.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>)}
          <a href={RIDER_URL}>Open the rider app</a>
        </nav>
      )}
    </>
  );
}
