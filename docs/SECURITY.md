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

## Checklist For Each Task

- Are new endpoints protected by auth, CSRF if mutating, RBAC, and resource checks?
- Are DTOs validating every external field?
- Is frontend hiding only UX affordances, not enforcing security?
- Are prices, payment data, internal IDs, and snapshot details masked when required?
- Are audit events written for critical mutations?
- Are errors safe and actionable?
- Are tests covering unauthorized/forbidden cases when security changes?

## Current Notes

Auth uses `dl_session` and `dl_csrf` cookies. Demo login exists for local demonstrations and is controlled by demo mode. Private file storage is not implemented yet.
