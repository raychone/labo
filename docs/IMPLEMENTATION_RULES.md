# Implementation Rules

These rules apply to every task unless a newer canonical document explicitly changes them.

## General

- Keep strict task scope.
- Do not start the next task.
- Prefer composition over inheritance.
- Prefer pure functions where practical.
- Use strong typing everywhere.
- Do not use `any` unless unavoidable and documented.
- Every exported function must have a clear responsibility.
- Do not duplicate business logic.
- Do not perform unrelated cleanup.
- Follow existing repo patterns before adding abstractions.
- Do not invent business decisions. Use `TBD`, `Requires business confirmation`, or `Open decision`.

## Frontend

- React, TypeScript, Vite, React Router.
- TanStack Query for server state.
- React Hook Form and Zod for forms.
- Mobile-first and responsive by default.
- Use reusable UI components from `packages/ui`.
- Keep feature folders organized.
- No business logic inside React components.
- Provide loading, empty, error, disabled, and success states.
- Invalidate query caches explicitly after mutations.
- Maintain basic accessibility and keyboard support.
- UI may hide forbidden actions, but backend authorization is mandatory.

## Backend

- NestJS, Prisma, PostgreSQL, REST.
- DTO validation for inputs.
- Guards for auth, CSRF, RBAC, and context.
- Business logic belongs in services, not controllers.
- Use transactions for atomic operations.
- Repository pattern only when it reduces real complexity.
- Keep error mapping consistent and safe.
- Use idempotency where repeated execution is expected.

## Database

- Migrations must be deterministic.
- No destructive migration without explicit approval.
- No database reset unless explicitly approved and verified local.
- Every relationship needs a foreign key.
- Indexes must be justified.
- Money is stored in minor units.
- Keep timestamps coherent.
- Use optimistic locking where concurrent writes can conflict.
- Use versioned snapshots for immutable business facts.
- Seed data must be deterministic and idempotent.

## Related Rules

- Security: [SECURITY.md](SECURITY.md)
- Testing: [TESTING.md](TESTING.md)
- Git: [GIT_WORKFLOW.md](GIT_WORKFLOW.md)
- UI: [UI_GUIDELINES.md](UI_GUIDELINES.md)
- Coding standards: [CODING_STANDARDS.md](CODING_STANDARDS.md)
