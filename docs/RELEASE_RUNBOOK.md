# Release runbook

How a change reaches a single Docker host, how to undo it, and what evidence a release leaves behind (WO-12). It is written for one operator on one machine. If Tsela ever needs several hosts, revisit it; do not add orchestration because it sounds more serious.

## Design choices

- **Immutable, pinned images.** `scripts/release.sh` tags every image with `git describe` output (for example `0.4.0-12-gabc1234`). The production overlay refuses to start without `TSELA_VERSION`, so nothing runs as `latest`.
- **Health-gated rolling deploy, not blue/green.** Blue/green needs double the capacity and a rewrite of the Compose networking to run two stacks side by side. On one host the honest equivalent is: build first, take a fresh backup, migrate, start the new version with `--wait` (Compose holds until healthchecks pass), smoke-test the public edge, and put the previous version back automatically if that fails. Rollback is a tag change and takes seconds.
- **Expand, then contract.** Migrations must work with the previous release's code, so a rollback does not need a database restore. Add columns and tables in one release; remove the old ones in a later one. If a migration cannot be made backward compatible, say so in the change and plan a restore from the pre-migration backup instead.
- **Secrets never in Git.** Everything comes from `.env.production`, which `scripts/check_release_env.py` audits before anything else happens.
- **Only Caddy is published.** It terminates TLS (automatic certificates), sends HSTS, caps request bodies, and returns 404 for `/metrics` and the alert webhook. The API still decides who may do what; the edge is not the authorization layer.

## One-time setup

1. Point DNS for `example.com`, `app.`, `docs.`, `ops.`, `api.`, and `auth.` at the host. Open ports 80 and 443 only.
2. `cp deploy/.env.production.example .env.production` and replace every value. Generate secrets with `openssl rand -base64 48`. Use different upload and backup credentials. Store a copy of `BACKUP_ENCRYPTION_PASSPHRASE` and `AUTH_JWT_SECRET` offline; without the passphrase the backups are unreadable, and without the JWT secret every session is invalid after a restore.
3. `python scripts/check_release_env.py .env.production` until it prints `release environment OK`.
4. Choose an SMTP provider and set `SMTP_*`. Recovery and confirmation emails depend on it.
5. Optional: create a Google OAuth client with exact callback URLs, then set `GOOGLE_OAUTH_ENABLED=true` and the client ID and secret.
6. Grant the first operator: sign in once, then `docker compose exec api python -m app.cli grant-role you@example.com admin`. The administrator then enrols TOTP at the ops sign-in; without a verified second factor the API refuses every admin request in production.

## Releasing

```bash
git checkout main && git pull --ff-only
scripts/release.sh
```

The script, in order: audits the environment and requires a clean tree; builds all five images; takes a fresh encrypted off-host logical backup and refuses to continue if it cannot name the file; runs migrations; deploys with health gating; smoke-tests `/api/health`, an authenticated `/v1/routes` call (checking `X-API-Version`), and that `/metrics` is not public; restores the previous version if any check fails; writes `deploy/records/<version>.json`; and tags `release-<version>` (signed when `SIGN_TAG=true` and a signing key is configured).

### The launch record

`deploy/records/<version>.json` holds the git commit, operator, image IDs, migration revision, the pre-migration backup file, the previous version, the smoke output, and whether a rollback happened. It is evidence, not decoration: keep the last several, and attach the latest to the launch checklist. Records are git-ignored because they name a specific host; copy the ones you need into your own records.

## Rolling back

```bash
scripts/rollback.sh <version>     # the images must still be on the host
```

It starts that version, waits for health, records the action, and updates the current-version marker. Keep at least the previous two versions' images (`docker image ls 'tsela/*'`) until the new release has been quiet for a day.

If the database itself is damaged, do not roll back the code: follow [Backup and disaster recovery](BACKUP_AND_DISASTER_RECOVERY.md).

## Drills that must have run

A launch record is not enough. These write JSON evidence to `ops/backups/evidence/`:

| Drill | Command | Proves |
| --- | --- | --- |
| Logical restore | `ops/backups/run-drills.sh restore` | The newest off-host backup downloads, verifies, decrypts, and restores into an empty server |
| Point-in-time recovery | `ops/backups/run-drills.sh pitr` | A base backup plus archived WAL recovers to a chosen instant, keeping earlier writes and dropping later ones |
| Alert delivery | `scripts/alert-drill.sh` | Stopping the database exporter produces a firing and a resolved notice in the admin feed |
| Capacity | `python scripts/load-baseline.py --key ...` | Measured latency and throughput to replace guesses in the capacity document |

Repeat them after any change to backups, alerting, or the database image, and at least quarterly.

## Signed records

`SIGN_TAG=true scripts/release.sh` creates a signed tag if `git config user.signingkey` is set. Configuring a signing key is a personal decision that this repository does not make for you.
