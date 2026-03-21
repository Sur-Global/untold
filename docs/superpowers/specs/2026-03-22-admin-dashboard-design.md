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

## Database Migration

One new column only:

**`profiles.suspended_at`** — `TIMESTAMPTZ NULL DEFAULT NULL`
`NULL` = active. Set = suspended. Checked by `requireUser()`, `requireCreator()`, and `requireAdmin()` (see Suspended Users section below).

Note: `content.is_featured` (`BOOLEAN NOT NULL DEFAULT FALSE`) already exists in the baseline schema — no migration needed for it.

---

## Suspended Users

The suspended check lives in the auth guard helpers, **not** middleware. Middleware deliberately avoids network calls (local JWT verification only). Adding a DB query there would degrade every request.

**`lib/require-user.ts`**, **`lib/require-creator.ts`**, **`lib/require-admin.ts`** are each updated to query `profiles.suspended_at` after confirming the user is authenticated. If `suspended_at IS NOT NULL`, redirect to `/<locale>/suspended`.

```ts
// Added to each require-* function after confirming user is authenticated:
const { data: profile } = await supabase
  .from('profiles').select('suspended_at, ...').eq('id', user.id).single()
if (profile?.suspended_at) redirect('/suspended')
```

**`app/[locale]/suspended/page.tsx`** — simple public page explaining the account is suspended, with a contact link. No auth required. The `/suspended` path is locale-prefixed (`localePrefix: 'as-needed'` in `i18n/routing.ts`) — no routing config changes needed since all paths are locale-aware by default.

---

## Admin Layout — `app/[locale]/admin/layout.tsx`

Replaces the current minimal layout entirely. Two-column shell:

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
- **Published content** — total count across all types
- **Total users** — total profiles count
- **Pending translations** — count of published items missing at least one locale from `SUPPORTED_LOCALES` (imported from `lib/deepl.ts`: `['es', 'pt', 'fr', 'de', 'da']`) in `content_translations`

### Charts
- **Bar chart** (`components/admin/ContentByTypeChart.tsx`, `'use client'`) — published content count per type (article, video, podcast, pill, course). Uses Recharts `BarChart`.
- **Donut chart** (`components/admin/UsersByRoleChart.tsx`, `'use client'`) — user count per role (user, author, admin). Uses Recharts `PieChart` with `innerRadius`.

### Recent activity table
Last 10 published content items: title, type badge, author name, published date. Ordered by `published_at DESC`.

---

## Content Page — `app/[locale]/admin/content/page.tsx`

Server component. Fetches 50 most recently published items across all authors, joined with author profile (`display_name`) via `profiles!content_author_id_fkey`.

### Table columns
| Column | Content |
|---|---|
| Title | English title from `content_translations` (locale = 'en') + type badge |
| Author | Author `display_name` |
| Published | Published date |
| Featured | `FeatureButton` — green ✓ if featured, grey if not; toggles `is_featured` |
| Actions | `AdminUnpublishButton` — force-unpublishes |

### Server Actions (`lib/actions/admin.ts`)

**`toggleFeatured(contentId: string)`**
- Requires admin
- Flips `content.is_featured`
- `revalidatePath('/admin/content')`

**`adminUnpublishContent(contentId: string)`**
- Requires admin
- Sets `content.status = 'draft'`, `published_at = null`, `is_featured = false`
- No `author_id` filter
- `revalidatePath('/admin/content')`

### Client components
- **`FeatureButton`** (`components/admin/FeatureButton.tsx`) — `'use client'`, calls `toggleFeatured`, shows loading state, inline error
- **`AdminUnpublishButton`** (`components/admin/AdminUnpublishButton.tsx`) — `'use client'`, confirmation before firing, calls `adminUnpublishContent`, shows loading state, inline error

---

## Users Page — `app/[locale]/admin/users/page.tsx`

Server component. Fetches profiles and emails via two separate calls merged in memory:
1. `supabase.from('profiles').select(...)` (anon client, RLS-allowed for admin)
2. `supabase.auth.admin.listUsers({ page: 1, perPage: 50 })` via service role client — returns paginated `users[]` with `email`

Merge on `profile.id === user.id` to attach email to each profile row.

Ordered by `created_at DESC`, 50 per page.

### Table columns
| Column | Content |
|---|---|
| Name | `display_name` |
| Email | From `auth.admin.listUsers()` merge |
| Role | Current role badge |
| Joined | `created_at` date |
| Status | "Active" or "Suspended" (based on `suspended_at`) |
| Actions | `RoleSelect`, `SuspendButton`, `DeleteUserButton` |

### Server Actions (`lib/actions/admin.ts`)

**`setUserRole(userId: string, role: 'user' | 'author' | 'admin')`**
- Requires admin
- Updates `profiles.role`
- `revalidatePath('/admin/users')`

**`toggleSuspendUser(userId: string)`**
- Requires admin
- Flips `suspended_at` (null → `new Date().toISOString()`, set → null)
- `revalidatePath('/admin/users')`

**`deleteUser(userId: string)`**
- Requires admin
- Uses service role client: `supabase.auth.admin.deleteUser(userId)` — cascades to `profiles`
- `revalidatePath('/admin/users')` and `revalidatePath('/admin/content')`

### Client components
- **`RoleSelect`** (`components/admin/RoleSelect.tsx`) — `'use client'`, `<select>` for role, calls `setUserRole` on change, loading state
- **`SuspendButton`** (`components/admin/SuspendButton.tsx`) — `'use client'`, calls `toggleSuspendUser`, shows current state, inline error
- **`DeleteUserButton`** (`components/admin/DeleteUserButton.tsx`) — `'use client'`, confirmation dialog before firing `deleteUser`, inline error

---

## Error Handling

- All Server Actions call `requireAdmin()` — non-admins get a redirect, not an error
- `deleteUser` is irreversible — `DeleteUserButton` requires a confirmation dialog
- Chart components receive typed data props — empty data renders an empty state message instead of crashing
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
app/[locale]/admin/page.tsx
app/[locale]/admin/content/page.tsx
app/[locale]/admin/users/page.tsx
app/[locale]/suspended/page.tsx
lib/actions/admin.ts
supabase/migrations/YYYYMMDD_add_suspended_at.sql
```

### Modified files
```
app/[locale]/admin/layout.tsx     — replace with full sidebar shell
lib/require-user.ts               — add suspended_at check
lib/require-creator.ts            — add suspended_at check
lib/require-admin.ts              — add suspended_at check
package.json                      — add recharts
```

---

## Testing

### Unit tests
- `tests/unit/lib/actions/admin.test.ts` — each Server Action: mock Supabase, verify correct DB operations, verify `requireAdmin()` is enforced

### E2E tests
- `tests/e2e/admin.spec.ts` — unauthenticated redirects to login, non-admin redirects to `/`, admin smoke tests for all 4 pages (skipped without credentials, same pattern as `tests/e2e/translations.spec.ts`)
