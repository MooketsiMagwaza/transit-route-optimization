/** Rider workflows plus attributed, time-sensitive local guidance from the supplied blog export. */

import Link from "next/link";
import { ClayIcon } from "@/components/tsela-icon";

const fieldTips = [
  { title: "Leave a time buffer", copy: "Combis may wait for passengers or pause along a corridor. Do not plan a tight connection when arrival time matters." },
  { title: "Ask for your stop", copy: "If the route is unfamiliar, tell the driver or conductor where you need to get off and ask them to call it out." },
  { title: "Carry small change", copy: "Smaller notes and coins can make boarding easier. Always confirm the current fare locally before paying." },
  { title: "Arrive early for long trips", copy: "Long-distance seats can fill quickly. Build in extra time at the rank and bring water or other essentials." },
];

const workflows = [
  {
    number: "01",
    title: "Find a combi near you",
    audience: "Rider",
    steps: [
      "Open Plan a trip from the site navigation.",
      "Tap your destination directly on the Gaborone map.",
      "Choose a larger search area if you are willing to walk farther.",
      "Review nearby routes and confirm the destination.",
    ],
    href: "/plan",
    action: "Open route finder",
  },
  {
    number: "02",
    title: "Plan a journey",
    audience: "Rider",
    steps: [
      "After confirming the destination, tap your starting point on the map.",
      "Choose Find combi options—no coordinates need to be entered.",
      "Review the boarding point, alighting point, walking estimate, and transfers.",
      "Start again at any time to choose different places.",
    ],
    href: "/plan",
    action: "Plan a journey",
  },
  {
    number: "03",
    title: "Read your results",
    audience: "Rider",
    steps: [
      "Use the coloured road-following line to match a result card to its route on the map.",
      "Nearest stop shows the closest mapped boarding point to your pin.",
      "Walking distance is an estimate from your pin to that mapped stop.",
      "A wider search area may reveal more routes, but it also means a longer walk.",
    ],
    href: "/plan",
    action: "Explore the map",
  },
  {
    number: "04",
    title: "Travel with local context",
    audience: "General",
    steps: [
      "Treat the map as a route-discovery aid rather than a live timetable.",
      "Confirm the operating direction and current fare before boarding.",
      "Ask the driver or rank marshal when a corridor has multiple variants.",
      "Community route data may change as services and stops evolve.",
    ],
    href: "/",
    action: "Return home",
  },
];

export default function GuidePage() {
  return (
    <div className="rider-guide-page">
      <header className="rider-guide-hero">
        <div><span className="page-eyebrow">Field guide / Gaborone</span><h1>Know the route.<br />Ride with context.</h1><p>A practical, community-minded guide to finding a combi, reading the map, and knowing what to confirm before boarding.</p><div className="guide-hero-actions"><Link className="btn btn-dark" href="/plan">Plan a trip →</Link><Link className="btn btn-secondary" href="/routes">Explore routes</Link></div></div>
        <aside><ClayIcon name="guide" size={56} /><span className="panel-kicker">Before you board</span><strong>Confirm three things locally.</strong><ol><li><span>01</span>Direction and final stop</li><li><span>02</span>Current fare</li><li><span>03</span>Where to get off</li></ol></aside>
      </header>

      <section className="guide-context-band"><span>BW</span><div><strong>Community map, not a live timetable</strong><p>The starter corridors are shared examples. Confirm stop order, direction, fares, and current service with local operators before travel.</p></div></section>

      <section className="guide-chapters"><div className="guide-chapter-heading"><span className="page-eyebrow">Four useful moves</span><h2>From first pin to the right stop.</h2></div><div className="guide-grid">
        {workflows.map((workflow) => (
          <article className="guide-card" key={workflow.number}>
            <div className="guide-card-topline">
              <span className="guide-number">{workflow.number}</span>
              <span className="badge badge-gray">{workflow.audience}</span>
            </div>
            <h2>{workflow.title}</h2>
            <ol>
              {workflow.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <Link className="btn btn-dark btn-sm" href={workflow.href}>{workflow.action} →</Link>
          </article>
        ))}
      </div></section>

      <section className="guide-tool-notes"><article><span>Map controls</span><h3>Tap places, not coordinates.</h3><p>Drag to pan, zoom with the controls, and tap the map to place a start or destination. On route details, tap a stop marker to see its name and order.</p></article><article><span>How much to trust the map</span><h3>Read the map with local context.</h3><p>Routes and stops are community-sourced starter data, not a live operator feed. A published line can still change on the street.</p></article></section>

      <section className="field-tips-section guide-field-tips">
        <div className="field-tips-heading"><span className="page-eyebrow">Field notes</span><h2>Small habits that make a trip easier.</h2><p>Adapted from the supplied YourBotswana “Botswana Public Transport” blog export. The account is historical and subjective; tips are presented as practical context, not live service facts.</p></div>
        <div className="field-tip-grid">{fieldTips.map((tip, index) => <article key={tip.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{tip.title}</h3><p>{tip.copy}</p></article>)}</div>
        <div className="guide-source-note"><strong>What is deliberately omitted</strong><p>The source&apos;s old fare figures, departure times, and broad safety judgments are not repeated as current truth. Verify fares, schedules, stop order, and conditions with operators or recent community reports.</p></div>
      </section>
    </div>
  );
}
