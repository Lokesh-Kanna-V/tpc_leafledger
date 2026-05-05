# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

# LeafLedger Setup

## 1. Install Docker

Download Docker Desktop and install it.

## 2. Start the app

Open terminal in this folder and run:

```bash
docker compose up -d --build
```

## 3. Open the app

http://localhost:3000

## 4. Stop the app

docker compose down

## Important

- **Data reset**: `docker compose down -v` deletes all database data (fresh start).
- **First run after switching to Prisma**: if you already had tables created manually, Prisma will “baseline” the initial migration automatically on app start, then apply new migrations normally.
