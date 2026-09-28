/** Installable operations workspace: icons and colours; the app itself stays behind admin sign-in. */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tsela Operations",
    short_name: "Tsela Ops",
    description: "Monitor and maintain the Gaborone route network.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    lang: "en-BW",
    categories: ["business", "productivity"],
    background_color: "#0f1117",
    theme_color: "#0f1117",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
