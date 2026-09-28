# Privacy operations

What Tsela holds, for how long, how a person gets it or has it removed, and which third parties touch it (WO-13). The public text is in the marketing site's legal pages; this is the operating detail behind it. **None of it replaces legal review** before a public launch: the operator identity, contact address, and governing law are still placeholders.

## Data inventory

| Data | Why | Retention | Removed by |
| --- | --- | --- | --- |
| Account email, display name, sign-in method | Sign-in and attribution | Until the account is deleted | Account deletion |
| Password hash (local mode) or provider subject | Authentication | Hash until deletion; the provider subject stays on the anonymised row for the grace period so tokens issued before deletion are refused | Account deletion clears the hash and deletes the provider user; the purge job removes the subject with the row |
| API keys (prefix, digest, scopes, expiry) | Metered access | Until deletion | Revoked at deletion, purged after the grace period |
| API usage (method, path, status, latency, request ID) | Quotas, abuse response, cost | 400 days | `prune-usage` job |
| Community posts and route contributions | The service itself | Until deletion; published routes stay | Posts hidden at once; contributions detached from the person |
| Upload metadata and files | Route evidence | Until deletion or rejection | `cleanup-uploads` job |
| Sign-in and abuse throttling counters | Rate limiting | 2 days | `cleanup-auth` job |
| Idempotency keys | Safe retries | 7 days | `cleanup-auth` job |
| Consent choice (visitor ID, choice, policy version) | Evidence of what was chosen | 3 years | `cleanup-consent` job |
| Audit events | Accountability for decisions | Kept | Not deleted; holds no personal data beyond an integer actor ID |
| Rider location | Live guidance | Never sent to the API | Stays in the browser |

Not collected: advertising identifiers, cross-site tracking, optional analytics, precise background location, payment details, government identifiers.

## Consent

The public site records the visitor's cookie choice (`necessary` or `optional`) with a random visitor ID and the policy version. No address, agent string, or account is stored. Optional analytics are not installed, so `optional` currently changes nothing; the record exists so that adding analytics later cannot retroactively claim consent that was never asked. Any analytics or third-party script must stay off until chosen, be listed below, and pass review.

## Export

`GET /api/developer/export` (signed in) returns a JSON file with the account, key metadata (never secrets), posts, contributions, and upload metadata. The developer console has an **Export my data** button.

## Deletion

`DELETE /api/developer/account` with `{"confirmEmail": "..."}` (also a button in the console). It:

1. deletes the identity-provider user, so the person can no longer sign in anywhere;
2. replaces the email with a non-routable placeholder and the name with "Deleted account", clears credentials, and ends every session (the provider ID stays as a tombstone so a token issued earlier cannot recreate the account);
3. revokes every API key;
4. hides and soft-deletes the person's posts;
5. detaches contributions from the person (published routes stay; pending ones are rejected);
6. marks uploads for removal from object storage;
7. writes an audit event that records the numeric ID only; and
8. leaves the anonymised row for a 30-day grace period (`DELETED_ACCOUNT_GRACE_DAYS`), after which the `purge-deleted-accounts` job deletes it and the database cascades to what remains. If the provider could not be reached at deletion time, the job asks it again first and keeps the row until it confirms (reported as `deferred`).

Administrators must be demoted first so the last operator cannot delete themselves out of the system. Backups taken before deletion still contain the data until they expire under the retention schedule (30 daily, 12 monthly). State that in the privacy notice.

## Email

Tsela sends transactional email only (confirmation and recovery) through the identity provider's SMTP. There is no marketing list, so there is nothing to unsubscribe from. If marketing email is ever added it needs an unsubscribe link, a consent record, and a suppression list before the first send.

## Third parties

| Party | What it receives | Notes |
| --- | --- | --- |
| Road router (`router.project-osrm.org` by default) | Route coordinates for geometry | No personal data. Public demo server with no service guarantee; self-host before launch. |
| OpenStreetMap public tile server (`tile.openstreetmap.org`, rider and admin maps) | Tile requests from the rider's browser, including their IP address and page referrer | This is the main place a rider's IP reaches a third party. OSM's tile usage policy discourages heavy or commercial use of its public servers; move to self-hosted tiles or a paid provider before launch. |
| Google (only if enabled) | OAuth sign-in | Off unless credentials are configured. Scopes: `openid`, `email`, `profile`. |
| SMTP provider | Email address and message | Chosen at deployment. |

No fonts, analytics, tag managers, chat widgets, or advertising SDKs are loaded. The interface uses system fonts. Marketing, rider, and admin icons were rendered from Tsela's own mark.

## Open items

- Legal review of the privacy notice, terms, cookie, and refund texts, and insertion of the operator's real identity and contact.
- A verified privacy contact address.
- Replacing the public OpenStreetMap tile server with self-hosted tiles or a provider whose terms cover production traffic.
- A decision on minimum age.
