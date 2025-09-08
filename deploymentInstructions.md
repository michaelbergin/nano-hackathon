## Deployment – Fastest Path (Vercel + Neon Postgres)

This project is a Next.js (App Router) app in the `my-site` subfolder. Choose one of the following setups:

- Recommended (small schema tweak): Vercel + Neon (Postgres)
- No schema change (uses SQLite): Render Web Service + Persistent Disk

SQLite is not suitable on serverless (Vercel) runtimes. For Vercel deployments, you must switch Prisma to Postgres (Neon). The Render path keeps SQLite with a persistent disk.

### 1) Prerequisites

- Vercel account (project will be imported from GitHub)
- Neon account (free Postgres)
- Cloudinary account (unsigned preset optional; signed fallback supported)
- fal.ai API key

### 2A) (Vercel path) Switch Prisma to Postgres (required once)

Before deploying to Vercel with Neon, update Prisma to use Postgres:

1. Edit `my-site/prisma/schema.prisma` and change:
   - `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`
2. Run locally against Neon: `npx prisma generate && npx prisma migrate dev -n init`

Commit this change before deploying to Vercel.

### 2B) Create Neon database

1. In Neon, create a new project/database.
2. Copy the Postgres connection string. It should look like:
   `postgresql://<user>:<password>@<host>/<database>?sslmode=require`

You will use this for `DATABASE_URL`.

### 3A) Vercel project settings (monorepo root dir)

1. On Vercel → New Project → Import your GitHub repo.
2. Set Root Directory: `my-site`
3. Framework Preset: Next.js
4. Install Command: `yarn`
5. Build Command: `yarn && npx prisma generate && npx prisma migrate deploy && yarn build`
   - This ensures Prisma Client is generated and DB migrations run against Neon during the Vercel build.
6. Output Directory: leave default for Next.js.

### 4A) Environment variables (Vercel → Project → Settings → Environment Variables)

- `DATABASE_URL` = Neon connection string (required)
- `AUTH_SECRET` = any strong secret string (required; used for JWT cookie)
- `FAL_KEY` = your fal.ai API key (required for Generate)
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` = your unsigned upload preset (optional; client-side uploads)
- `CLOUDINARY_URL` = `cloudinary://<API_KEY>:<API_SECRET>@<cloud_name>` (optional; enables signed upload fallback)
- `UPSTASH_REDIS_REST_URL` = Upstash Redis REST URL (optional; enables global rate limiting)
- `UPSTASH_REDIS_REST_TOKEN` = Upstash Redis REST token (optional)

Notes:

- Only `NEXT_PUBLIC_*` variables are exposed to the browser. All others remain server-only.
- If you do not set `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, the app will request a signature via `/api/cloudinary/sign` and use `CLOUDINARY_URL` server-side.

### 5A) Seed an admin user (once, against Neon)

The app expects at least one user (email/password) to log in. Seed locally against the Neon DB:

```bash
# From repo root
export DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
cd my-site
yarn
yarn seed
```

Default admin (from seed): `michaelbergin@higharc.com` / `nanobanana`.

### 6A) Deploy (Vercel)

1. Push to GitHub. Vercel will build and deploy using the build command above.
2. After deploy, visit the URL, you should be redirected to `/account/login`. Use the seeded credentials to sign in.

### 7A) Post-deploy checks

- Login and create a project (`/new` → redirects to `/create?id=...`).
- Draw on the canvas and refresh; data should persist (Prisma → Neon).
- Generate Banana: requires `FAL_KEY`.
- Screenshot thumbnail: ensure either `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` or `CLOUDINARY_URL` is set; thumbnails appear on `/projects`.

### Troubleshooting (Vercel + Neon)

- Build fails: verify `DATABASE_URL`, `AUTH_SECRET`, and `FAL_KEY` are present.
- Prisma errors: confirm Neon is reachable and `npx prisma migrate deploy` runs during build.
- No admin user: re-run the seed locally with `DATABASE_URL` pointing to Neon.
- Image upload blocked: set either `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (unsigned) or `CLOUDINARY_URL` (signed fallback).
- Rate limiting not working across regions: add Upstash env vars above; without them the app falls back to per-instance in-memory limits.

---

## Render path (no schema change, SQLite with persistent disk)

If you prefer to avoid changing `schema.prisma` now, deploy to Render with a persistent disk so `dev.db` is writable:

### 1R) Create a Web Service

1. On Render → New → Web Service → Connect GitHub repo.
2. Root Directory: `my-site`
3. Environment: `Node`
4. Build Command: `yarn && npx prisma generate && yarn build`
5. Start Command: `yarn start`
6. Add a Disk (e.g., 1GB) mounted at `/opt/render/project/src/prisma/prisma` so the SQLite file `dev.db` is persisted.

### 2R) Environment variables (Render → Environment)

- `DATABASE_URL` = `file:./prisma/dev.db`
- `AUTH_SECRET` = strong secret
- `FAL_KEY` = fal.ai API key
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (optional)
- `CLOUDINARY_URL` (optional, for signed uploads)

Note: Ensure the working directory is `my-site` so relative `file:./prisma/dev.db` resolves. Alternatively, set an absolute path to the mounted disk file.

### 3R) Initialize the database on first deploy

Open a Shell in the Render service and run:

```bash
npx prisma migrate deploy
node -e "require('ts-node/register'); require('./prisma/seed.ts')"
```

Subsequent deploys reuse the same SQLite file on the disk.

### 4R) Verify

- Login at `/account/login` with the seeded user.
- Projects and screenshots should persist across restarts.

---

### Alternative hosts (quick notes)

- Railway/Render/Fly: also work; point `DATABASE_URL` to a managed Postgres (Railway PG, Supabase, Neon). Ensure you run `prisma generate` and `prisma migrate deploy` on each deploy.

### Reference

- App code root: `my-site`
- Prisma schema: `my-site/prisma/schema.prisma`
- Auth cookie: `auth` (JWT, secret `AUTH_SECRET`)
- Periodic screenshots and thumbnails: Cloudinary; see `my-site/src/app/projects/[id]/ProjectCanvas.tsx`
