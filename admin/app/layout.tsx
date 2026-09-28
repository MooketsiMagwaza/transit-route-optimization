// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { SurfaceShell } from "@/components/surface-shell";

export const metadata: Metadata = {
  title: "Tsela Operations",
  description: "Create, maintain, and monitor the Gaborone route network.",
  applicationName: "Tsela Operations",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0f1117", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SurfaceShell>{children}</SurfaceShell>
      </body>
    </html>
  );
}
