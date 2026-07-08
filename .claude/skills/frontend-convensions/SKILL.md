name: nextjs-feature-architecture
description: Enforces a lightweight feature-first Next.js folder structure (app/features/shared) with UI, hooks, services, and types layers. Use when creating or editing any Next.js frontend component, page, feature, hook, or API call in a project.

---

# Next.js Feature-First Architecture (Light)

Standard folder structure and layering convention for all Next.js frontend projects. Apply consistently regardless of project. This is the lean version — start here, and only add `helpers/` or `config/` to a feature once it genuinely needs them (see "Growing a feature" below).

## General Guidelines

- **Feature-first**: Each major feature (e.g., Reports, Payroll, Machine Monitoring) is self-contained in its own folder.
- **Responsive**: Always make the design responsive.
- **Layer separation inside each feature**:
  - **UI** = pure presentation
  - **Hooks** = state, orchestration, data fetching entry point
  - **Services** = API calls, async logic
  - **Types** = supporting interfaces/schemas
- **Reusables live in `shared/` only if truly cross-feature.** Don't move something there preemptively — only once 2+ features need it.
- **Open/Closed Principle**: Adding a feature means adding a new folder, not editing existing unrelated ones.
- **Dependency Inversion**: Pages depend on abstractions (feature components), not implementations (raw API calls, raw HTML).

## High-Level Structure

```
src/
│
├── app/                  # Next.js App Router — route definitions only
│   ├── (public)/
│   ├── (auth)/
│   └── (dashboard)/
│
├── features/             # Main domain/features (SRP per folder)
│   ├── feature-name/
│   │   ├── ui/           # Presentational components (no logic)
│   │   ├── hooks/        # State + orchestration + data fetching (calls services)
│   │   ├── services/     # API calls, async logic
│   │   ├── types/        # Feature-specific types/interfaces + Zod schemas
│   │   └── index.ts      # Barrel export for easy imports
│   │
│   └── ...               # One folder per feature, same pattern
│
├── shared/               # Cross-feature reusable code
│   ├── ui/               # Buttons, modals, forms, etc.
│   ├── lib/              # Pure utilities (date, currency formatting)
│   ├── services/         # API clients, auth, storage handlers
│   ├── hooks/            # Global custom hooks
│   ├── config/           # App-wide constants
│   ├── types/            # Global interfaces
│   └── guards/           # Route guards / auth checks
│
├── assets/               # Images, icons, fonts
├── styles/               # Global styles & Tailwind config
└── env.d.ts              # Type definitions for env vars
```

## Folder Responsibilities

### `app/`

Routing only. No business logic, no data fetching, no state. New routes = new file, never touch unrelated ones.

### `features/<feature-name>/`

- `ui/` → pure presentational components (no state, no API calls)
- `hooks/` → orchestration: calls `services/`, manages state, exposes data + loading/error to `ui/`
- `services/` → network calls only (axios/fetch lives ONLY here)
- `types/` → interfaces + Zod schemas for this feature

### `shared/`

- `ui/` → reusable visual building blocks
- `lib/` → pure utility functions (`date.ts`, `currency.ts`)
- `services/` → core services (`apiClient.ts`, `authService.ts`)
- `hooks/` → global hooks used across 2+ features (`useAuth`, `useMediaQuery`)
- `config/` → app-wide constants
- `types/` → common global types
- `guards/` → route guards / permission checks

### `assets/` and `styles/`

Images/icons/fonts, and global Tailwind config/overrides respectively.

## Rules Claude Must Follow

- **One responsibility per file**: UI = looks only. Hook = orchestration only. Service = backend calls only.
- **Feature isolation**: if something belongs to one feature only, keep it there. Don't move to `shared/` preemptively.
- **Dependency direction**: Pages → Hooks → UI + Services. UI never calls APIs directly.
- **Type segregation**: keep feature-specific types in that feature's `types/`. Move to `shared/types` only once reused by 2+ features.
- **Barrel exports (`index.ts`)**: each feature exports its public surface only — internal-only files stay unexported.
- **Don't create empty scaffolding**: if a feature has no need for a file/folder yet, don't create it just to match a template.

## How the pieces connect

`UI (component) → Hook → Service`

- **UI** renders based on props passed down.
- **Hook** (`use-reports.ts`) calls the service, manages loading/error/data state.
- **Service** (`reports.service.ts`) makes the actual HTTP request via the shared `apiClient`.

```
[UI] (ReportTable) → rendered by → [Hook] (useReports)
                                        ↓
                              calls → [Service] (getReports)
                                        ↓
                              gets raw API data
                                        ↓
                              updates state → [UI] re-renders
```

## Example Feature Flow — "Reports"

```ts
// app/(dashboard)/reports/page.tsx
import { ReportsContainer } from "@/features/reports";

export default function Page() {
  return <ReportsContainer />;
}
```

```ts
// features/reports/services/reports.service.ts
import { apiClient } from "@/shared/services/apiClient";
import type { Report } from "../types";

export const reportsService = {
  list: () => apiClient.get<Report[]>("/reports"),
};
```

```ts
// features/reports/hooks/use-reports.ts
import { useEffect, useState } from "react";
import { reportsService } from "../services/reports.service";
import type { Report } from "../types";

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.list().then((res) => {
      setReports(res.data);
      setLoading(false);
    });
  }, []);

  return { reports, loading };
}
```

```ts
// features/reports/ui/report-card.tsx
import type { Report } from "../types";

export function ReportCard({ data }: { data: Report }) {
  return <div>{data.title}</div>;
}
```

```ts
// features/reports/ui/reports-container.tsx
"use client";
import { useReports } from "../hooks/use-reports";
import { ReportCard } from "./report-card";

export function ReportsContainer() {
  const { reports, loading } = useReports();
  if (loading) return <p>Loading...</p>;
  return reports.map((r) => <ReportCard key={r.id} data={r} />);
}
```

```ts
// features/reports/index.ts
export { ReportsContainer } from "./ui/reports-container";
export type { Report } from "./types";
```

## Growing a feature (when to add `helpers/` or `config/`)

Add these back in **per-feature, only when earned**:

- **`helpers/`** — once the feature has 2+ pure transformation functions that don't belong in a hook (e.g. `transformReportRows()`, `groupByMonth()`).
- **`config/`** — once the feature has constants/options that would otherwise clutter a component or hook (e.g. status enums, filter options, field definitions).

Don't create these folders upfront for every feature — only when a file would otherwise be misplaced.

## When reviewing existing code

If a component mixes concerns (e.g. a `ui/` component calling the API directly, or a route file with fetching logic inline), flag it and propose moving the logic to the correct layer rather than leaving it as-is.
