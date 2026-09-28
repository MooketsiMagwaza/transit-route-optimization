/** Plain-language policy drafts for the public site; production counsel must review them. */

export type Policy = { title: string; summary: string; updated: string; sections: { title: string; body: string[] }[] };

export const policies: Record<string, Policy> = {
  privacy: { title:"Privacy policy", summary:"What Tsela collects, why it is needed, and the choices available to you.", updated:"19 September 2026", sections:[
    {title:"Scope and launch status",body:["This is an operational draft for the Tsela route-planning and developer platform. The legal operator, registered address, privacy contact, and any required regulator details must be inserted and reviewed before public launch."]},
    {title:"Data we need",body:["We collect account details you provide, hashed credentials, API-key metadata, route contributions, community posts, security logs, and API usage needed to operate and protect the service.","Live rider location is processed in the browser for guidance and is not intended to be stored by the API. We do not ask for coordinates when a place can be selected on the map."]},
    {title:"Data we avoid",body:["We do not sell personal data. We do not enable advertising trackers, cross-site profiling, or optional analytics by default. We do not request identity documents, precise background location, or payment details for features that do not need them."]},
    {title:"Retention and security",body:["Retention periods are tied to operating, security, legal, and backup needs. Credentials are stored as one-way hashes; secrets are shown once. Access is restricted by role and security events are logged without request bodies or secret values."]},
    {title:"Your choices",body:["You can download everything Tsela holds about your account, or delete the account, from the developer console. Deletion removes your name, email, keys, and posts immediately and purges the record after a 30-day grace period. A verified privacy contact and legal review are still required before public launch.","Your cookie choice is recorded with a random visitor ID and the policy version, but no address or account. You can change it by clearing the Tsela privacy preference in your browser. Authentication cookies remain necessary when you sign in."]},
    {title:"Children",body:["Tsela is not designed to knowingly collect personal data from children without an appropriate parent or guardian process. A launch decision on minimum age and verifiable consent is required before offering accounts to children."]},
  ]},
  terms: { title:"Terms of service", summary:"The rules for using Tsela safely and responsibly.", updated:"19 September 2026", sections:[
    {title:"Preview service",body:["Tsela is under active development. Route, fare, stop, arrival, and walking information may be incomplete or outdated and must not replace road signs, driver instructions, or personal judgment."]},
    {title:"Accounts and credentials",body:["Keep credentials private, use only the access granted to you, and rotate a key if exposure is suspected. Do not probe, disrupt, scrape, bypass limits, impersonate others, or attempt to access another person’s data."]},
    {title:"Community content",body:["Only submit content you have the right to share. Do not post personal, hateful, unlawful, dangerous, deceptive, or irrelevant material. Contributions may be moderated, corrected, or removed."]},
    {title:"Service limits",body:["Published API quotas and hard caps protect the shared service. Availability is not guaranteed during the preview. Any paid plan, support commitment, or service-level agreement requires separate written terms."]},
    {title:"Before launch",body:["The legal operator, governing law, contact address, liability terms, dispute process, and effective acceptance flow require qualified legal review before these terms become binding production terms."]},
  ]},
  refunds: { title:"Refund policy", summary:"How refunds work while Tsela has no paid public plan.", updated:"19 September 2026", sections:[
    {title:"No public charges today",body:["Tsela does not currently sell a public subscription or process customer payments. There is therefore nothing to refund in the current preview."]},
    {title:"Future paid services",body:["Before any paid plan launches, the checkout will show the full price, billing interval, usage limits, cancellation method, and refund eligibility before purchase. No hidden fees or preselected add-ons will be used."]},
    {title:"Incorrect charge",body:["If billing is introduced and a charge is duplicated, unauthorized, or contrary to the displayed plan, users will have a clearly published billing contact and review process. Payment-provider fees and legally required rights will be stated plainly."]},
  ]},
  cookies: { title:"Cookie policy", summary:"The small amount of browser storage Tsela uses and how to control it.", updated:"19 September 2026", sections:[
    {title:"Necessary storage",body:["The developer portal uses a secure authentication cookie after sign-in. The marketing site stores only your privacy-choice preference in local browser storage. These functions keep sessions and choices working."]},
    {title:"Optional analytics",body:["No advertising or optional analytics SDK is enabled in the current build. If one is added, it must remain off until you choose it, be listed here by name and purpose, and pass a privacy and security review."]},
    {title:"Change your choice",body:["You can reset the privacy choice by deleting the site’s local storage in your browser. Signing out removes the active developer session cookie. Browser controls can also block storage, although sign-in may stop working."]},
  ]},
};
