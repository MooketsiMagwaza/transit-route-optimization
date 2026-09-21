/** Root marketing layout, metadata, navigation, and footer composition. */

import type { Metadata, Viewport } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { CookieConsent } from "../components/cookie-consent";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Tsela | Find your combi route in Gaborone", template: "%s | Tsela" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Gaborone combi routes", "Botswana public transport", "combi map", "Gaborone route planner", "minibus routes"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "en_BW", url: "/", siteName: SITE_NAME, title: "Tsela | Know which combi gets you there", description: SITE_DESCRIPTION, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Tsela route map from your location to a destination" }] },
  twitter: { card: "summary_large_image", title: "Tsela | Know which combi gets you there", description: SITE_DESCRIPTION, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
  category: "transportation",
};

export const viewport: Viewport = { themeColor: "#fffdf3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: "en-BW" }).replace(/</g, "\\u003c") }} />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
