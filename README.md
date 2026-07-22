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
