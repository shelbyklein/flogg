# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Filament Settings Logger (`artifacts/filament-log`)

A mobile-friendly web app for 3D printing enthusiasts to log filament settings changes.

**Features:**
- Dashboard with stats (total logs, unique filaments, brands, filament type breakdown, recent logs)
- Filament list with log counts → filament timeline view
- Filament timeline: grouped log history with diff cards showing setting changes between entries
- Log creation/edit form with:
  - Camera photo capture (mobile `capture="environment"`)
  - Categorized print settings accordion (Retraction, Quality, Strength, Speed)
  - Filament picker + quick-create inline
  - Printer picker + quick-create inline
  - Date, notes
  - Copy-from previous entry flow
- Log detail view with photo, settings categories, notes, printer info, date
- Printer management: full CRUD (/printers page + bottom nav)
- Dark/light theme with amber primary
- Settings stored as JSONB with `visible` flag for backward compat

**Authentication:** Clerk (via `@clerk/react` / `@clerk/express`)
- Landing page for unauthenticated users; all app routes require sign-in
- User data is fully isolated by `userId` (stored in all three DB tables)
- Sign-in/sign-up via Clerk with Google OAuth and email
- Admin role via `publicMetadata.role = "admin"` set through admin panel or Clerk Auth pane
- Bottom nav has 4 items: Dashboard, Filaments, Printers, Account
- Account page: profile info, theme toggle, sign-out, admin panel link (admins only)
- Admin panel (`/admin`): list all users, ban/unban, promote/demote admin role

**Routes:**
- `/` — Landing page (signed-out) / Dashboard (signed-in)
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/logs` — Filaments list (grouped)
- `/logs/new` — New log form (supports ?copyFrom=id&filamentId=id query params)
- `/logs/:id` — Log detail
- `/logs/:id/edit` — Edit log
- `/filament/:id` — Filament timeline
- `/printers` — Printers management
- `/account` — Account + theme + sign-out
- `/admin` — Admin panel (admin role required)

**Database tables:**
- `filaments` — id, user_id, name, brand, type, color, created_at, updated_at
- `filament_logs` — id, user_id, filament_id (FK), printer_id (FK nullable), date, notes, image_url, settings (jsonb), created_at, updated_at
- `printers` — id, user_id, name, brand, nozzle_size, nozzle_type, notes, created_at, updated_at

**API routes (under /api, all require auth):**
- `GET/POST /filaments` — list/create filaments (scoped to userId)
- `GET/PUT/DELETE /filaments/:id` — CRUD (ownership check)
- `GET/POST /printers` — list/create printers (scoped to userId)
- `GET/PUT/DELETE /printers/:id` — CRUD (ownership check)
- `GET /logs` — list with pagination, filamentId filter (scoped to userId)
- `POST /logs` — create (with optional printerId)
- `GET /logs/:id` — get one (LEFT JOINs filament + printer)
- `PUT /logs/:id` — update
- `DELETE /logs/:id` — delete
- `GET /logs/stats/summary` — dashboard stats (scoped to userId)
- `POST /logs/images` — base64 image upload (saves to `uploads/` dir)
- `GET /uploads/:filename` — serve uploaded images (static)
- `GET /admin/users` — list all Clerk users (admin only)
- `POST /admin/users/:userId/ban` — ban user (admin only)
- `POST /admin/users/:userId/unban` — unban user (admin only)
- `POST /admin/users/:userId/role` — set role user/admin (admin only)

**Theme:** Amber + slate palette (warm cream background, amber primary)

**Generated API files (keep in sync with OpenAPI spec):**
- `lib/api-zod/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-client-react/src/generated/api.ts`
