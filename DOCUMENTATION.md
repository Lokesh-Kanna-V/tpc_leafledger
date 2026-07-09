# Leaf Ledger — Application Documentation

Leaf Ledger is an internal admin tool for tracking tobacco **leaf accounting books**: physical
booklets of numbered "leaves" (pages) that get handed out to field offices, assigned to
employees, and then reconciled ("accounted") one leaf at a time. The app tracks book lifecycle
(store → current → completed), per-leaf assignment/accounting, office and employee rosters, and
raises alerts when a book's leaves go unaccounted for too long.

Powered by **Next.js 16 (App Router) + React 19 + Prisma 5 + PostgreSQL**, styled with
Tailwind v4 and shadcn/ui (Radix primitives). Ships as a single Docker image plus a Postgres
container via `docker-compose.yml`.

---

## 1. Domain model

The whole app is built around one real-world object: a **book** — a physical booklet containing
up to 50 numbered **leaves**. Books move through a lifecycle and leaves within a book get
assigned to employees and later "accounted" (reconciled/audited).

### Entities (`prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `Office` | A field office / pickup center. Has `leaf_alert_days` — how many days a book assigned here may sit unaccounted before it's flagged overdue (default 2). |
| `Employee` | A staff member. Has `name`, `role`, optional `password` (only employees with `role = admin` or `developer` can log in to the app). Employees are linked to offices via `EmployeeOffice`. |
| `EmployeeOffice` | Join table, employee ⇄ office (many-to-many). |
| `Book` | A physical booklet: `book_number` (unique, year-prefixed e.g. `2026-17`), `office_id`, `consignment_no_from`/`consignment_no_to` (the leaf range once assigned), `leaf_year` (which calendar year that range belongs to, since raw consignment numbers restart at 1 every year), `book_status` (`store` \| `current` \| `completed`), `in_floor` (physically taken to the office floor but not yet formally assigned), and an optional `lot_number` (which stock lot generated it). |
| `Lot` | A batch of stock books created together — a lot with `book_from=1, book_to=100` generates 100 `store`-status books numbered `<year>-1` … `<year>-100`. |
| `Consumption` | One row per **leaf** of a book: `book_id` + `consignment_no` (composite PK), `user_id` (employee it's assigned to, nullable), `assigned_date`, `accounted` (bool), `accounted_date`. This is the ledger of who used which leaf and whether it's been reconciled. |
| `Alert` | System-generated alerts. Currently one type: `ACCOUNTING_OVERDUE`, one row per book, upserted/resolved automatically (unique on `(type, book_id)`). |

### Book lifecycle

```
Lot created (book_from..book_to)
        │
        ▼
  book_status = "store"   (no leaf range yet, not in floor)
        │  (assigned an office + leaf range, or taken to floor)
        ▼
  book_status = "current" (in_floor = true, leaves get assigned to employees)
        │  (every leaf in consignment_no_from..consignment_no_to is accounted)
        ▼
  book_status = "completed"
```

Key derived rules (`lib/book-completion.js`, `lib/books.ts`):
- A book auto-flips to `completed` once **every leaf in its declared range** has
  `consumption.accounted = true` (checked after every consumption insert/update/upsert/account
  call — `refreshBookCompletionStatus(bookId)`).
- `consignment_no` is stored as text and may carry a `"YYYY-"` year prefix (e.g. `"2026-5"`); helper
  functions strip/re-add this prefix consistently across the API and UI.
- **Leaf-range overlap** is validated server-side: two books can't have overlapping
  `consignment_no_from..consignment_no_to` ranges within the same `leaf_year`.
- **Minimum assignable leaf**: when (re)assigning a book, the UI/API only allows assigning from
  `max(already-accounted leaf) + 1` onward — leaves already accounted can't be reassigned.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1.7 (App Router, Turbopack dev server) |
| UI | React 19, Tailwind CSS v4, shadcn/ui components on Radix UI primitives, lucide-react icons |
| Language | TypeScript (routes are a mix of `.ts`/`.tsx` for newer code and `.js` for most CRUD API routes) |
| ORM / DB access | Prisma 5 as the migration/client tool, but most queries go through `lib/db.ts`'s `query()` helper which runs raw parameterized SQL via `prisma.$queryRawUnsafe` (keeps existing hand-written SQL working while Prisma Migrate manages schema) |
| Database | PostgreSQL 16 |
| Auth | Custom cookie + JWT (HS256 via `jose`), `scrypt` password hashing (Node `crypto`), no third-party auth provider |
| Deployment | Docker (`Dockerfile`, multi-stage, Next.js `output: "standalone"`), `docker-compose.yml` bundles app + Postgres |
| Package manager | npm (`package-lock.json`) |

Scripts (`package.json`):
- `npm run dev` — Next dev server with Turbopack
- `npm run build` — `prisma generate && next build`
- `npm run db:migrate` / `db:migrate:deploy` / `db:studio` — Prisma Migrate workflows
- `npm run typecheck` / `lint` / `format`

---

## 3. Authentication & authorization

There is **no self-service signup that grants access** — signup just creates an `employee` row;
only employees whose `role` (case-insensitively) is `admin` or `developer` can actually sign in
and use the app.

- **Password hashing** (`lib/auth/password.ts`): `scrypt` (N=16384, r=8, p=1, 64-byte key),
  random 16-byte salt, stored as `scrypt$<saltB64>$<hashB64>`. Verified with
  `timingSafeEqual`.
- **Session token** (`lib/auth/jwt.ts`): a `jose` JWT, `HS256`, signed with `JWT_SECRET` env var,
  subject = employee id, custom claim `role`, 7-day expiry (`AUTH_COOKIE_MAX_AGE_SEC` in
  `lib/auth/constants.ts`).
- **Cookie**: `leafledger_auth`, httpOnly, `sameSite=lax`, `secure` in production, path `/`.
- **Route protection** (`middleware.ts`): matches `/`, `/leafledger`, `/leafledger/:path*`.
  - Visiting `/leafledger*` without a valid admin/developer JWT → redirected to `/`.
  - Visiting `/` while already holding a valid admin/developer JWT → redirected to `/leafledger`.
  - Everything else (e.g. `/signup`, all `/api/*` routes) passes through unguarded by middleware
    — the API routes themselves don't re-check auth (see **Security notes** below).

### Auth endpoints
| Route | Method | Behavior |
|---|---|---|
| `/api/auth/signup` | POST | Creates an `employee` row with a hashed password. `{ name, role, password }`. 409 if name already exists. |
| `/api/auth/login` | POST | `{ name, password }`. Looks up employee by case-insensitive trimmed name, requires `role` = admin/developer, verifies password, sets the JWT cookie. |
| `/api/auth/logout` | POST | Clears the cookie (`maxAge: 0`). |

### Pages
- `/` — Login page (`app/page.tsx` → `LoginForm`).
- `/signup` — Sign-up page (`app/signup/page.tsx` → `SignupForm`).
- `/leafledger` — The whole authenticated single-page app (`app/leafledger/page.tsx`).

---

## 4. Application shell & navigation

`app/leafledger/page.tsx` is a single client component (`Home`) that owns all top-level state.
On mount it fires `reloadData()` which fetches **books, consumptions, employees, offices, lots,
and overdue alerts** in parallel and stores them in React state — there's no server-side
data fetching or React Query/SWR; the whole app re-fetches everything into memory and re-derives
UI state client-side.

Layout: a collapsible left sidebar (icon-only when collapsed) + main content pane. Nav items
(with a live alert-count badge):

1. **Dashboard** → `components/dashboard.tsx`
2. **Book Manager** → `components/book-manager.tsx`
3. **Stock Manager** → `components/stock-manager.tsx`
4. **Organization** → `components/office-management.tsx` (Offices / Employees sub-tabs)
5. **Alerts** → `components/alerts.tsx`

`lib/books.ts`'s `rowsFromDatabase()` joins raw `books` + `consumptions` + `employees` +
`offices` into a denormalized `BookRow[]` (assignee name, accounted-through leaf, leaf counts,
etc.) that all the book-related views render from — this is the one place the "is this leaf
accounted contiguously from the start" logic lives (`accountedThrough`/`accountedLeafCount`).

Logout: `POST /api/auth/logout`, then hard-navigates to `/`.

---

## 5. Feature walkthrough

### 5.1 Dashboard (`components/dashboard.tsx`)
Read-only summary cards computed client-side from `BookRow[]` + alerts:
- **Stored**: count/leaves of `store`-status books not in floor.
- **In Floor**: books physically at the office but not yet formally assigned (`in_floor` true,
  still `store` status), with average leaves/book.
- **Current**: books in active use and their total leaf count.
- **Accounted**: accounted vs. pending leaf counts across current books.
- **Needs attention**: pulls from the live overdue-accounting alerts feed, highlighted in red
  with a pulsing background when there are active alerts; clicking jumps to the Alerts tab.
(Some additional panels — a "recent books" table, a "by assignee" workload table, "next actions"
tips — exist in the code but are currently commented out.)

### 5.2 Book Manager (`components/book-manager.tsx`) — the core screen
This is by far the largest component (~2,750 lines) and covers the full book lifecycle:

- **Add book** dialog: book number, office, leaf-from/leaf-to (max 50 leaves), optional assignee
  (must match an existing employee name via a datalist). Validates leaf-range overlap against
  other books in the current year before allowing submit. On save: creates the `Book` via
  `POST /api/books`, then creates one `Consumption` row per leaf in the range
  (`POST /api/consumption` in a loop) — if any consumption insert fails, the just-created book is
  rolled back with `deleteBook`. "Add and close" vs. "Add more" (keeps the office selected for
  rapid repeated entry).
- **Assign book** dialog: pick an existing book number (autocomplete) and an employee (or inline
  "+ Add new employee"), optionally a specific starting leaf or "New book" (defaults to the
  minimum assignable leaf). Writes via `upsertConsumptionAssignment` for every leaf from the
  starting point to the end of the range. Blocked if every leaf is already accounted through the
  end of the range.
- **Account leaf** dialog: enter a single leaf number (optionally year-prefixed, e.g. `2026-5`);
  resolves the owning book from the existing consumption row and calls
  `POST /api/consumption/account`, which fails if the leaf isn't assigned yet or is already
  accounted. Has an "Account another" flow that re-focuses the input for fast sequential entry.
- **Bulk assign** dialog (multi-step wizard): given a book-number range (e.g. `1..50` for the
  current year), assign an office (and optionally an employee) to every matching book. Any book
  in the range that doesn't yet have a leaf range is asked for one first, one at a time, before
  the final office/employee assignment runs across the whole batch.
- **Edit book** dialog: change office, leaf range, and/or assignee for an existing book, with the
  same overlap and "already fully accounted" guardrails.
- **In Floor** toggle: a checkbox directly in the table row to mark whether a book is physically
  at the office.
- **Per-book leaf detail view**: clicking a table row opens a full per-leaf table (leaf no.,
  assignee, assigned date, accounted checkbox, accounted date) for that book.
- **Filtering/search/pagination**: status filter (`all`/`current`/`completed`/`store`), year and
  month filters (by assigned date), free-text search (book no., assignee, office), 20 rows/page.

### 5.3 Stock Manager (`components/stock-manager.tsx`)
Manages **Lots** — batches of not-yet-assigned stock books:
- **Add lot**: `lot_number` + `book_from`/`book_to`. Creates the `Lot` row and, in the same DB
  transaction, generates one `store`-status `Book` per number in the range (capped at 10,000
  books per lot server-side), each tagged with the lot's `lot_number` and named
  `<year>-<book_from..book_to>`.
- **Edit lot**: rename only (the book range can't be changed after creation); generated books
  follow the rename automatically via `ON UPDATE CASCADE` on `book.lot_number`.
- **Delete lot**: removes the lot; its generated books are kept, with `lot_number` cleared
  (`ON DELETE SET NULL`).
- Year/month filters over `created_at`.

### 5.4 Organization (`components/office-management.tsx`)
Two sub-tabs:
- **Offices** (`components/offices.tsx`): CRUD for office `name` + `leaf_alert_days` (the
  per-office overdue threshold used by the alerts job).
- **Employees** (`components/employees.tsx`): CRUD for employee `name`, `role`, and a
  multi-select of office assignments (checkboxes) that write to `EmployeeOffice`.

### 5.5 Alerts (`components/alerts.tsx`)
Standalone view of currently-active `ACCOUNTING_OVERDUE` alerts: office, book, assignee(s),
overdue leaf count, oldest assigned date, days passed, and the office's allowed-days threshold.
Fetches `GET /api/alerts` on mount (this call itself may trigger a refresh — see below).

---

## 6. Overdue-accounting alerting system

Two independent implementations of essentially the same logic exist, serving different
triggers:

1. **In-request refresh** (`app/api/alerts/route.ts`): `GET /api/alerts` calls
   `maybeRefreshAlerts()` which re-runs the overdue calculation at most once per hour
   (per server process, via a `globalThis` timestamp), or immediately if
   `?refresh=1` is passed or `NODE_ENV !== "production"`. This is what the UI hits.
2. **Standalone worker** (`scripts/overdue-alerts.mjs` run by `scripts/overdue-worker.mjs`): an
   infinite loop that sleeps until 09:00 local time each day and re-runs the same alert logic,
   meant to run as a separate long-lived process/container (not currently wired into
   `docker-compose.yml`, which only defines `db` and `app` services).

Logic (both versions): a `Book` is "overdue" if `book_status = "current"`, has an
`initial_assigned_date`, and has at least one unaccounted consumption row, **and**
`today - initial_assigned_date >= office.leaf_alert_days` (fallback 2 days if the book has no
office, or a hardcoded 4-day threshold in the standalone script). Active alerts are
upserted (one per book, unique on `(type, book_id)`) with a payload of
`{ overdueCount, oldestAssignedDate, daysPassed, thresholdDays, assignedTo[] }`; alerts for
books no longer overdue are resolved (`resolvedAt` set).

**Note:** `scripts/overdue-alerts.mjs`'s standalone version doesn't read
`office.leaf_alert_days` — it always uses a fixed 4-day threshold — while the in-app route
(`app/api/alerts/route.ts`) does honor the per-office setting. If the worker script is deployed,
its threshold will disagree with what the UI shows.

---

## 7. API reference (`app/api/**`)

All routes return JSON; errors are `{ error: string }` with an appropriate HTTP status via
`jsonError()` (`lib/http.ts`). Postgres errors are translated to friendly messages via
`humanizePgError()`/`pgCode()` (handles unique/foreign-key/check/not-null violations, etc.).
Most routes run with `export const runtime = "nodejs"`.

| Resource | Routes |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout` |
| Books | `GET/POST /api/books`, `GET/PUT/DELETE /api/books/[id]` |
| Lots | `GET/POST /api/lots`, `GET/PUT/DELETE /api/lots/[id]` |
| Offices | `GET/POST /api/offices`, `GET/PUT/DELETE /api/offices/[id]` |
| Employees | `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/[id]` (employee rows carry a derived `office_ids: number[]`) |
| Consumption | `GET/POST /api/consumption`, `GET/PUT/DELETE /api/consumption/[bookId]/[consignmentNo]`, `POST /api/consumption/account` (mark one leaf accounted by consignment number alone), `POST /api/consumption/upsert` (assign/update without needing to know if the row exists yet) |
| Alerts | `GET /api/alerts` (also triggers the throttled refresh) |
| Diagnostics | `GET /api/test-db` (returns `SELECT NOW()`, used as a DB connectivity healthcheck) |

Business rules enforced server-side (not just client-side):
- Book numbers and leaf ranges are year-scoped (`leaf_year`); overlapping ranges within a year
  are rejected with 409.
- `consignment_no` matching in the single-leaf routes is deliberately fuzzy — it matches on exact
  text, trimmed text, or numeric-equivalent text (so `"05"` matches `"5"`), because consignment
  numbers can be stored with or without a year prefix and with inconsistent padding.
- Assigning a leaf (`user_id` set) flips the book to `book_status = "current"`,
  `in_floor = true`, and backfills `initial_assigned_date` if unset.
- Every consumption write (`POST /api/consumption`, its `PUT`, `/upsert`, `/account`) calls
  `refreshBookCompletionStatus(bookId)` afterward to auto-complete the book if applicable.

`lib/api/*.ts` mirrors this API as typed client-side fetch wrappers (`getBooks`, `createBook`,
`upsertConsumptionAssignment`, etc.), all going through `parseResponse()`/`ApiError`
(`lib/api/request.ts`) for consistent error surfacing in the UI.

---

## 8. Database migrations

Prisma Migrate history (`prisma/migrations/`), in order — useful as a changelog of how the schema
evolved:

1. `init` — base schema (offices, employee, book, consumption).
2. `add_alerts` — `Alert` model.
3. `add_bookstatus_enum` — converted `book_status` to a Postgres enum.
4. `add_lot` — `Lot` model + `book.lot_number` FK.
5. `lot_generates_books` — supporting changes for lot → book generation.
6. `add_employee_office` — many-to-many `EmployeeOffice` join table.
7. `add_lot_created_at` — `lot.created_at` timestamp.
8. `add_book_in_floor` — `book.in_floor` boolean.
9. `add_office_pickup_center` — office-level pickup-center concept feeding the alert threshold.
10. `office_leaf_alert_days` — `office.leaf_alert_days` (superseded the fixed pickup-center
    threshold with a configurable per-office value).
11. `add_book_leaf_year` — `book.leaf_year`, enabling leaf numbers to restart yearly.

---

## 9. Deployment

- **`Dockerfile`**: multi-stage build (`deps` → `builder` → `runner`) on `node:22-alpine`, using
  Next's `output: "standalone"` bundle. Runs as non-root user `nextjs`. Copies Prisma engine
  binaries and the `scripts/` folder into the runtime image.
- **`docker-entrypoint.sh`**: runs `prisma migrate deploy` on container start; if the target DB
  already has tables that predate Prisma (`P3005` error), it auto-baselines against the
  `20260205140000_init` migration and retries, then execs `node server.js`.
- **`docker-compose.yml`**: two services —
  - `db`: `postgres:16-alpine`, credentials `leafledger`/`leafledger`, healthcheck via
    `pg_isready`, persisted to a named volume.
  - `app`: `leaf_ledger:latest` image (the `build:` block is commented out — expects a
    pre-built image by default), depends on `db` being healthy, `JWT_SECRET` overridable via env
    (defaults to a dev-only placeholder — **must be overridden in real deployments**).
- Env vars: `DATABASE_URL` (Postgres connection string), `JWT_SECRET` (HMAC signing key for auth
  JWTs). Both are read from `.env` locally (not committed).
- `scripts/gen-hash.mjs` — CLI helper to generate a `scrypt$...` password hash for manually
  seeding an admin employee row.

Per the README, the intended local flow is `docker compose up -d --build`, app at
`http://localhost:3000`; `docker compose down -v` wipes the DB volume for a clean slate.

---

## 10. UI kit

`components/ui/*` are shadcn/ui components (Radix UI primitives + Tailwind, configured via
`components.json`): `Button`, `ButtonGroup`, `Card`, `Checkbox`, `Dialog`, `Field`/`FieldGroup`
(form scaffolding with built-in error/description slots), `Input`, `Label`, `Separator`, `Table`,
`Tooltip`. `components/theme-provider.tsx` wraps `next-themes` for light/dark mode support;
`components/password-input.tsx` is a small show/hide-password wrapper around `Input`.

---

## 11. Notable design decisions & gotchas (for future contributors)

- **Raw SQL over Prisma's query builder**: nearly all reads/writes go through
  `lib/db.ts`'s `query()`, which runs hand-written parameterized SQL via
  `prisma.$queryRawUnsafe`, not `prisma.book.findMany()`-style calls. Prisma is used mainly for
  migrations/schema and in a few newer routes (`alerts`, `lots`, `employees` — inside
  `$transaction`). If you add new persistence logic, follow the existing pattern in the same file
  rather than mixing query styles.
- **`query()` self-heals cached-plan errors**: if a raw query fails with "cached plan must not
  change result type" (happens after live schema changes on a long-lived connection), it
  disconnects and recreates the Prisma client once, then retries — a pragma to avoid restarting
  the app after migrations.
- **Consignment numbers are strings, not integers**, and may carry a `"YYYY-"` prefix. Always go
  through `parseConsignmentNo()` / `canonicalConsignmentNo()` / the SQL `consignmentNoPredicate()`
  helper rather than comparing raw strings.
- **No server-side authorization on most `/api/*` routes** — `middleware.ts` only gates page
  navigation (`/leafledger`), not the API itself. Any client with cookies (or without) can call
  the CRUD endpoints directly; the app currently relies on the SPA only being reachable through
  the gated page. This is worth hardening (e.g. checking the JWT in the API routes too) before
  exposing this beyond a trusted network.
- **Overdue-threshold discrepancy** between the in-app alerts route (uses
  `office.leaf_alert_days`) and the standalone `scripts/overdue-alerts.mjs` worker (hardcoded
  4-day threshold) — see §6.
- **`scripts/overdue-worker.mjs`** is not wired into `docker-compose.yml`; if daily-alert
  generation independent of user traffic is required, it needs its own service entry.
- Book/lot numbers are **year-prefixed automatically by the server** (`${year}-${input}`) —
  admins only type the plain sequential part each year, so numbers restart at 1 without manual
  bookkeeping.
