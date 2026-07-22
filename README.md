# Dental Lab Management

Custom management application for a Romanian dental laboratory.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod.
- Backend: NestJS, TypeScript, REST API.
- Database: PostgreSQL with Prisma.
- Package manager: pnpm workspace.

## Workspace

```text
apps/
  api/
  web/
packages/
  config/
  shared/
  ui/
```

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev:web
pnpm dev:api
```

Prisma commands are scoped to the API workspace:

```bash
pnpm --filter @dental-lab/api prisma:validate
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api prisma:migrate:dev
pnpm --filter @dental-lab/api prisma:db:seed
```

## Local Environment

Create a local `.env` from the example before starting services:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
docker compose ps
```

Start the API after PostgreSQL is healthy:

```bash
pnpm dev:api
curl http://localhost:3000/health
```

The health response includes `database: "ok"` when the API can connect to PostgreSQL.

The default host PostgreSQL port is `55439` to avoid conflicts with an existing local PostgreSQL installation. Inside Docker, PostgreSQL still listens on `5432`.

Prisma configuration lives in `apps/api/prisma.config.ts`, the schema lives in `apps/api/prisma/schema.prisma`, and migrations are versioned under `apps/api/prisma/migrations`.

## Backend Authentication

AUTH-001 adds backend-only cookie authentication:

- `GET /auth/csrf` sets a readable CSRF cookie and returns the token for clients to send in `x-csrf-token`.
- `POST /auth/login` validates credentials server-side and sets an httpOnly session cookie.
- `GET /auth/me` returns the current authenticated user.
- `POST /auth/logout` requires a valid CSRF token, revokes the server-side session, and clears the session cookie.

The development seed creates a local-only manager account from `.env`:

```text
AUTH_SEED_EMAIL=manager.dev@example.test
AUTH_SEED_PASSWORD=ChangeMe-Dev-Only-12345
```

Do not use these credentials outside local development.

Sessions are stored server-side in PostgreSQL. Only a random session token is sent to the browser; the database stores a SHA-256 token hash. Password hashes use Argon2id with explicit memory, time, parallelism, and output length parameters.

Cookie defaults for development:

- Session cookie: `dl_session`, httpOnly, SameSite=Lax, 8 hour TTL.
- CSRF cookie: `dl_csrf`, readable by the browser, SameSite=Lax, 8 hour TTL.
- Cookies become `secure` automatically when `NODE_ENV=production`.

Login rate limiting is currently in-memory and keyed by IP address plus normalized email. This is acceptable for local MVP development but must move to shared storage before multi-instance deployment.

The automated API tests use service fakes for database-facing auth tests. Real database verification for AUTH-001 is covered by running Docker PostgreSQL, Prisma migrate/seed, and manual API requests against the running backend.

## RBAC

RBAC-001 adds centralized backend authorization. The Prisma models are:

- `Role`
- `Permission`
- `UserRole`
- `RolePermission`
- `UserPermissionOverride`

The typed permission registry lives in `apps/api/src/modules/rbac/permission-registry.ts` and contains the full MVP permission matrix. Seed data creates six system roles: `MANAGER`, `LOGISTICA`, `RECEPTIE`, `TEHNICIAN`, `CURIER`, and `MEDIC`.

Matrix meaning:

- `A`: granted by seeded `RolePermission`.
- `O`: not granted by default; can be granted later with `UserPermissionOverride(ALLOW)`.
- `-`: not granted.

Implemented scopes are `ALL`, `ASSIGNED`, `OWN_CLINIC`, `OWN_DELIVERY`, and `OWN_STAGE`. `ALL` satisfies any required scope. Other ownership scopes are distinct and do not imply each other; future business modules must still verify concrete resource ownership.

Evaluation order:

1. User must exist and be active.
2. Permission must exist in effective grants.
3. Explicit `DENY` override removes matching access and has priority.
4. Explicit `ALLOW` override can add access.
5. Active role permissions are aggregated.
6. Required scope is checked.
7. Default is deny.

Use `@RequirePermission("permission.key", "SCOPE")` together with `AuthGuard` and `PermissionsGuard` on protected backend routes. Permissions are never stored in cookies or sessions; changes are read from the database and take effect without relogin.

