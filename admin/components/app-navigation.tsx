"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "overview" | "routes" | "pathfind" | "dashboard" | "docs" | "guide" | "accounts" | "alerts";

const items: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/routes", label: "Routes", icon: "routes" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/observability", label: "Alerts", icon: "alerts" },
  { href: "/handbook", label: "Handbook", icon: "docs" },
];

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    routes: <><path d="M5 19V8.5a3.5 3.5 0 0 1 7 0v7a3.5 3.5 0 0 0 7 0V5" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></>,
    pathfind: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8 16 16 8" /><path d="m12 7 4 1 1 4" /></>,
    dashboard: <><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" /></>,
    docs: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    guide: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1-1.4 2.2M12 17h.01" /></>,
    accounts: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2"/><path d="M4 19c.4-4 2.2-6 5-6s4.6 2 5 6M14 13c3 0 5 1.7 5.5 5"/></>,
    alerts: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <Link className="sidebar-brand" href="/dashboard" aria-label="Tsela operations home">
        <span className="brand-logo" aria-hidden="true">T</span>
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
              <span className="nav-icon"><NavIcon name={item.icon} /></span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer"><span className="status-pip" /><span className="status-text">Platform connected</span></div>
    </nav>
  );
}
