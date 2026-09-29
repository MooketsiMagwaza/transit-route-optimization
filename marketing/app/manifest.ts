/** Install metadata for the public Tsela identity and its generated icon. */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Tsela", short_name: "Tsela", description: "Know which combi gets you there in Gaborone.", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#ffffff", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
