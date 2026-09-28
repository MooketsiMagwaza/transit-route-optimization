# Production authentication

## Decision

Use self-hosted Supabase Auth (GoTrue) as the production identity provider, with Google OAuth and email/password sign-in. Keep application authorization, API-key ownership, quotas, and audit data in Tsela's own tables.

Supabase documents Docker as the recommended self-hosting path and exposes provider configuration through environment variables. Google requires its client ID, secret, enabled flag, and matching redirect URI. See the official [self-hosting guide](https://supabase.com/docs/guides/self-hosting), [Auth configuration](https://supabase.com/docs/guides/self-hosting/auth/config), and [self-hosted OAuth guide](https://supabase.com/docs/guides/self-hosting/self-hosted-oauth).

## Current versus production

| Area | Current development implementation | Production target |
| --- | --- | --- |
| Passwords | PBKDF2-HMAC-SHA256, random salt, 600,000 iterations | Supabase Auth-managed hashes and policy |
| Browser session | Opaque random token; only its SHA-256 digest is stored | HttpOnly application session derived from verified Supabase identity |
| Google | Not connected | Google OAuth through Supabase Auth |
| API keys | Random key shown once; SHA-256 digest stored | Keep; add audit events and scheduled rotation reminders |
| Recovery | One-use token; debug display in development | Supabase recovery email through configured SMTP |
| Operator MFA | Not implemented | Required before admin access |

Passwords are hashed, not encrypted. The original password must not be recoverable.

## Application integration flow

1. The browser begins sign-in against the first-party auth hostname, e.g. `auth.tsela.example`.
2. Supabase completes password or Google OAuth and returns to an allow-listed callback.
3. The server verifies issuer, audience, expiry, and signature. It does not trust an unsigned decoded JWT.
4. The immutable JWT `sub` is mapped to `DeveloperAccount.external_subject`; email is profile data, not the authorization key.
5. Tsela creates a short-lived, HttpOnly, Secure, SameSite=Lax application session and rotates it after privilege changes.
6. Fumadocs and the console retain their existing server-side session gate.
7. API keys remain separate machine credentials owned by that account.

Do not put long-lived provider tokens in local storage. Do not accept identity claims passed directly by the browser without signature verification.

## Google OAuth setup

1. Create separate Google OAuth clients for local/staging/production.
2. Configure the exact Supabase callback URL in Google Cloud; avoid wildcard redirects.
3. Set `GOTRUE_EXTERNAL_GOOGLE_ENABLED`, client ID, client secret, and redirect URI in the auth service secret environment.
4. Allow-list only Tsela application return URLs in Supabase Auth.
5. Request only `openid`, `email`, and `profile` unless a reviewed feature needs more.
6. Test new account, returning account, denied consent, mismatched email, expired session, logout, recovery, and account-linking behavior.

## Recovery and email

Production recovery uses a configured SMTP provider and a short-lived, one-use link. Responses must remain identical for known and unknown emails to prevent account enumeration. A successful password reset revokes existing sessions. Rate-limit both request and redemption paths by account and source.

## JWT and signing-key lifecycle

- Store signing keys in secret storage and maintain an offline recovery copy.
- Use a key identifier and overlapping verification keys for planned rotation where supported.
- Alert before certificate/key expiry.
- Restoring auth tables without the matching signing configuration invalidates sessions; that is acceptable only as a declared forced sign-in.
- Never log JWTs, OAuth authorization codes, reset tokens, cookies, API keys, or client secrets.

Supabase's restore guidance notes that auth users are in the database dump while changed JWT secrets invalidate existing tokens; it also calls out reconfiguring social providers and redirect URLs after migration. Follow the [official restore guidance](https://supabase.com/docs/guides/self-hosting/restore-from-platform) during a move or disaster recovery.

## Migration plan

1. Add `external_subject` (unique, nullable during migration) to developer accounts.
2. Deploy a dual-read identity adapter in staging; keep local login enabled only for test accounts.
3. Create/import identities and require password reset where password hashes cannot be safely migrated.
4. Link existing accounts after verified email ownership; never merge solely because two unverified emails match.
5. Switch production login/recovery to Supabase Auth.
6. Disable local password login in production and remove debug recovery output.
7. Require MFA and role checks on the operations dashboard.
8. Run account export, deletion, session revocation, and restore drills before launch.

## Implementation status

Implemented and tested at the API level:

- **Dual-read migration path.** The API accepts identity-provider access tokens and, while `LOCAL_AUTH_ENABLED` is true, local opaque sessions. Production settings refuse to start with local auth enabled or without `AUTH_ISSUER` and a signing secret or JWKS URL.
- **Verification.** Signature, issuer, audience, and expiry are all required. The algorithm is chosen from the configured key type, never from the token, so `alg: none` and HS256-against-a-public-key confusion are rejected. Tested with valid, expired, wrong-audience, wrong-issuer, wrong-signature, missing-expiry, unsigned, and malformed tokens.
- **Account mapping.** The immutable `sub` maps to `DeveloperAccount.externalSubject`. Authorization (role, disabled state) always comes from Tsela's tables, never from claims. An unverified email match never links an existing account; a verified one does, and keeps the existing role.
- **Operator MFA.** In production an administrator request is refused unless the token carries `aal2` (TOTP verified). It fails closed: a missing or local context is refused too. The operations sign-in enrols or verifies TOTP.
- **Revocation.** Logout records the provider session ID so the access token stops working before it expires; an administrator can disable an account (sessions and keys end at once) and re-enable it.
- **Recovery.** With the provider enabled, recovery and confirmation emails are sent by the provider through SMTP (Mailpit locally). The local recovery endpoints answer `410` once local auth is off.
- **Roles.** Granted only by `python -m app.cli grant-role`, never by a claim.
- **Account deletion** removes the provider user as well.

Compose provides `--profile identity` (GoTrue, a bootstrap job, Mailpit). Set `AUTH_PUBLIC_URL=http://localhost:9999` in `.env` and rebuild to switch the three sign-in screens to the provider. Google stays off until `GOOGLE_OAUTH_ENABLED=true` and real client credentials are supplied; creating a Google OAuth client is a step only the account owner can do.

Known limits: the rider and operations apps hold the provider access token in browser storage rather than in an HttpOnly cookie behind a backend-for-frontend (the developer portal already uses a cookie). Access tokens last twelve hours locally with no silent refresh. Moving both apps to cookie sessions is the next hardening step.
