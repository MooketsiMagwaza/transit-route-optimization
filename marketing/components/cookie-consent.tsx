"use client";

/** Non-coercive privacy choices; optional tracking remains disabled unless chosen. */

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "tsela-privacy-choice-v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setVisible(localStorage.getItem(KEY) === null); } catch { setVisible(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function choose(value: "necessary" | "optional") {
    try { localStorage.setItem(KEY, value); } catch { /* the choice simply will not persist */ }
    setVisible(false);
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
