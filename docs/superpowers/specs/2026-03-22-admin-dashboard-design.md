# Admin Dashboard Design Spec
**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Add a full admin dashboard to UNTOLD.ink at `/admin`. Replaces the minimal "Admin" header from Plan 6 with a persistent dark sidebar shell and three new pages: Overview (stats + charts), Content (all published content with feature/force-unpublish), and Users (role management, suspend, delete). The existing Translations page gains the sidebar automatically via the shared layout.

---

## Architecture

All admin pages are server components under `app/[locale]/admin/`, guarded by `requireAdmin()` in the layout. Mutations go through Server Actions in `lib/actions/admin.ts`. No new API routes. After each mutation, `revalidatePath` re-renders the server component. Client components are thin wrappers around Server Actions that show loading state and inline errors.

**Chart library:** Recharts — added as a new dependency. Pattern: server component fetches data → passes as props to `'use client'` chart components.

---

## Routes

| Route | Page |
|---|---|
| `/admin` | Overview — stat cards + charts + recent activity |
| `/admin/translations` | Translations — exists from Plan 6 |
| `/admin/content` | Content — all published content, feature/unfeature, force-unpublish |
| `/admin/users` | Users — all profiles, role change, suspend, delete |

---

## Database Migrations

Two new columns:

**`content.is_featured`** — `BOOLEAN NOT NULL DEFAULT FALSE`
Marks content as featured. Used by the admin content page. Future listing pages will surface featured content higher (out of scope for this plan — the flag is stored now, wired later).

**`profiles.suspended_at`** — `TIMESTAMPTZ NULL`
`NULL` = active. Set = suspended. Checked by middleware to block suspended users.

---

## Admin Layout — `app/[locale]/admin/layout.tsx`

Replaces the current minimal layout. Two-column shell:

```
┌─────────────┬──────────────────────────────┐
│ AdminSidebar│ {children}                   │
│ (240px,fixed│                              │
│  dark)      │                              │
└─────────────┴──────────────────────────────┘
```

The layout calls `requireAdmin()` server-side, then renders `<AdminSidebar>` alongside `{children}`. The public site's `Navigation` and `Footer` are excluded — the admin has its own chrome.

### AdminSidebar — `components/admin/AdminSidebar.tsx`

`'use client'` — uses `usePathname()` to highlight the active link.

Contents (top to bottom):
- **UNTOLD** wordmark
- Nav links with icons: **Overview** (`/admin`), **Translations** (`/admin/translations`), **Content** (`/admin/content`), **Users** (`/admin/users`)
- Bottom: **← Back to site** link to `/`

---

## Overview Page — `app/[locale]/admin/page.tsx`

Server component. Fetches all data server-side, passes to client chart components.

### Stat cards (top row)
- **Published content** — total count
- **Total users** — total profiles count
- **Pending translations** — count of published items missing at least one locale in `content_translations`

### Charts
- **Bar chart** (`components/admin/ContentByTypeChart.tsx`, `'use client'`) — published content count per type (article, video, podcast, pill, course). Uses Recharts `BarChart`.
- **Donut chart** (`components/admin/UsersByRoleChart.tsx`, `'use client'`) — user count per role (user, author, admin). Uses Recharts `PieChart` with `innerRadius`.

### Recent activity table
Last 10 published content items: title, type badge, author name, published date. Ordered by `published_at DESC`.

---

## Content Page — `app/[locale]/admin/content/page.tsx`

Server component. Fetches 50 most recently published items across all authors, joined with author profile (display_name).

### Table columns
| Column | Content |
|---|---|
| Title | English title + type badge |
| Author | Author display_name |
| Published | Published date |
| Featured | `FeatureButton` — green ✓ if featured, toggle to unfeature; grey if not, toggle to feature |
| Actions | `AdminUnpublishButton` — force-unpublishes (sets `status = 'draft'`) |

### Server Actions (`lib/actions/admin.ts`)

**`toggleFeatured(contentId: string)`**
- Requires admin
- Flips `content.is_featured`
- `revalidatePath('/admin/content')`

