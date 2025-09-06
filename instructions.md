# Nano Banana Hackathon – Infra Setup

**Stack**: Next.js (App Router) + Tailwind CSS + Prisma + SQLite.

## Getting started

- cd my-site
- yarn dev # http://localhost:3000

## Scripts

- yarn build
- yarn start
- yarn lint
- yarn prisma:studio

## Database

- .env sets DATABASE_URL="file:./prisma/dev.db" (SQLite)
- Schema: prisma/schema.prisma (models: Subscriber, User, Project)
- Migrations applied via: npx prisma migrate dev -n init

## Important files

- src/lib/prisma.ts (Prisma singleton)
- src/app/page.tsx (conditional: waitlist when logged out, canvas when logged in)
- src/app/api/subscribe/route.ts (POST handler)
- src/app/layout.tsx (base layout + styles)
- src/app/globals.css (Tailwind v4 @import "tailwindcss")

## Notes

- Path alias: '@/_' -> './src/_' in tsconfig.json
- If schema changes: npx prisma generate && npx prisma migrate dev

## Auth

- Login page: /account/login
- Admin user: michaelbergin@higharc.com / nanobanana
- JWT cookie: set by POST /api/login, cleared by POST /api/logout
- Middleware protects all routes except /account/login and auth/waitlist APIs

### Auth/Login implementation notes

- `src/app/account/login/page.tsx` is a server component wrapper that renders `LoginForm`.
- `src/app/account/login/LoginForm.tsx` is a client component containing all interactive login logic.
- This split avoids an SSR bundling/runtime error (`__webpack_modules__[moduleId] is not a function`) observed when the login page was a client component file directly.

### Auth Cookie + Verification

- Cookie name: `auth` (httpOnly, sameSite=lax, secure=false in dev).
- Token signing/verification: `src/lib/auth.ts` using `jose` with `AUTH_SECRET` env var.
- Middleware (`middleware.ts`) reads the `auth` cookie and verifies it to protect routes.
- Server routes should read cookies via `next/headers` `cookies()` instead of parsing `req.headers`.

### Project creation/auth flow

- Client: `src/app/new/page.tsx` posts to `/api/projects` with `credentials: "include"` so the browser sends the `auth` cookie.
- API: `src/app/api/projects/route.ts` and `src/app/api/projects/[id]/route.ts` read the cookie using `cookies()` from `next/headers`, verify via `verifyAuthToken`, and scope DB writes to the authenticated `userId`.

## Canvas

- Canvas component: `src/components/CanvasBoard.tsx`
- Features: freehand draw with mouse, overlay controls (Draw/Erase, color picker, brush size, Clear), HiDPI-aware resize.
- Layers: reducer-managed layers with active selection, visibility toggling, add/remove, per-layer clearing.
- Persistence: JSON format `{ layers: Layer[] }`, with legacy single-layer import supported.
- Screenshot: `getCanvasScreenshot` composes visible layers to a PNG data URL; latest capture is previewed in UI.
- Layout: canvas is truly full-screen within the content area. Controls are an overlay panel positioned at top-left; there is no left rail.
- Shell: `src/components/AppShell.tsx` sets `main` to `h-full` so children can fill viewport height beneath the header.
- Project page: `src/app/projects/[id]/page.tsx` uses a two-row grid (header + `1fr`) so `ProjectCanvas` occupies all remaining space.
- Project integration: Canvas data is saved to database and persists across sessions
- Routes: `/new` (create project), `/projects` (list), `/projects/[id]` (view/edit project)

## Navigation

- Top-left Menu opens an overlay left rail; closes on outside click or toggle.
- Links: `New Project` (`/new`), `Create` (`/create`), `Projects` (`/projects`).
- `Create` shows only `CanvasBoard` taking full width.

## Data

- Prisma model `Project { id, name, data Json, userId, createdAt }` (SQLite).
- We store canvas data as JSON in `Project.data`.
