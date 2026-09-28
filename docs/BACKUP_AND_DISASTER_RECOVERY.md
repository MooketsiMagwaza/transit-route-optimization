# Backup and disaster recovery

The database is the system of record for accounts, routes, community content, API keys, usage, and upload metadata. This runbook combines high-availability replication with two different backup forms because they solve different problems.

## Backup model

| Layer | Schedule | Purpose | Suggested retention |
| --- | --- | --- | --- |
| PostgreSQL streaming standby | Continuous | Fast failover after primary host loss | Current state |
| WAL archive through pgBackRest | Continuous | Replay committed changes to a selected point | At least 14 days |
| pgBackRest physical full backup | Weekly | Fast whole-cluster recovery and PITR base | 4 full backups |
| pgBackRest differential backup | Daily, 03:00 | Smaller daily recovery points | Tied to retained fulls |
| Portable `pg_dump -F t` archive | Daily, 04:00 Africa/Johannesburg | Table-level/portable recovery and inspection | 30 daily + 12 monthly |
| S3 object versions | Continuous | Restore overwritten/deleted uploads | 30 days minimum |

The daily `.tar` is intentionally a secondary logical export. Point-in-time recovery depends on a physical base backup plus WAL; a SQL dump cannot “fast-forward” WAL.

pgBackRest supports full/differential/incremental backups, repository encryption, S3-compatible repositories, verification, and point-in-time recovery. Follow its [official user guide](https://pgbackrest.org/user-guide.html) when translating the examples here to the exact PostgreSQL release.

## Three durable database copies

1. **Primary database** — accepts writes.
2. **Hot standby** — streams changes and can be promoted after primary loss.
3. **Encrypted backup repository** — lives outside the database hosts, with bucket versioning/replication and an off-site copy.

Do not place all three on the same physical machine or provider volume. Replication protects availability; only backups protect against replicated deletion, corruption, and operator error.

## Required PostgreSQL settings

Production configuration must include values appropriate to the measured workload:

```conf
wal_level = replica
archive_mode = on
archive_command = 'pgbackrest --stanza=tsela archive-push %p'
archive_timeout = 300s
max_wal_senders = 10
hot_standby = on
```

Use a replication slot or monitored WAL retention policy for the standby. Alert when replication lag or the age of the last successfully archived WAL segment exceeds five minutes.

An example repository configuration lives at [`ops/backups/pgbackrest.conf.example`](../ops/backups/pgbackrest.conf.example). Values containing secrets are placeholders and must come from the host secret store.

## Daily 04:00 logical archive

Install the sample systemd unit and timer from `ops/backups/systemd` on a restricted backup runner. The timer invokes [`logical-backup.sh`](../ops/backups/logical-backup.sh), which:

1. writes a PostgreSQL tar-format dump to a temporary file;
2. verifies that `pg_restore --list` can read it;
3. computes a SHA-256 checksum;
4. atomically moves it into the dated backup directory; and
5. optionally uploads the archive and checksum to a private S3-compatible prefix.

The job must fail loudly if any stage fails. Prometheus should ingest its last-success timestamp from a textfile collector or backup exporter.

## Point-in-time recovery after total backend loss

This is the authoritative whole-platform database recovery order:

1. Declare an incident. Freeze deployments and database writers.
2. Record the desired recovery timestamp in UTC and preserve all surviving disks/logs as evidence.
3. Provision a clean PostgreSQL host with the same major PostgreSQL and pgBackRest versions.
4. Restore the encrypted pgBackRest repository credentials from the secret escrow.
5. Verify the repository with `pgbackrest --stanza=tsela check` and inspect `pgbackrest info`.
6. Stop PostgreSQL and ensure the target data directory is empty and owned by `postgres`.
7. Restore to the target time:

   ```bash
   sudo -u postgres pgbackrest --stanza=tsela \
     --type=time --target="2026-09-19 01:58:00+00" \
     --target-action=promote restore
   ```

8. Start PostgreSQL isolated from public traffic. Confirm recovery completion and inspect the recovery timeline.
9. Run Alembic status, row-count checks, route geometry checks, account/session checks, and application smoke tests.
10. Rebuild a standby from the recovered primary before reopening writes.
11. Restore or reconcile object metadata and S3 object versions.
12. Bring up Supabase Auth with the original signing configuration. If that material is unavailable, rotate it and force a global sign-in.
13. Point one API replica to the recovered database, run smoke tests, then gradually restore traffic.
14. Record actual data loss, RPO, RTO, and corrective actions in the incident record.

Never restore directly over the only surviving copy. Recover on a clean host and validate before promotion.

## Logical `.tar` recovery

Use the logical archive for selective repair or when a new empty cluster is intentional. It is slower and does not preserve every cluster-level setting.

```bash
createdb --template=template0 tsela_restore
pg_restore --exit-on-error --no-owner --role=tsela_app \
  --dbname=tsela_restore /backups/tsela-20260919T020000Z.tar
```

Validate extensions, roles, grants, row counts, migration version, and application behavior before changing any production connection string.

## Restore drills

- **Weekly:** automated checksum and `pg_restore --list` validation for the newest logical archive.
- **Monthly:** restore the newest physical backup plus WAL into an isolated host and run API smoke tests.
- **Quarterly:** simulate loss of the primary, auth service, and one object-storage node; rebuild from written procedures only.
- **After every material schema/auth/storage change:** repeat the relevant drill.

A backup is not considered successful until a restore has been proven. Store drill results, duration, chosen recovery point, failed steps, and follow-up owner in OpenProject.

## Local recovery profile and drills (implemented)

The runbook above describes production practice; the repository also ships a working, testable version for a single Docker host. It uses PostgreSQL's own tools and any S3-compatible store instead of pgBackRest, because a hobby deployment should not need more moving parts than it can rehearse.

**Always on.** The primary archives WAL to its own volume (`archive_mode=on`, `archive_timeout=300`), which bounds the recovery point to about five minutes of activity. `TselaWalArchiveFailing` alerts within minutes if archiving stops.

**`--profile recovery`** adds a streaming hot standby (`db-standby`, port 6001, using a replication slot), an S3-compatible object store (`objects`; buckets for uploads and for backups with separate credentials and object versioning), and the `backup` runner:

| Job | Schedule (Africa/Gaborone) | What it does |
| --- | --- | --- |
| `logical` | 04:00 daily | `pg_dump` tar archive, `pg_restore --list` check, AES-256 encryption, checksum, off-host copy |
| `base` | 04:30 Sundays | `pg_basebackup` including the WAL it needs, encrypted, checksummed, copied off-host |
| `verify` | 05:00 daily | Downloads the newest off-host archive, verifies the checksum, decrypts it, and lists it |
| `prune` | after each logical run | 30 daily + 12 monthly archives, 4 base backups, 30 days of WAL |

Each job writes its outcome to `MaintenanceRun`; a failure or a missed window alerts through Prometheus and Grafana into the admin feed. Nothing leaves the host unencrypted, and the encryption passphrase must be stored outside the host.

**Drills** (`ops/backups/run-drills.sh restore|pitr|all`) each write JSON evidence to `ops/backups/evidence/`:

- *Logical restore* downloads the newest off-host archive, checks its checksum, decrypts it, and restores it into an empty scratch server that shares no volume with the primary, then checks that routes, stops, the migration revision, and PostGIS are present.
- *Point-in-time recovery* takes a base backup, writes a `before-target` marker, records the instant, writes an `after-target` marker, forces the WAL into the archive, and recovers a scratch server to that instant from the base backup plus archived WAL. It passes only if `before-target` exists and `after-target` does not.

What this does **not** prove: recovery across separate machines (the standby and the primary share one host), recovery after losing the encryption passphrase (it is unrecoverable by design), or restoring the object store's uploads. Put the off-host bucket on a different provider before relying on it.
