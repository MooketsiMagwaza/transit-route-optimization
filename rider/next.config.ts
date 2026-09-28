import type { NextConfig } from "next";

/** Browser security policy for the rider application; geolocation stays available for live trips. */
const nextConfig: NextConfig = {
  experimental: { useOffline: true },
  headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Content-Type", value: "text/javascript; charset=utf-8" },
    ] }, { source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
    ] }];
  },
};

export default nextConfig;
