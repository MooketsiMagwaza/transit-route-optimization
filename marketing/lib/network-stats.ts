/** Reads the public network numbers for the homepage; returns null when the API is unreachable. */

// Inside Docker the API is reached by its service name; elsewhere the public base URL is used.
const API = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type NetworkStats = { routes: number; verified: number };

export async function getNetworkStats(): Promise<NetworkStats | null> {
  try {
    const response = await fetch(`${API}/api/routes`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const routes = (await response.json()) as { verificationStatus?: string }[];
    return { routes: routes.length, verified: routes.filter((route) => route.verificationStatus === "field_verified").length };
  } catch {
    return null;
  }
}
