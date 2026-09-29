"use client";

/** Operations sidebar: the Tsela mark, six places with clay icons, and a connection indicator. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TselaIcon, TselaMark, type TselaIconName } from "@/components/tsela-icon";
import { ThemeToggle } from "@/components/theme-toggle";

const items: Array<{ href: string; label: string; icon: TselaIconName }> = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/routes", label: "Routes", icon: "routes" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/observability", label: "Alerts", icon: "alerts" },
  { href: "/moderation", label: "Moderation", icon: "moderation" },
  { href: "/handbook", label: "Handbook", icon: "handbook" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <Link className="sidebar-brand" href="/dashboard" aria-label="Tsela operations home">
        <TselaMark size={40} />
        <span className="brand-name">Tsela <small>Operations</small></span>
      </Link>
      <ul className="nav-links">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`nav-link${isActive(pathname, item.href) ? " active" : ""}`}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <span className="nav-icon"><TselaIcon name={item.icon} size={22} /></span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer"><span className="status-pip" /><span className="status-text">Platform connected</span><ThemeToggle /></div>
    </nav>
  );
}
