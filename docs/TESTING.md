# Testing

## Per-Task Verification

Run before completion:

```bash
pnpm --filter @dental-lab/api prisma:validate
pnpm --filter @dental-lab/api prisma:generate
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

`pnpm test` runs workspace package tests sequentially so API and web suites do not compete for local test sockets in restricted environments.

Run migrations only when a task changes Prisma schema. Run seed only when a task changes seed/demo behavior.

Lint is not currently configured; do not report lint as passed.

## Test Types

- Unit tests: pure helpers, services, validators, permission logic, deadline/pricing resolvers.
- Integration/API tests: controllers, guards, CSRF, RBAC, DTO validation, safe errors.
- Frontend tests: route guards, forms, critical UI state, permission-aware rendering.
- Transaction tests: atomic claim/reassign/payment/document operations.
- Concurrency tests: optimistic locking, duplicate creation, conflicting transitions.
- Rollback tests: failed transaction must not leave partial state.
- Manual tests: start API/web when runtime behavior changes and verify relevant flows.
- Seed idempotency: run demo seed twice when seed changes.
- E2E: planned for critical complete flows; not yet configured as a standard command.

## Browser Smoke Test

For release-readiness checks, a Playwright smoke path is available at:

```bash
pnpm smoke:test
```

It reuses the local demo backend and exercises the main operational flow in a real browser. If Playwright browsers are not installed yet, run:

```bash
pnpm exec playwright install chromium
```

## Failure Rule

If a required check fails, stop feature expansion, fix the failure, rerun the relevant checks, then continue.
