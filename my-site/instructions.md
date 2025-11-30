# MonkeyDoodle - Neon Auth (Stack Auth) Migration

## Waitlist System

The application implements a waitlist system with role-based access control:

### User Status Levels

Users have one of four status levels (defined in `UserStatus` enum):

1. **waitlist** - Default status for new users. Cannot access the app.
2. **user** - Standard user with app access.
3. **userPro** - Pro user with app access (for future premium features).
4. **admin** - Full access including admin panel.

### Access Control Flow

1. New users sign up → automatically added with `waitlist` status
2. Waitlist users see "You're on the list" message on landing page
3. Admin promotes users to `user` status via Admin Panel (`/admin`)
4. Users with `user`, `userPro`, or `admin` status can access the app

### Admin Panel

- **URL**: `/admin`
- **Access**: Only users with `admin` status
- **Default Admin**: `michael.s.bergin@gmail.com`
- **Features**:
  - View all users with search/filter
  - Change user status (waitlist → user → userPro → admin)
  - Stats overview by status

### Key Files

- `src/lib/userSync.ts` - User sync and access control utilities
- `src/app/admin/page.tsx` - Admin panel (server component)
- `src/app/admin/AdminDashboard.tsx` - Admin panel UI (client component)
- `src/app/api/admin/users/route.ts` - List users API
- `src/app/api/admin/users/[id]/route.ts` - Update user status API

---

## Authentication System

This application uses **Stack Auth** (Neon Auth) for authentication, providing:

- **Google SSO** - Sign in with Google account
- **Email/Password** - Standard email and password registration
- **Built-in UI** - Pre-built sign-in/sign-up pages at `/handler/sign-in` and `/handler/sign-up`

## Environment Variables Required

Create a `.env.local` file with the following variables:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Stack Auth (Neon Auth)
# Get these from https://app.stack-auth.com after creating a project
NEXT_PUBLIC_STACK_PROJECT_ID="your-project-id"
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="your-publishable-key"
STACK_SECRET_SERVER_KEY="your-secret-server-key"

# Cloudinary (for image uploads)
CLOUDINARY_URL="cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-unsigned-preset"

# FAL AI (for image generation)
FAL_KEY="your-fal-api-key"
```

## Stack Auth Setup

### 1. Get Stack Auth Credentials

1. Go to [https://app.stack-auth.com](https://app.stack-auth.com)
2. Create a new project (or select existing)
3. Go to **API Keys** section
4. Copy:
   - Project ID → `NEXT_PUBLIC_STACK_PROJECT_ID`
   - Publishable Client Key → `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
   - Secret Server Key → `STACK_SECRET_SERVER_KEY`

### 2. Enable Google OAuth

