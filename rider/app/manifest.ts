/** Installable rider-app metadata: icons, colours, and shortcuts to the common jobs. */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tsela Rider",
    short_name: "Tsela",
    description: "Find practical combi routes across Gaborone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en-BW",
    categories: ["travel", "navigation", "transportation"],
    background_color: "#f6f4f0",
    theme_color: "#f6f4f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Plan a trip", url: "/plan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Explore routes", url: "/routes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
