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
  - Added `ENSURE_ACTIVE_VECTOR_LAYER` so drawing always targets a vector layer (auto-creates/selects if active is image).
  - Fixed `REMOVE_LAYER` to always compute a valid next active layer; if removing the last layer, a default vector layer is recreated and selected.
  - `SELECT_LAYER` now ensures the selected layer is visible.
  - Improved loader to hydrate both vector and image layers.
  - Inserted debug logs across reducer transitions. Tests added at `my-site/src/components/CanvasBoard.reducer.test.ts`.
- Persistence: JSON format `{ layers: Layer[] }`, with legacy single-layer import supported.
- Screenshot/Download: `getCanvasScreenshot` composes visible layers to a PNG data URL; latest capture is previewed in UI. Added "Download PNG" to save the current composite to disk.
- Generate: a Generate Banana Layer button posts the composite to `/api/nano-banana` and adds the result as an image layer with a banana badge.
  - Prompt: a text input controls the prompt sent to the generate endpoint; default/placeholder is `banana-fy`.

### Image Layers & Uploads

- You can upload an image to the canvas; it is added as a top image layer with an "img" badge. Banana-generated images keep a yellow "banana" badge.
- Cloudinary uploads are supported via unsigned upload:
  - Cloud name: `dqyx4lyxn` (configured in client request URL)
  - Set `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in `.env.local` to your unsigned upload preset name
  - If the preset is not set, uploads fall back to `URL.createObjectURL` for local preview only (not persisted remotely)
- Signed upload fallback: If no unsigned preset is configured, client requests a signature from `POST /api/cloudinary/sign` (requires `CLOUDINARY_URL` in `.env.local`) and performs a signed upload using API key and signature.
- Persistence: Image layer `imageSrc` URLs are saved in `Project.data` along with vector layers. When using local object URLs, persist a proper remote URL later if needed.

### Mobile & Apple Pencil

- Canvas now optimized for touch and stylus input:
  - `touch-action: none` on the drawing surface to prevent browser panning/zoom gestures.
  - Ignores finger touches for drawing; accepts `pointerType` pen and mouse only.
  - Uses `getCoalescedEvents()` when available for smoother Apple Pencil curves.
  - Handles `pointercancel` and `lostpointercapture` to gracefully end strokes.
  - Prevents `contextmenu` on the canvas to avoid long-press menus on iOS.
- Shell header uses `touch-manipulation` to keep scrolling responsive and reduces accidental zooming.

### Dev Notes

- Tests via Vitest: from repo root `yarn --cwd my-site test`.
- Layout: canvas is truly full-screen within the content area. Controls are an overlay panel positioned at top-left; there is no left rail.
- Shell: `src/components/AppShell.tsx` sets `main` to `h-full` so children can fill viewport height beneath the header.
- Project page: `src/app/projects/[id]/page.tsx` uses a two-row grid (header + `1fr`) so `ProjectCanvas` occupies all remaining space.
- Project integration: Canvas data is saved to database and persists across sessions
- Routes: `/new` (create project), `/projects` (list), `/projects/[id]` (view/edit project)

## Navigation

- Top-left Menu opens an overlay left rail; closes on outside click or toggle.
- Links: `New Project` (`/new`), `Create` (`/create`), `Projects` (`/projects`).
- `Create` shows only `CanvasBoard` taking full width.

### SPA Scroll Model

- Page is a full-frame SPA: `body` uses `overflow-hidden` and `h-dvh` to prevent global scrolling.
- Scroll is enabled only within intentional regions (e.g., left sheet, control panels, long lists) via `overflow-y-auto` and constrained max-heights.

## V1 Finalization

- Projects list (`/projects`) is auth-protected and scoped to the current user. Rows are clickable and link to `'/projects/[id]'`.
- Project detail page (`/projects/[id]`) fetches the project by `id` and `userId`, then renders `ProjectCanvas` with `initialData` from `Project.data`.
- `ProjectCanvas` passes `initialData` to `CanvasBoard`, which loads the persisted `{ layers: Layer[] }` state and auto-saves JSON back to `Project.data` on changes via `PATCH /api/projects/[id]`.
- Canvas data persistence supports legacy flat strokes arrays; data is stored as a JSON string in `Project.data`.

## Data

- Prisma model `Project { id, name, data Json, userId, createdAt }` (SQLite).
- We store canvas data as JSON in `Project.data`.
