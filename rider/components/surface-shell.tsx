"use client";

/** Navigation for the rider app: a Material bottom bar on phones and a left rail on desktop, with Plan first in the rail. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TselaIcon, TselaMark, type TselaIconName } from "@/components/tsela-icon";
import { ThemeToggle } from "@/components/theme-toggle";

function RiderDock() {
  const pathname = usePathname();
  const links: { href: string; label: string; icon: TselaIconName; primary?: boolean }[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/routes", label: "Routes", icon: "routes" },
    { href: "/plan", label: "Plan", icon: "plan", primary: true },
    { href: "/community", label: "Community", icon: "community" },
    { href: "/guide", label: "Guide", icon: "guide" },
  ];
  const current = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <aside className="rider-dock" aria-label="Rider navigation">
      <Link className="rail-brand" href="/" aria-label="Tsela home"><TselaMark size={46} /></Link>
      <nav className="dock-nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={[link.primary ? "primary" : "", current(link.href) ? "active" : ""].filter(Boolean).join(" ") || undefined} aria-current={current(link.href) ? "page" : undefined}>
            <span className="nav-indicator"><TselaIcon name={link.icon} size={24} /></span><span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="dock-theme"><ThemeToggle /></div>
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
