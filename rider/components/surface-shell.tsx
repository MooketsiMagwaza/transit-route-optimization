"use client";

/** Navigation for the rider app: a bottom tab bar on phones and a left rail on desktop, with a raised orange Plan button. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClayIcon, TselaIcon, TselaMark, type ClayIconName } from "@/components/tsela-icon";

function RiderDock() {
  const pathname = usePathname();
  const links: { href: string; label: string; icon: ClayIconName; primary?: boolean }[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/routes", label: "Routes", icon: "routes" },
    { href: "/plan", label: "Plan a trip", icon: "plan", primary: true },
    { href: "/community", label: "Community", icon: "community" },
    { href: "/guide", label: "Guide", icon: "guide" },
  ];
  const current = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <aside className="rider-dock" aria-label="Rider navigation">
      <Link className="rail-brand" href="/" aria-label="Tsela home"><TselaMark size={46} /></Link>
      <nav className="dock-nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={[link.primary ? "primary" : "", current(link.href) ? "active" : ""].filter(Boolean).join(" ") || undefined} aria-label={link.primary ? link.label : undefined} aria-current={current(link.href) ? "page" : undefined}>
            {link.primary ? <TselaIcon name="plan" size={30} /> : <><ClayIcon name={link.icon} size={34} /><span>{link.label}</span></>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function SurfaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-surface">
      <a className="skip-link" href="#main">Skip to content</a>
      <RiderDock />
      <main className="public-main" id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