**`adminUnpublishContent(contentId: string)`**
- Requires admin
- Sets `content.status = 'draft'`, `published_at = null`
- No `author_id` filter
- `revalidatePath('/admin/content')`

### Client components
- **`FeatureButton`** (`components/admin/FeatureButton.tsx`) — `'use client'`, calls `toggleFeatured`, shows loading state, inline error
- **`AdminUnpublishButton`** (`components/admin/AdminUnpublishButton.tsx`) — `'use client'`, calls `adminUnpublishContent`, confirmation before firing, shows loading state, inline error

---

## Users Page — `app/[locale]/admin/users/page.tsx`

Server component. Fetches 50 most recently joined profiles, ordered by `created_at DESC`.

### Table columns
| Column | Content |
|---|---|
| Name | `display_name` (+ avatar if available) |
| Email | From `auth.users` join — fetched via service role client |
| Role | Current role badge |
| Joined | `created_at` date |
| Status | "Active" or "Suspended" (based on `suspended_at`) |
| Actions | `RoleSelect`, `SuspendButton`, `DeleteUserButton` |

**Note:** Email requires a service role client query against `auth.users` joined with `profiles`. The users page uses `createServiceRoleClient()` from `lib/supabase/service-role.ts`.

### Server Actions (`lib/actions/admin.ts`)

**`setUserRole(userId: string, role: 'user' | 'author' | 'admin')`**
- Requires admin
- Updates `profiles.role`
- `revalidatePath('/admin/users')`

**`toggleSuspendUser(userId: string)`**
- Requires admin
- Flips `suspended_at` (null → now, now → null)
- `revalidatePath('/admin/users')`

**`deleteUser(userId: string)`**
- Requires admin
- Uses service role client to call `auth.admin.deleteUser(userId)` — cascades to `profiles`
- `revalidatePath('/admin/users')`

### Client components
- **`RoleSelect`** (`components/admin/RoleSelect.tsx`) — `'use client'`, `<select>` for role, calls `setUserRole` on change, shows loading state
- **`SuspendButton`** (`components/admin/SuspendButton.tsx`) — `'use client'`, calls `toggleSuspendUser`, shows current state, inline error
- **`DeleteUserButton`** (`components/admin/DeleteUserButton.tsx`) — `'use client'`, confirmation dialog before firing `deleteUser`, inline error

---

## Middleware: Suspended User Check

`middleware.ts` is updated to check `profiles.suspended_at` after verifying the JWT. If `suspended_at` is set, redirect to `/suspended`.

**`app/[locale]/suspended/page.tsx`** — simple public page explaining the account is suspended, with a contact link. No auth required.

---

## Error Handling

- All Server Actions call `requireAdmin()` — non-admins get a redirect, not an error
- `deleteUser` is irreversible — `DeleteUserButton` requires a confirmation dialog before firing
- Chart components receive typed data props — if data is empty, charts render an empty state message instead of crashing
- Supabase errors in Server Actions are thrown so client components can catch and display them inline

---

## File Structure

### New files
```
components/admin/AdminSidebar.tsx
components/admin/ContentByTypeChart.tsx
components/admin/UsersByRoleChart.tsx
components/admin/FeatureButton.tsx
components/admin/AdminUnpublishButton.tsx
components/admin/RoleSelect.tsx
components/admin/SuspendButton.tsx
components/admin/DeleteUserButton.tsx
app/[locale]/admin/content/page.tsx
app/[locale]/admin/users/page.tsx
app/[locale]/suspended/page.tsx
supabase/migrations/YYYYMMDD_admin_dashboard.sql
```

### Modified files
```
app/[locale]/admin/layout.tsx        — replace with sidebar shell
app/[locale]/admin/page.tsx          — new overview page (currently missing)
lib/actions/admin.ts                 — new file with all admin Server Actions
middleware.ts                        — add suspended_at check
package.json                         — add recharts
```

---

## Testing

### Unit tests
- `tests/unit/lib/actions/admin.test.ts` — each Server Action: mock Supabase, verify correct DB operations, verify `requireAdmin()` is enforced

### E2E tests
- `tests/e2e/admin.spec.ts` — unauthenticated redirects to login, non-admin redirects to `/`, admin smoke tests for all 4 pages
