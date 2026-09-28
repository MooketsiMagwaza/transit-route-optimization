# Route trust and community moderation

Tsela publishes what riders and operators know about informal transit. That is only useful if a rider can tell how far to trust each route, and if abuse is dealt with quickly and visibly. This document describes the implemented controls (WO-09 data side, WO-10, WO-18).

## What a rider is told

Every route carries provenance and freshness:

| Field | Meaning |
| --- | --- |
| `source` | Where the route came from. Today always `community` (a reviewed rider contribution). |
| `verificationStatus` | `unverified` (nobody has ridden it to confirm), `field_verified` (an operator confirmed it on the road), or `stale` (the confirmation is older than 180 days). |
| `verifiedAt` | When it was last field-verified, or `null`. |
| `updatedAt` | When any part of the record changed. |

The rider app shows a trust notice on every inspected route, in plain language, and the same fields are part of the public `/v1` contract. Live guidance warns when the rider's reading is far from the mapped road (the threshold grows with GPS uncertainty) and says when the fix is only approximate.

`verificationStatus` is changed only by an administrator (`POST /api/admin/moderation/routes/{id}/verify`). A daily job marks `field_verified` routes older than 180 days as `stale`, so trust decays unless someone renews it.

**Not yet done:** no route in the seed data has been field-verified, and this document does not change that. Field verification is a person riding the corridor; software can only record that it happened.

## The contribution pipeline

1. A signed-in rider draws a route in the community area. The API rejects points outside the Greater Gaborone envelope before spending a road-router request.
2. Submission runs automated review (`services/contribution_review.py`):
   - **Shape (blocking):** at least two and at most 40 points, all inside the service area, no leg longer than 25 km, total length no more than 60 km.
   - **Shape (warning):** points almost on top of each other, or a start and end in the same place.
   - **Duplicates (warning):** a similar name (similarity 0.86 or more) or at least 80% of the points within 150 m of an existing route's stops.
3. Blocking problems return `422` with the reasons. Everything else is queued as `pending_review` with the review result stored, so a moderator sees it.
4. A moderator publishes (`approve`) or rejects with a reason. Approving re-runs the review so stale checks cannot slip through, refuses blocking problems, and requires an explicit `overrideDuplicate` when duplicates were found. Publishing creates the route as `source=community`, `unverified`, with its stops, and links the contribution to it.

Contribution and post creation, reporting, and sign-in are rate limited through a shared database window, so limits hold across every API replica.

## Reports

Any signed-in rider can report a post or a pending contribution (`spam`, `abuse`, `inaccurate`, `other`). Reporting the same item twice counts once. When distinct reporters on a post reach the threshold (3 by default, `AUTO_HIDE_REPORT_THRESHOLD`), the post is hidden automatically and an audit event is written; a moderator then confirms or reverses. A moderator resolves a report by hiding the content or dismissing it, which closes every open report about the same item.

## Audit trail

Every moderation and administrative decision is written to `AuditEvent` in the same transaction as the decision. The table is append-only in the database itself: triggers reject `UPDATE`, `DELETE`, and `TRUNCATE`. The actor is stored as a plain integer rather than a foreign key so deleting an account can never touch it. The admin app shows the trail; `GET /api/admin/moderation/audit` returns it.

Recorded actions: `contribution.approve`, `contribution.reject`, `report.hide_content`, `report.dismiss`, `post.auto_hide`, `route.verify`, `route.delete`, `route.restore`, `account.delete`.

## Recoverable deletion

Routes, community posts, contributions, and accounts are soft-deleted: a `deletedAt` timestamp hides them from every read through a single ORM filter, and an administrator can restore a deleted route. Personal data is the exception; see [Privacy operations](PRIVACY_OPERATIONS.md).

## Who can change route data

Creating, editing, deleting, and optimising routes and stops requires an administrator. Reading remains public. Before this change those write endpoints accepted anonymous requests on the internal `/api` surface.
