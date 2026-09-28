import { AppNavigation } from "@/components/app-navigation";

export function SurfaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell ops-surface">
      <a className="skip-link" href="#main">Skip to content</a>
      <AppNavigation />
      <main className="main-content" id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
