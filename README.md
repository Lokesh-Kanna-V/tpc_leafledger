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

docker compose up -d

## 3. Open the app

http://localhost:3000

## 4. Stop the app

docker compose down

## Important

- Do NOT run: docker compose down -v (this deletes all data)
