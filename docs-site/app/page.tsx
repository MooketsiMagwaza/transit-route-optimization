/** Public Fumadocs-style developer portal with sign-up, sign-in, and the local preview account. */

import Link from "next/link";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { LoginForm } from "../components/login-form";

export default function DeveloperLanding() {
  return (
    <HomeLayout
      nav={{ title: <span className="fuma-brand"><b>T</b><span>Tsela <small>Developers</small></span></span>, url: "/" }}
      links={[
        { type: "main", text: "Documentation", url: "/reference" },
        { type: "button", text: "Sign in", url: "/#access" },
      ]}
      className="developer-landing"
    >
      <section className="developer-landing-hero">
        <div className="developer-landing-copy">
          <p className="eyebrow">TSELA DEVELOPER PORTAL</p>
          <h1>Build with the routes people use.</h1>
          <p>Sign in or create a developer account to explore the route API, issue a key, and follow your usage in one place.</p>
          <div className="developer-landing-points">
            <span>Gaborone routes with road aligned geometry</span>
            <span>Clear API examples and request limits</span>
            <span>One page per endpoint, with a live read-only sandbox</span>
          </div>
        </div>
        <LoginForm />
      </section>

      <section className="developer-portal-paths" aria-label="After sign in">
        <Link href="/reference"><span>01 / DOCUMENTATION</span><strong>Browse the developer guide</strong><small>Sign in for endpoints, examples, errors, and limits</small></Link>
        <Link href="/console"><span>02 / DASHBOARD</span><strong>Manage your access</strong><small>Keys, limits, and request activity</small></Link>
        <Link href="/reference/guides/errors-and-retries"><span>03 / RELIABILITY</span><strong>Handle errors and limits</strong><small>Status codes, retry policy, and rate-limit headers</small></Link>
      </section>
    </HomeLayout>
  );
}
