"use client";

/** Persistent bottom navigation for the rider app at every viewport size. */

import Link from "next/link";
import { usePathname } from "next/navigation";

function DockIcon({ name }: { name: "home" | "plan" | "routes" | "community" | "guide" }) {
  const paths = {
    home: <><path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10M10 20v-6h4v6"/></>,
    plan: <><circle cx="7" cy="17" r="2"/><circle cx="17" cy="7" r="2"/><path d="M8.5 15.5 15.5 8.5M7 5v4M5 7h4M15 17h4"/></>,
    routes: <><path d="M5 6h14M5 12h14M5 18h14"/><circle cx="8" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="10" cy="18" r="1.5"/></>,
    community: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2"/><path d="M4 19c.4-4 2.2-6 5-6s4.6 2 5 6M14 13c3 0 5 1.7 5.5 5"/></>,
    guide: <><path d="M6 4h9a3 3 0 0 1 3 3v13H9a3 3 0 0 1-3-3V4Z"/><path d="M9 20a3 3 0 0 1 3-3h6M10 8h4M10 12h5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function RiderDock() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", icon: "home" as const },
    { href: "/plan", label: "Plan", icon: "plan" as const },
    { href: "/routes", label: "Routes", icon: "routes" as const },
    { href: "/community", label: "Community", icon: "community" as const },
    { href: "/guide", label: "Guide", icon: "guide" as const },
  ];

  return (
    <aside className="rider-dock" aria-label="Rider navigation">
      <nav className="dock-nav">
        {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`)) ? "active" : undefined}>
            <DockIcon name={link.icon} /><span>{link.label}</span>
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