Current RBAC endpoints:

- `GET /auth/permissions`: authenticated user permission snapshot.
- `GET /rbac/roles`: protected with `roles.read`.
- `GET /rbac/permissions`: protected with `permissions.read`.

RBAC role and override changes should go through `RbacManagementService` so audit events are written. User management endpoints are implemented separately in `UsersModule`.

## User Management

USERS-001 adds internal user administration for authenticated users with the required permissions.

Backend endpoints:

- `GET /users`: list users with pagination, search, status filter, role filter, and safe sorting.
- `GET /users/:id`: user details with roles, permission overrides, active session count, timestamps, and `mustChangePassword`.
- `POST /users`: create an internal user with a temporary password and roles.
- `PATCH /users/:id`: update display name and email.
- `POST /users/:id/disable`: soft-disable a user and revoke sessions.
- `POST /users/:id/enable`: reactivate a user without creating a session.
- `PUT /users/:id/roles`: replace active roles.
- `POST /users/:id/reset-password`: set a temporary password, mark `mustChangePassword`, and revoke sessions.

State-changing user endpoints require cookie authentication, RBAC permissions, and CSRF validation. The frontend sends the `x-csrf-token` header automatically.

Permissions used:

- `users.create`
- `users.read`
- `users.update`
- `users.disable`
- `users.assign_roles`
- `roles.read`
- `permissions.read`

The backend never returns `passwordHash`, raw session tokens, or temporary passwords. Disabling users preserves historical audit, roles, and overrides. The service protects the last active administrator by checking effective permissions, not role keys.

The user management UI is available at:

```text
http://localhost:5173/users
```

The page is mobile-first and uses the shared UI components for controls, table, drawer, modal, badges, and toasts.

## Laboratory Settings

SETTINGS-001 adds a global singleton settings record for the single laboratory instance. The Prisma model is `LaboratorySettings`, stored in `laboratory_settings`, with a unique `key = "default"` so the API cannot create arbitrary settings rows.

Default development values:

- `laboratoryName`: `Dental Lab Management`
- `countryCode`: `RO`
- `timezone`: `Europe/Bucharest`
- `locale`: `ro-RO`
- `currency`: `RON`
- `primaryColor`: `#0f766e`

Backend endpoints:

- `GET /settings`: protected with `settings.read`.
- `PATCH /settings`: protected with `settings.update` and CSRF.

Supported locale/timezone/currency values for MVP:

- Locales: `ro-RO`, `en-US`, `fr-FR`
- Timezones: `Europe/Bucharest`, `Europe/Paris`, `UTC`
- Currencies: `RON`, `EUR`

The `/settings` frontend route displays profile, fiscal identity, contact, address, localization, and minimal branding fields. Users with only `settings.read` get read-only access. Logo upload is intentionally deferred until private file storage is implemented; `logoFileKey` remains nullable.

Settings updates write `settings.updated` audit events with changed field names and safe before/after metadata.

## Design Foundation

Design tokens and base styles live in `packages/ui/src/styles.css` and are imported by the web app through `@dental-lab/ui/styles.css`.

The internal style preview is available at:

```text
http://localhost:5173/style-preview
```

The preview demonstrates semantic colors, operational status colors, typography, spacing, native control states, focus behavior, and elevation tokens. It is not the reusable component library; that is reserved for `UI-002`.

## UI Components

Reusable UI components are exported from `@dental-lab/ui`:

```ts
import {
  Button,
  TextInput,
  Modal,
  DataTable,
} from "@dental-lab/ui";
```

Component styles use the design tokens in `packages/ui/src/styles.css`. Components are generic, accessible where implemented, and contain no business logic.

The internal preview at `http://localhost:5173/style-preview` now demonstrates the core UI components.

Current UI-002 limits:

- `QRScanner` is not implemented yet because it belongs to QR/browser-device integration work.
- `SignaturePad` is not implemented yet because it belongs to delivery/signature capture work.
- `DataTable` uses controlled sorting/pagination and horizontal scroll on small screens; it does not implement querying, virtualization, resizing, editing, or export.
- `FileUpload` only handles local selection/removal; it does not upload files.

## Current Task

See `IMPLEMENTATION_STATUS.md` for task progress and manual testing checklists.
