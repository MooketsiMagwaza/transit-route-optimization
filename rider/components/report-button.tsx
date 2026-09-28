"use client";

/** Lets a signed-in rider report a post to moderators without leaving the board. */

import { FormEvent, useState } from "react";
import { accountApi } from "@/lib/account-api";

const REASONS = [
  { value: "inaccurate", label: "Wrong or out of date" },
  { value: "spam", label: "Spam or advertising" },
  { value: "abuse", label: "Abusive or unsafe" },
  { value: "other", label: "Something else" },
] as const;

export function ReportButton({ postId }: { postId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("inaccurate");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      await accountApi.reportContent({ targetType: "post", targetId: postId, reason });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") return <span className="report-done" role="status">Thanks, moderators will look at this.</span>;
  return (
    <span className="report-control">
      <button type="button" className="report-link" aria-expanded={open} onClick={() => setOpen(!open)}>Report</button>
      {open && (
        <form className="report-form" onSubmit={submit} aria-label="Report this post">
          <fieldset>
            <legend>Why are you reporting this?</legend>
            {REASONS.map((item) => (
              <label key={item.value}><input type="radio" name={`reason-${postId}`} value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} /> {item.label}</label>
            ))}
          </fieldset>
          {state === "error" && <p className="report-error" role="alert">Could not send. Try again in a moment.</p>}
          <div><button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send report"}</button><button type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </span>
  );
}
