"use client";

/** Non-coercive privacy choices; optional tracking remains disabled unless chosen. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/urls";

const KEY = "tsela-privacy-choice-v1";
const VISITOR_KEY = "tsela-visitor-id";
const POLICY_VERSION = "2026-09-19";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setVisible(localStorage.getItem(KEY) === null); } catch { setVisible(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function choose(value: "necessary" | "optional") {
    let visitorId = "";
    try {
      localStorage.setItem(KEY, value);
      visitorId = localStorage.getItem(VISITOR_KEY) ?? crypto.randomUUID().replaceAll("-", "");
      localStorage.setItem(VISITOR_KEY, visitorId);
    } catch { /* the choice simply will not persist */ }
    setVisible(false);
    // A consent record is evidence of what was shown and chosen: no address, agent, or account.
    if (visitorId) {
      void fetch(`${API_URL}/api/privacy/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: value, policyVersion: POLICY_VERSION, visitorId, source: "marketing" }),
        keepalive: true,
      }).catch(() => undefined);
    }
  }

  if (!visible) return null;
  return (
    <aside className="cookie-consent" aria-label="Privacy choices">
      <p>
        <strong>Your privacy, without tricks.</strong>{" "}
        Tsela stores only what sign-in and this choice need. No optional analytics are installed.{" "}
        <Link href="/legal/cookies">Cookie policy</Link>
      </p>
      <div>
        <button type="button" onClick={() => choose("necessary")}>Necessary only</button>
        <button type="button" onClick={() => choose("optional")}>Allow optional</button>
      </div>
    </aside>
  );
}
