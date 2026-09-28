// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@/app/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { SurfaceShell } from "@/components/surface-shell";
import { OfflineBanner } from "@/components/offline-banner";
import { OutboxFlusher } from "@/components/outbox-flusher";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Tsela Rider | Find your way through Gaborone",
  description: "Choose a destination and find practical combi routes across Gaborone.",
  applicationName: "Tsela Rider",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Tsela", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OfflineBanner />
        <ServiceWorkerRegister />
        <OutboxFlusher />
        <SurfaceShell>{children}</SurfaceShell>
      </body>
    </html>
  );
}
