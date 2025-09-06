## Dev server & Hot Reload

- Run: `yarn dev` → starts Next.js dev server at `http://localhost:3000` with Fast Refresh (hot reload) enabled by default.
- Client Components preserve state across edits when possible; some structural changes can trigger a full reload.
- Server/Route handlers will live-reload on file changes; requests after save reflect updates.
- Restart required when changing: `next.config.ts`, `tsconfig.json`, `.env*`, Prisma schema after `prisma generate/migrate` if types drift, or dependency installs.
