"use client";

/** Authenticated community workspace with route contribution and searchable discussion tabs. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ContributionMap } from "@/components/contribution-map";
import { ClayIcon } from "@/components/tsela-icon";
import { ReportButton } from "@/components/report-button";
import { isNetworkFailure, queuePost } from "@/lib/outbox";
import { accountApi, Account, CommunityPost, clearAccountToken, getAccountToken } from "@/lib/account-api";
import { apiClient, Route } from "@/lib/api-client";

type Point = { lat: number; long: number };

export default function CommunityPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<"add" | "board">("add");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [query, setQuery] = useState("");
  const [postRouteId, setPostRouteId] = useState("");
  const [postKind, setPostKind] = useState<"tip" | "discussion">("tip");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [waypoints, setWaypoints] = useState<Point[]>([]);
  const [geometry, setGeometry] = useState<[number, number][]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const token = getAccountToken();
    if (!token) { setAuthLoading(false); return; }
    Promise.all([accountApi.me(), apiClient.routes.list(), accountApi.posts()]).then(([profile, routeList, boardPosts]) => {
      if (!cancelled) { setAccount(profile); setRoutes(routeList); setPosts(boardPosts); }
    }).catch(() => { clearAccountToken(); }).finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function searchPosts(event?: React.FormEvent) { event?.preventDefault(); setPostLoading(true); setError(""); try { setPosts(await accountApi.posts(query)); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Could not search the board"); } finally { setPostLoading(false); } }
  async function createPost(event: React.FormEvent) { event.preventDefault(); setPostLoading(true); setError(""); setNotice(""); const draft = { routeId: postRouteId ? Number(postRouteId) : undefined, kind: postKind, title: postTitle, body: postBody }; const key = crypto.randomUUID().replaceAll("-", ""); try { const created = await accountApi.createPost(draft, key); setPosts([created, ...posts]); setPostTitle(""); setPostBody(""); } catch (requestError: unknown) { if (isNetworkFailure(requestError)) { queuePost(draft, key); setPostTitle(""); setPostBody(""); setNotice("You are offline. Your post is saved on this device and will be sent when you reconnect."); } else { setError(requestError instanceof Error ? requestError.message : "Could not publish your post"); } } finally { setPostLoading(false); } }

  async function updatePreview(points: Point[]) { const requestId = ++requestRef.current; if (points.length < 2) { setGeometry([]); return; } setPreviewLoading(true); setError(""); try { const preview = await apiClient.community.preview(points, getAccountToken()); if (requestId === requestRef.current) setGeometry(preview.coordinates); } catch (previewError: unknown) { if (requestId === requestRef.current) setError(previewError instanceof Error ? previewError.message : "Could not follow the road between those points"); } finally { if (requestId === requestRef.current) setPreviewLoading(false); } }
  function addPoint(point: Point) { const points = [...waypoints, point]; setError(""); setWaypoints(points); setSubmittedId(null); void updatePreview(points); }
  function undoPoint() { const points = waypoints.slice(0, -1); setWaypoints(points); void updatePreview(points); }
  function reset() { requestRef.current += 1; setWaypoints([]); setGeometry([]); setError(""); setSubmittedId(null); }
  async function submitRoute(event: React.FormEvent) { event.preventDefault(); if (waypoints.length < 2 || !name.trim()) return; setSubmitLoading(true); setError(""); try { const contribution = await apiClient.community.contribute({ name: name.trim(), notes: notes.trim() || undefined, waypoints }, getAccountToken()); setSubmittedId(contribution.id); } catch (submitError: unknown) { setError(submitError instanceof Error ? submitError.message : "Could not send this route for review"); } finally { setSubmitLoading(false); } }

  if (authLoading) return <div className="page-loading-shell"><div className="page-loading-brand">TS</div><div className="page-loading-lines"><span/><span/><span/></div><p>Checking your community profile…</p></div>;
  if (!account) return <div className="community-gate"><ClayIcon name="community" size={72} /><span className="page-eyebrow">Members only</span><h1>Community knowledge needs accountable contributors.</h1><p>Sign in before tracing a route, posting a tip, or reading the discussion board. Public route planning stays open to everyone.</p><div><Link className="btn btn-dark" href="/account/login">Sign in or join →</Link><Link className="btn btn-secondary" href="/routes">Keep exploring routes</Link></div></div>;

  return <div className="community-page">
    <header className="community-heading"><div><span className="page-eyebrow">Community · signed in as {account.displayName}</span><h1>Share what<br/>the map misses.</h1></div><p>Trace a missing corridor or search route-specific tips. Everything is plain text, attributed, and route contributions remain unpublished until review.</p></header>
    <div className="community-tabs" role="tablist"><button className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}><span>01</span>Add a route</button><button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}><span>02</span>Search & community board</button></div>
    {error && <div className="community-global-error alert alert-error">{error}</div>}
    {tab === "add" ? <section className="community-workspace">
      <ContributionMap waypoints={waypoints} geometry={geometry} onAddPoint={addPoint} onBoundaryError={setError} />
      <aside className="contribution-panel"><div className="contribution-progress"><span style={{ width: `${Math.min(100, waypoints.length * 22)}%` }} /></div><span className="panel-kicker">Route contribution</span><h2>{waypoints.length === 0 ? "Start on the map" : `${waypoints.length} ${waypoints.length === 1 ? "point" : "points"} added`}</h2><p className="service-area-note"><strong>Greater Gaborone only</strong>Contributions are currently limited to Gaborone, Oodi, Mmopane, Metsimotlhabe, Phakalane, and the surrounding metro area.</p><div className="contribution-instructions"><div className={waypoints.length > 0 ? "done" : "active"}><span>1</span><p><strong>Set the start</strong>Tap where the combi begins this section.</p></div><div className={waypoints.length > 1 ? "done" : waypoints.length === 1 ? "active" : ""}><span>2</span><p><strong>Trace the road</strong>Add stops and steering points where the preview turns incorrectly.</p></div><div className={waypoints.length > 2 ? "active" : ""}><span>3</span><p><strong>Describe and submit</strong>A reviewer checks it before riders see it.</p></div></div><div className="draw-actions"><button type="button" onClick={undoPoint} disabled={!waypoints.length}>Undo last</button><button type="button" onClick={reset} disabled={!waypoints.length}>Clear route</button></div>{previewLoading && <div className="calculation-progress"><span/><p>Following the road through your points…</p></div>}<form className="contribution-form" onSubmit={submitRoute}><label>Route or section name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mmopane to Bus Rank" maxLength={120} required /></label><label>What should reviewers know? <small>optional</small><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Direction, landmarks, fare, request stops…" maxLength={1000} /></label><button className="btn btn-dark btn-full" disabled={waypoints.length < 2 || !name.trim() || previewLoading || submitLoading}>{submitLoading ? "Sending for review…" : "Submit for review"}</button></form>{submittedId && <div className="contribution-success"><span>✓</span><div><strong>Contribution #{submittedId} received</strong><p>It is pending review and is not visible to riders yet.</p></div></div>}</aside>
    </section> : <section className="community-board">
      <aside className="board-compose"><span className="page-eyebrow">Post local context</span><h2>Help the next rider.</h2><form onSubmit={createPost}><label>Post type<select value={postKind} onChange={(event) => setPostKind(event.target.value as "tip" | "discussion")}><option value="tip">Route tip</option><option value="discussion">General discussion</option></select></label><label>Route <small>optional</small><select value={postRouteId} onChange={(event) => setPostRouteId(event.target.value)}><option value="">General board</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select></label><label>Headline<input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} minLength={3} maxLength={120} required /></label><label>Tip or question<textarea value={postBody} onChange={(event) => setPostBody(event.target.value)} minLength={3} maxLength={1500} required /></label>{notice && <div className="contribution-success" role="status"><span>✓</span><div><strong>Saved for later</strong><p>{notice}</p></div></div>}<button className="btn btn-dark" disabled={postLoading}>{postLoading ? "Publishing…" : "Publish to board →"}</button></form></aside>
      <div className="board-feed"><form className="board-search" onSubmit={searchPosts}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a route, stop, tip or question" aria-label="Search community posts"/><button>Search</button></form><div className="board-post-list">{postLoading && <div className="route-list-skeleton"><span/><span/></div>}{!postLoading && posts.length === 0 && <div className="home-empty"><strong>No posts match yet.</strong><p>Start the first useful thread for this part of the network.</p></div>}{!postLoading && posts.map((post) => <article key={post.id}><div><span className={`post-kind ${post.kind}`}>{post.kind}</span><small>{post.routeId ? routes.find((route) => route.id === post.routeId)?.name ?? "Route" : "General board"}</small></div><h3>{post.title}</h3><p>{post.body}</p><footer><strong>{post.authorName}</strong><time>{new Date(post.createdAt).toLocaleDateString()}</time><ReportButton postId={post.id} /></footer></article>)}</div></div>
    </section>}
  </div>;
}
