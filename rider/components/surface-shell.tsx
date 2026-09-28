"use client";

/** Persistent bottom dock for the rider app at every viewport size, with Tsela's custom icons. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClayIcon, type ClayIconName } from "@/components/tsela-icon";

function RiderDock() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", icon: "home" as ClayIconName },
    { href: "/plan", label: "Plan", icon: "plan" as ClayIconName },
    { href: "/routes", label: "Routes", icon: "routes" as ClayIconName },
    { href: "/community", label: "Community", icon: "community" as ClayIconName },
    { href: "/guide", label: "Guide", icon: "guide" as ClayIconName },
  ];

  return (
    <aside className="rider-dock" aria-label="Rider navigation">
      <nav className="dock-nav">
        {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`)) ? "active" : undefined}>
            <ClayIcon name={link.icon} size={32} /><span>{link.label}</span>
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
