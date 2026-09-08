# Security

## Permanent Rules

- Cookie authentication only; no public signup.
- Sessions are server-side and stored in PostgreSQL.
- Browser receives an httpOnly session cookie.
- CSRF token is required for state-changing cookie-auth requests.
- Password hashes use Argon2id.
- Backend RBAC is authoritative.
- Resource authorization must be checked server-side.
- Inactive users cannot authenticate or continue access.
- Rate limiting protects login.
- Do not trust frontend validation or calculations.
- Validate every input server-side.
- Do not log passwords, tokens, cookies, private file keys, or sensitive headers.
- Return safe errors that do not enumerate users or leak internals.
- Financial data must be masked server-side for roles without financial/pricing permissions.
- Critical actions must be audited.
- Realtime topics are authorized server-side; browser-side filtering is never the security boundary.
- Production profile startup must fail when demo access, non-production runtime, or non-HTTPS web origins are configured.
- Uploaded files must pass size, declared MIME, and file-signature checks before persistence.

## Checklist For Each Task

- Are new endpoints protected by auth, CSRF if mutating, RBAC, and resource checks?
- Are DTOs validating every external field?
- Is frontend hiding only UX affordances, not enforcing security?
- Are prices, payment data, internal IDs, and snapshot details masked when required?
- Are audit events written for critical mutations?
- Are errors safe and actionable?
- Are tests covering unauthorized/forbidden cases when security changes?

## Current Notes

Auth uses `dl_session` and `dl_csrf` cookies. The browser receives a cryptographically random raw session token; PostgreSQL stores only its SHA-256 hash. Login verification performs an Argon2id comparison for both known and unknown accounts to reduce account-existence timing differences. Login and QR limits use bounded process-local stores that fail closed at capacity.

Demo login exists only for explicit demo deployments. `APP_DEPLOYMENT_PROFILE=production` rejects demo mode/login and requires `NODE_ENV=production` plus HTTPS `WEB_ORIGIN` values. The checked-in Render blueprint remains demo-only.

Private work attachments are stored in PostgreSQL and require normal work-resource authorization. Uploads are limited by count and bytes, restricted to PDF/JPEG/PNG/WebP, and checked against file magic. Downloads use sanitized filenames, `nosniff`, restrictive CSP, private no-store caching, inline disposition only for supported images, and attachment disposition for PDFs. There is no antivirus/content-disarm service; enabling real external uploads requires an explicit operator risk decision or malware-scanning integration.

HTTP hardening includes Helmet defaults, strict CORS origins, CSRF on cookie-authenticated mutations, request IDs, safe metadata-only request logs, disabled `X-Powered-By`, explicit proxy trust, no-store API responses, readiness failure when PostgreSQL is unavailable, and graceful shutdown hooks.

Realtime uses authenticated SSE, current effective permission snapshots, user-targeted events where required, periodic session checks, connection caps, and no domain payloads. Billing events are not delivered at all to users without financial permission. The current in-memory broker and process-local rate limiters are safe only for the documented single-API pilot; scale-out requires shared infrastructure.

Known residual controls that are operational rather than implemented in-process:

- TLS termination, WAF/edge rate limiting, IP policy, secrets rotation, log retention, and alerting belong to the production platform.
- A malware scanner is not present.
- Backup existence and recovery are not assumed until [BACKUP-RESTORE.md](BACKUP-RESTORE.md) has been configured and rehearsed.
- A Content Security Policy is supplied by Helmet, but production headers must still be inspected against the final hosting/origin topology.