1. In Stack Auth dashboard, go to **Auth Methods** in the sidebar
2. Click **Add SSO Providers** and select **Google**
3. Either:
   - Use Stack's shared development keys (shows Stack logo on OAuth page)
   - Or configure your own Google OAuth credentials:
     1. Go to [Google Cloud Console](https://console.cloud.google.com/)
     2. Create OAuth 2.0 credentials
     3. Add redirect URI: `https://api.stack-auth.com/api/v1/auth/oauth/callback/google`
     4. Enter Client ID and Secret in Stack Auth dashboard

### 3. Enable Email/Password Auth

1. In Stack Auth dashboard, go to **Auth Methods**
2. Enable **Email/Password** authentication
3. Configure email verification settings as needed

## Database Schema

The Prisma schema includes:

- `User.id` - String (Stack Auth UUID)
- `User.status` - UserStatus enum (waitlist, user, userPro, admin)
- `Project.userId` - References the Stack Auth user ID
- Users are automatically synced from Stack Auth on first login

### UserStatus Enum

```prisma
enum UserStatus {
  waitlist
  user
  userPro
  admin
}
```

### Run Migrations

```bash
cd my-site
npx prisma db push  # For development
# or
npx prisma migrate dev --name your-migration-name
```

**Nov 30, 2025 update:** Consolidated all migrations into a single `20251130000000_init` migration that creates the full Stack Auth-compatible schema from scratch. For fresh databases, run `npx prisma migrate reset --force` or `npx prisma migrate deploy`.

**Single database reminder:** Prisma defines only one datasource (`db`) and it always reads from the env var `DATABASE_URL`. There is no secondary SQLite schema; any historical mentions of `file:./prisma/dev.db` are deprecated and should not be used.

## Key Files

### Authentication Configuration

- `src/stack/client.tsx` - Client-side Stack Auth configuration
- `src/stack/server.tsx` - Server-side Stack Auth configuration
- `src/app/handler/[...stack]/page.tsx` - Stack Auth handler routes

### Protected Routes

The middleware (`middleware.ts`) protects all routes except:

- `/_next` - Next.js assets
- `/handler` - Stack Auth authentication pages
- `/api/subscribe` - Public subscription endpoint
- `/` - Landing page
- `/favicon.ico`

### User Authentication in Components

**Server Components:**

```tsx
import { stackServerApp } from "@/stack/server";

export default async function MyPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  // user.id, user.primaryEmail, user.displayName, etc.
}
```

**Client Components:**

```tsx
"use client";
import { useUser } from "@stackframe/stack";

export default function MyComponent() {
  const user = useUser();
  // null if not signed in
}
```

### User Button

The header uses Stack Auth's `<UserButton />` component for user menu/logout:

```tsx
import { UserButton } from "@stackframe/stack";

<UserButton />;
```

## Authentication Flow

1. User visits protected route
2. Middleware checks Stack Auth session via `stackServerApp.getUser()`
3. If not authenticated, redirect to `/handler/sign-in`
4. Stack Auth handles sign-in (Google SSO or email/password)
5. On success, user redirected back to original page
6. User synced to local database on first project creation

## Development Commands

```bash
# Install dependencies
yarn

# Start development server
yarn dev

# Type checking (strict mode enabled)
yarn typecheck

# Linting
yarn lint

# Fix auto-fixable lint issues
yarn lint:fix

# Database migrations
npx prisma migrate dev

# View database
npx prisma studio
```

## TypeScript Configuration

The project uses strict TypeScript settings for better code quality:

- `strict: true` - Enables all strict type-checking options
- `strictNullChecks: true` - Ensures null and undefined are handled explicitly
- `strictFunctionTypes: true` - Enables strict function type checking
- `noImplicitAny: true` - Requires explicit types (no implicit any)
- `noImplicitReturns: true` - Ensures all code paths return a value
- `noFallthroughCasesInSwitch: true` - Prevents unintentional case fallthrough
- `forceConsistentCasingInFileNames: true` - Enforces consistent file naming

## ESLint Configuration

The project uses ESLint with TypeScript support:

- **Unused Variables**: Errors for unused imports/variables (prefix with `_` to ignore)
- **Type Safety**: Warnings for `any` usage and unsafe operations
- **Null Safety**: Warnings for nullish coalescing and optional chaining opportunities
- **Best Practices**: Enforces `const`, disallows `var`, strict equality checks

## Nano-Banana Pro Endpoint Routing

The `/api/nano-banana` endpoint routes to different FAL AI endpoints based on user status:

### Endpoint Routing Logic

- **Pro Endpoint** (`fal-ai/nano-banana-pro/edit`): Used for users with `userPro` or `admin` status
- **Standard Endpoint** (`fal-ai/nano-banana/edit`): Used for all other users (`waitlist`, `user`)

### Implementation Files

- `src/lib/fal.ts` - Contains `runNanoBananaEdit` function with `usePro` parameter
- `src/app/api/nano-banana/route.ts` - Syncs user, checks status, and routes accordingly

### How It Works

1. User makes request to `/api/nano-banana`
2. Stack Auth verifies authentication
3. User is synced to database via `syncUserToDatabase()`
4. User status is checked with `hasProAccess()` function
5. Request is routed to appropriate FAL endpoint based on status

---

## Security Audit (Nov 30, 2025)

### Security Features Implemented

1. **Authentication & Authorization**

   - Stack Auth (Neon Auth) for authentication
   - Role-based access control: waitlist, user, userPro, admin
   - All protected routes verified in middleware
   - Admin routes require admin status

2. **Rate Limiting**

   - `/api/nano-banana` - 10 requests/minute per IP
   - `/api/subscribe` - 5 requests/minute per IP
   - Supports Upstash Redis (production) and in-memory (development)

3. **Security Headers** (via `next.config.ts`)

   - `X-Frame-Options: DENY` - Prevents clickjacking
   - `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-XSS-Protection: 1; mode=block`
   - `Permissions-Policy` - Disables camera, microphone, geolocation

4. **Data Protection**

   - Prisma ORM for SQL injection prevention
   - Projects scoped to owner (userId checks on all queries)
   - Cloudinary signing with parameter allowlist
   - API keys returned from server, not hardcoded in client

5. **Environment Variables**
   - `DATABASE_URL` - PostgreSQL connection
   - `NEXT_PUBLIC_STACK_PROJECT_ID` - Stack Auth project
   - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` - Stack Auth client key
   - `STACK_SECRET_SERVER_KEY` - Stack Auth secret (server-only)
   - `CLOUDINARY_URL` - Cloudinary credentials
   - `FAL_KEY` - FAL AI API key
   - `ADMIN_EMAIL` - Admin user email (optional, defaults to michael.s.bergin@gmail.com)
   - `UPSTASH_REDIS_REST_URL` - Redis for rate limiting (optional)
   - `UPSTASH_REDIS_REST_TOKEN` - Redis auth token (optional)

## Code Review Summary (Nov 2024)

### Fixed Issues

1. **Unused Imports**: Removed unused `NextResponse` import in logout route and `redirect` in projects page
2. **NoZoom Component**: Fixed unused `touchPoints` variable and replaced `any` types with proper `SafariTouchEvent` interface
3. **TypeScript Config**: Enhanced with stricter settings while maintaining build compatibility

### Architecture Notes

- **Authentication**: Uses Stack Auth (Neon Auth) with Google SSO and email/password support
- **Database**: PostgreSQL via Prisma with proper user/project relationships
- **Rate Limiting**: Supports both Upstash Redis (production) and in-memory (development)
- **Image Generation**: FAL AI integration with Cloudinary for image storage
- **Canvas**: Multi-layer drawing system with undo/redo, image uploads, and AI generation

## Testing Authentication

1. Start dev server: `yarn dev`
2. Visit `http://localhost:3000`
3. Try to access `/projects` - should redirect to sign-in
4. Sign in with Google or create email account
5. You should be redirected back and able to access protected pages

---

## Previous Documentation

### 🚨 CRITICAL: No-Zoom Full-Frame Application Requirement

This application MUST maintain a full-frame, full-page experience with ABSOLUTELY NO ZOOM functionality allowed.

#### Implementation Details

1. **Viewport Configuration** (`layout.tsx`)

   - `initialScale: 1` - Sets default zoom to 100%
   - `maximumScale: 1` - Prevents zoom beyond 100%
   - `userScalable: false` - Disables user zoom entirely
   - `viewportFit: "cover"` - Ensures full viewport coverage

2. **NoZoom Component** (`components/NoZoom.tsx`)

   - Blocks Safari pinch gestures
   - Prevents Ctrl/Cmd + wheel zoom
   - Disables keyboard zoom shortcuts

3. **CSS-Level Prevention** (`globals.css`)
   - `text-size-adjust: 100%`
   - `touch-action: none` globally
   - `overscroll-behavior: none`
   - All input elements forced to `font-size: 16px !important`

### Canvas Features

- Multi-layer drawing system with undo/redo
- Image uploads via Cloudinary
- AI image generation via FAL
- Project thumbnails with periodic auto-capture
- Drag-and-drop layer reordering

### UI Components

Built with shadcn/ui components:

- Button, Input, Card, Sheet, Label, Form, Badge
- Consistent theming with CSS custom properties
- Dark/light mode ready
