"use client";

/** Personalized rider home: profile state, saved routes, recent routes, and next actions. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AllRoutesMap } from "@/components/all-routes-map";
import { TselaArt } from "@/components/tsela-art";
import { ClayIcon } from "@/components/tsela-icon";
import { accountApi, Account, clearAccountToken, getAccountToken } from "@/lib/account-api";
import { apiClient, Node, Route, RouteGeometry } from "@/lib/api-client";
import { readBookmarkedRouteIds, readRecentRouteIds, subscribeToRouteLibrary } from "@/lib/recent-routes";

export default function RiderHome() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [wide, setWide] = useState(false);
  const [network, setNetwork] = useState<{ routes: Route[]; nodes: Record<number, Node[]>; geometries: Record<number, RouteGeometry> } | null>(null);

  // The network map only loads on wide screens, so phones on mobile data never download it here.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!wide || network) return;
    let cancelled = false;
    apiClient.routes.network().then((details) => {
      if (cancelled) return;
      setNetwork({
        routes: details.map(({ route }) => route),
        nodes: Object.fromEntries(details.map(({ route, stops }) => [route.id, stops])),
        geometries: Object.fromEntries(details.map(({ route, geometry }) => [route.id, geometry])),
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [wide, network]);

  useEffect(() => {
    let cancelled = false;
    const refreshLibrary = () => { setSavedIds(readBookmarkedRouteIds()); setRecentIds(readRecentRouteIds()); };
    refreshLibrary();
    const unsubscribe = subscribeToRouteLibrary(refreshLibrary);
    Promise.all([
      apiClient.routes.list(),
      getAccountToken() ? accountApi.me().catch(() => { clearAccountToken(); return null; }) : Promise.resolve(null),
    ]).then(([network, currentAccount]) => {
      if (!cancelled) { setRoutes(network); setAccount(currentAccount); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const savedRoutes = useMemo(() => savedIds.map((id) => routes.find((route) => route.id === id)).filter((route): route is Route => Boolean(route)), [savedIds, routes]);
  const recentRoutes = useMemo(() => recentIds.map((id) => routes.find((route) => route.id === id)).filter((route): route is Route => Boolean(route)), [recentIds, routes]);

  return <div className="rider-home">
    <header className="home-profile-row">
      <div className="profile-chip"><span>{account?.displayName.slice(0, 2).toUpperCase() ?? "HI"}</span><div><small>{account ? "Your profile" : "Hello"}</small><strong>{account?.displayName ?? "Guest rider"}</strong></div></div>
      {account ? <button onClick={() => { clearAccountToken(); setAccount(null); }}>Sign out</button> : <Link href="/account/login">Sign in</Link>}
    </header>

    <section className="home-hero-panel">
      <div><span className="page-eyebrow">Dumela</span><h1>Where to today?</h1><p>Tell Tsela where you are and where you are going. It shows the combi route, where to hop on, and where to get off.</p><div className="home-hero-actions"><Link className="btn btn-dark" href="/plan">Plan my trip</Link><Link className="btn btn-secondary" href="/routes">Browse the map</Link></div><p className="home-network-count"><strong>{loading ? "—" : routes.length}</strong> combi routes on the map so far</p></div>
      <TselaArt name="combi" className="home-hero-art" />
    </section>

    {wide && <aside className="home-map-card" aria-label="The Tsela network">
      <div className="home-map-head"><div><span>The network</span><h2>Every route, one map</h2></div><Link href="/routes">Open the map</Link></div>
      <div className="home-map-frame">{network ? <AllRoutesMap routes={network.routes} nodesByRoute={network.nodes} geometries={network.geometries} selectedRouteId={null} onSelect={(routeId) => router.push(`/routes?route=${routeId}`)} /> : <div className="route-list-skeleton"><span /><span /><span /></div>}</div>
    </aside>}

    <section className="feature-list" aria-labelledby="how-title">
      <h2 id="how-title">How Tsela works</h2>
      <div className="feature-row"><ClayIcon name="pin" size={48} /><div><strong>Set your places</strong><span>Use your location or tap a familiar spot on the map.</span></div></div>
      <div className="feature-row"><ClayIcon name="routes" size={48} tone="blue" /><div><strong>Compare real routes</strong><span>See where to hop on, how far you walk, and any transfers.</span></div></div>
      <div className="feature-row"><ClayIcon name="check" size={48} tone="amber" /><div><strong>Ride with confidence</strong><span>Follow the stops and get a nudge before yours.</span></div></div>
    </section>

    <section className="home-library-grid">
      <article><div className="home-section-heading"><ClayIcon name="bookmark" size={40} tone="blue" /><div><span>Bookmarks</span><h2>Your saved routes</h2></div><Link href="/routes">Find routes</Link></div>{loading ? <div className="route-list-skeleton"><span/><span/></div> : savedRoutes.length ? <div className="home-route-list">{savedRoutes.map((route) => <Link key={route.id} href={`/routes?route=${route.id}`}><span>★</span><strong>{route.name}</strong><b>→</b></Link>)}</div> : <div className="home-empty"><strong>No bookmarks yet.</strong><p>Open Explore routes and save the corridors you use most.</p><Link href="/routes">Explore the network</Link></div>}</article>
      <article><div className="home-section-heading"><ClayIcon name="history" size={40} tone="amber" /><div><span>Recent</span><h2>Pick up where you left off</h2></div></div>{loading ? <div className="route-list-skeleton"><span/><span/></div> : recentRoutes.length ? <div className="home-route-list">{recentRoutes.map((route) => <Link key={route.id} href={`/routes?route=${route.id}`}><span>↺</span><strong>{route.name}</strong><b>→</b></Link>)}</div> : <div className="home-empty"><strong>Your route history is clear.</strong><p>Routes you inspect will appear here on this device.</p></div>}</article>
    </section>

    <section className="home-community-callout"><TselaArt name="community" /><div><span className="page-eyebrow">Local knowledge matters</span><h2>Know a turn, stop, or useful tip?</h2><p>Sign in to trace a missing route or help another rider understand what to expect.</p></div><Link href="/community">Open Community</Link></section>
  </div>;
}
