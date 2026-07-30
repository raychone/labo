# Coding Standards

## TypeScript

- Keep TypeScript strict and explicit.
- Prefer readonly input objects and return types for exported APIs.
- Avoid magic strings; centralize enums, constants, query keys, permission keys, and route definitions.
- Use pure helpers for mapping, validation, formatting, and calculations.
- Comments should explain why, not restate what the code does.

## NestJS

- Controllers handle routing, decorators, request metadata, and delegation.
- Services implement business rules.
- DTOs validate all external input.
- Guards enforce authentication, CSRF, RBAC, and legal entity context.
- Use explicit exceptions with safe messages.
- Use transaction-compatible service functions when logic must run inside Prisma transactions.

## Prisma

- Do not hand-roll SQL unless Prisma cannot express the operation or a deterministic migration requires SQL.
- Transaction client types should be narrow `Pick<>` types when shared services accept both `PrismaService` and transaction clients.
- Store money in minor units.
- Do not expose internal IDs unnecessarily in API responses.

## React

- Keep feature APIs, schemas, hooks, and components separated.
- Components render state and dispatch actions; business decisions belong outside components or server-side.
- Use TanStack Query keys from feature API files.
- Use React Hook Form and Zod for complex forms.
- Keep forms permission-aware and server-error-aware.
- Avoid duplicated pages; use composition.

## Exports

Every exported function/type must have a clear single responsibility. If an export needs many unrelated reasons to exist, split it.
