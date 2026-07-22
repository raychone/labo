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
