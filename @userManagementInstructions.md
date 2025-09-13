## User Management (Superadmin-only) — Requirements and Spec

Goal: Add a superadmin-only user management page, reachable from the top-right user menu (visible only to superadmins). The page should list all users, display usage metrics (number of projects, number of generations), and allow changing user status from trial → subscribed. Prepare for a next phase where public users, trial users, and subscribed users see different page sets.

### Definitions

- Role: `User.role` currently defaults to "admin". We will introduce two concepts:
  - `role`: "user" | "admin" | "superadmin" (string)
  - `plan`: "trial" | "subscribed" (string) — indicates billing/subscription state

### Data Model Changes (Prisma)

- Add fields to `User`:
  - `role String @default("user")`
  - `plan String @default("trial")`
  - `generations Int @default(0)` (usage counter for nano-banana generations)

Notes:

- Existing `User.role` defaults to "admin"; migrate: map current users to `admin` or `superadmin` per seed, and set others to `user` going forward.
- Usage metrics:
  - `projectsCount`: computed via `Project` relation count
  - `generations`: numeric column incremented by `/api/nano-banana` route

### Authorization Model

- JWT payload already includes `role`. Enforce:
  - Superadmin-only access to `/admin/users`
  - Only superadmin can change another user’s `plan` or `role`
  - Admin can view the page but cannot mutate (optional; initial: deny admin access)

Server checks:

- Middleware/route guards verify `role === "superadmin"` for:
  - GET `/api/admin/users`
  - PATCH `/api/admin/users/[id]` (update plan/role)

### API Endpoints

- GET `/api/admin/users`
  - Returns array: `{ id, email, role, plan, createdAt, projectsCount, generations }[]`
- PATCH `/api/admin/users/[id]`
  - Body: `{ plan?: "trial" | "subscribed", role?: "user" | "admin" | "superadmin" }`
  - Validations: superadmin only; forbid self-demotion to avoid lockout unless at least one other superadmin exists

### UI/Navigation

- Header user menu (`src/components/Header.tsx`):
  - Show a new row "User Management" linking to `/admin/users` only when the authenticated user has `role === "superadmin"`
- New page: `/admin/users` (Next.js route)
  - Server component to fetch users; client component for interactions
  - Table columns: Email, Role, Plan, Projects, Generations, Created, Actions
  - Actions column:
    - Dropdown or inline control to set Plan: Trial/Subscribed
    - Optional: Role change (guarded, requires confirmation)
  - Filters/search: email contains (optional for v1)
  - Pagination: simple page/limit (optional for v1)

### Usage Metrics Calculation

- Projects count: `prisma.project.count({ where: { userId } })`
- Generations: `User.generations` column updated in `/api/nano-banana`

### API Wiring Details

- Add `src/app/api/admin/users/route.ts` (GET)
- Add `src/app/api/admin/users/[id]/route.ts` (PATCH)
- Both verify JWT via `verifyAuthToken` and `role === "superadmin"`
- Error codes: 401 unauthenticated; 403 unauthorized; 400 validation; 409 conflict (self-demotion lockout)

### Database Migration Plan

1. Add new columns `plan`, `generations`, and adjust `role` default to "user"
2. Backfill:
   - If `role === "admin"` currently, keep as "admin" or promote one known account to "superadmin" via seed
   - Set `plan = "trial"` for all existing users
   - Initialize `generations = 0`
3. Ensure at least one superadmin exists

### Security Considerations

- Server-side checks only (do not trust client role)
- CSRF: use POST/PATCH with same-site cookies and origin checks; Next API already using `httpOnly` cookie
- Audit log (optional): append row when role/plan changes (future enhancement)

### UX Details

- Button states: disable while request in-flight; toast on success/error
- Confirmation modal when changing role to/from superadmin
- Inline badge styles for Plan (trial=subtle, subscribed=success)

### Phase 2 Preview (Future Segmentation)

- Public (no auth): landing, marketing, limited explore
- Trial (auth): full editor with generation limits, banners/upsell, watermark (optional)
- Subscribed (auth): full features, higher limits, no watermark
- Routing guards:
  - Middleware/SSR: check plan for protected pages; redirect/notify as needed

### Acceptance Criteria

- Only superadmin sees and can access `/admin/users`
- Page lists all users with accurate `projectsCount` and `generations`
- Superadmin can switch any user’s plan between trial/subscribed
- Role changes guarded; cannot remove last remaining superadmin
- Auth and authorization enforced on all related routes

### Minimal File Additions

- `src/app/admin/users/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- (Optional) `src/components/admin/UserTable.tsx`

