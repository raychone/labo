# Dental Lab Management

Custom management application for a Romanian dental laboratory.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod.
- Backend: NestJS, TypeScript, REST API.
- Database target: PostgreSQL with Prisma in later foundation tasks.
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

## Current Task

See `IMPLEMENTATION_STATUS.md` for task progress and manual testing checklists.
