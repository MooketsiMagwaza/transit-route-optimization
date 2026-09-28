# Object storage and image uploads

Tsela should use an S3-compatible object store for community photos, route evidence, avatars, exports, and the pgBackRest repository. PostgreSQL stores metadata; binary files do not belong in database rows.

## Recommended free/self-hosted option

Use a three-node [Garage](https://garagehq.deuxfleurs.fr/documentation/quick-start/) cluster for an S3-compatible, self-hosted starting point. Its durability model still needs monitoring and repair procedures; review the [official durability guidance](https://garagehq.deuxfleurs.fr/documentation/operations/durability-repairs/) before production.

Keep two isolated buckets and credentials:

- `tsela-uploads-prod`: private application objects, versioning, lifecycle rules.
- `tsela-db-backups-prod`: pgBackRest/WAL only, stricter write and delete policy, separate encryption key.

If three genuinely separate storage nodes are not affordable, use one self-hosted node plus an encrypted off-site S3-compatible replica. Three containers on one disk do not create redundancy.

## Upload contract to implement before enabling images

```text
POST /api/uploads/intents
Authorization: Bearer <session>
Content-Type: application/json

{
  "purpose": "route-evidence",
  "contentType": "image/jpeg",
  "sizeBytes": 1842200,
  "sha256": "..."
}
```

The API returns an opaque upload ID, object key, signed PUT URL, required headers, and an expiry no longer than ten minutes. The client uploads directly, then calls a completion endpoint. A worker validates the object before it becomes visible.

## Security requirements

- Buckets are private; public reads go through short-lived signed GET URLs or a controlled image proxy.
- Allow only JPEG, PNG, and WebP initially. Check file signatures, not only browser-provided MIME types.
- Limit original image size (for example 10 MB), pixel count, and decompressed dimensions.
- Remove EXIF GPS data from published variants unless route evidence explicitly requires it and the contributor consents.
- Generate thumbnails/optimized variants in a sandboxed worker; never execute user filenames or metadata.
- Use server-generated UUID object keys scoped by account and purpose. Do not place email addresses in keys.
- Apply per-account quotas and rate limits before issuing signed URLs.
- Store `pending`, `verified`, `rejected`, and `deleted` states in PostgreSQL.
- Record checksum, byte size, MIME signature, owner, creation time, verification time, and retention class.
- Scan files according to the launch threat model. Rejected objects remain inaccessible and are deleted on a short lifecycle.

## Retention and deletion

Soft-delete metadata first, revoke reads immediately, and let an object lifecycle remove the bytes after the recovery window. Account deletion must queue object deletion, produce an auditable result, and respect any legally required evidence hold.

Back up object metadata with PostgreSQL. Enable object versions or replication so metadata and bytes can be reconciled after recovery. A database restore alone cannot recreate uploaded files.

## Current boundary

The repository does not yet expose upload-intent endpoints. Production image upload must remain disabled until the signed-upload flow, verification worker, quotas, cleanup job, and restore test are implemented.

## Implemented flow

The upload path now exists and is covered by unit tests; it stays disabled until `OBJECT_STORE_PUBLIC_ENDPOINT` is set.

1. `POST /api/uploads/intents` (signed in) takes `purpose` (`route_evidence` or `profile`), `contentType` (JPEG, PNG, or WebP only), `sizeBytes` (at most 5 MiB), and the file's SHA-256. It enforces a daily per-account cap and returns a presigned `PUT` URL valid for ten minutes. The object key is `purpose/accountId/uuid.ext`; no user-supplied text ever reaches it.
2. The signed request includes the content type, the exact content length, and the SHA-256 checksum, so the store refuses a body that differs from what was declared.
3. The browser uploads straight to the store. The API never proxies bytes.
4. `POST /api/uploads/intents/{id}/complete` checks the object exists, its size matches, and its first bytes match the declared type (magic numbers, not the `Content-Type` header). Anything else is deleted and marked `rejected`.
5. `GET /api/uploads/{id}/download` returns a ten-minute signed `GET` for the owner (or an administrator) once the upload is `verified`. Another account's upload looks like it does not exist.
6. `cleanup-uploads` (hourly) deletes abandoned and rejected objects. Deleting an account marks its uploads for the same cleanup.

Presigning is a small dependency-free SigV4 implementation, so any S3-compatible store works. The upload bucket and the backup bucket use different credentials.

Still to do before images are exposed to riders: malware scanning appropriate to the risk, EXIF/GPS stripping, image resizing, and a moderation step for uploaded evidence. The rider interface has no upload control yet.
