# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full admin dashboard with dark sidebar, overview stats/charts, content management, and user management pages.

**Architecture:** All admin pages are server components under `app/[locale]/admin/`, guarded by `requireAdmin()` in the shared layout. Mutations go through Server Actions in `lib/actions/admin.ts`. Client components (`'use client'`) are thin wrappers around Server Actions showing loading state and inline errors, following the pattern established by `components/admin/TranslateButton.tsx`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase, Recharts (new dependency), Vitest, Playwright.

---

## File Map

### New files
```
supabase/migrations/20260322000001_add_suspended_at.sql
app/[locale]/suspended/page.tsx
lib/actions/admin.ts
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
tests/e2e/admin.spec.ts
```

### Modified files
```
lib/require-user.ts                        — add suspended_at check
lib/require-creator.ts                     — add suspended_at check
lib/require-admin.ts                       — add suspended_at check
app/[locale]/admin/layout.tsx              — replace with sidebar shell
tests/unit/lib/require-user.test.ts        — replace stub with real tests
package.json                               — add recharts
```

---

### Task 1: Database migration — add `profiles.suspended_at`

**Files:**
- Create: `supabase/migrations/20260322000001_add_suspended_at.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add suspended_at to profiles
-- NULL = active, non-null = suspended since that timestamp
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL DEFAULT NULL;
```

Save to `supabase/migrations/20260322000001_add_suspended_at.sql`.

- [ ] **Step 2: Apply the migration locally**

```bash
npx supabase db push
```

Expected: migration applied without error. If Supabase CLI is not linked, this step confirms the SQL syntax is valid.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260322000001_add_suspended_at.sql
git commit -m "feat: add profiles.suspended_at column for user suspension"
```

---

### Task 2: Suspended user guard + `/suspended` page

**Files:**
- Modify: `lib/require-user.ts`
- Modify: `lib/require-creator.ts`
- Modify: `lib/require-admin.ts`
- Create: `app/[locale]/suspended/page.tsx`
- Modify: `tests/unit/lib/require-user.test.ts`

- [ ] **Step 1: Write failing tests for suspended check in `requireUser`**

Replace the entire contents of `tests/unit/lib/require-user.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireUser } from '@/lib/require-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function makeSupabaseMock(opts: { userId?: string; suspendedAt?: string | null } = {}) {
  const singleFn = vi.fn().mockResolvedValue({
    data: opts.userId ? { suspended_at: opts.suspendedAt ?? null } : null,
  })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.userId ? { id: opts.userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleFn,
    }),
  }
}

describe('requireUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects to /auth/login when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as any)
    await requireUser()
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('redirects to /suspended when user has suspended_at set', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ userId: 'user-1', suspendedAt: '2026-01-01T00:00:00Z' }) as any,
    )
    await requireUser()
    expect(redirect).toHaveBeenCalledWith('/suspended')
  })

  it('returns { user } when authenticated and not suspended', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ userId: 'user-1', suspendedAt: null }) as any,
    )
    const result = await requireUser()
    expect((result.user as any).id).toBe('user-1')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run tests/unit/lib/require-user.test.ts
```

Expected: FAIL — `requireUser` doesn't query `profiles` yet.

- [ ] **Step 3: Update `lib/require-user.ts`**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call from any server component that requires authentication but no specific role.
 * Redirects to /auth/login if not authenticated, /suspended if account is suspended.
 * Returns { user } on success.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('suspended_at')
    .eq('id', user.id)
    .single()

  if (profile?.suspended_at) redirect('/suspended')

  return { user }
}
```

- [ ] **Step 4: Update `lib/require-creator.ts`** — add `suspended_at` to existing select, add redirect after role check

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export function isCreatorRole(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'author'
}

/**
 * Call from any server component that requires admin or author access.
 * Redirects to /auth/login if not authenticated, / if wrong role, /suspended if suspended.
 * Returns { user, profile } on success.
 */
export async function requireCreator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, display_name, slug, suspended_at')
    .eq('id', user.id)
    .single()

  if (!isCreatorRole(profile?.role)) redirect('/')
  if (profile?.suspended_at) redirect('/suspended')

  return { user, profile }
}
```

- [ ] **Step 5: Update `lib/require-admin.ts`** — add `suspended_at` to select, add redirect

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call from any server component or action that requires admin access.
 * Redirects to /auth/login if not authenticated, / if not admin, /suspended if suspended.
 * Returns { user } on success.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, suspended_at')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')
  if (profile?.suspended_at) redirect('/suspended')

  return { user }
}
```

- [ ] **Step 6: Create `app/[locale]/suspended/page.tsx`**

```typescript
export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-mono text-2xl uppercase tracking-wide">Account Suspended</h1>
        <p className="text-muted-foreground">
          Your account has been suspended. If you believe this is a mistake, please contact us.
        </p>
        <a href="mailto:hello@untold.ink" className="text-sm underline">
          hello@untold.ink
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run tests — expect all to pass**

```bash
npx vitest run tests/unit/lib/require-user.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 8: Run full test suite**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/require-user.ts lib/require-creator.ts lib/require-admin.ts \
  app/\[locale\]/suspended/page.tsx \
  tests/unit/lib/require-user.test.ts
git commit -m "feat: add suspended_at guard to require-* helpers and /suspended page"
```

---

### Task 3: Admin Server Actions

**Files:**
- Create: `lib/actions/admin.ts`
- Create: `tests/unit/lib/actions/admin.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/lib/actions/admin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-id' } }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import {
  toggleFeatured,
  adminUnpublishContent,
  setUserRole,
  toggleSuspendUser,
  deleteUser,
} from '@/lib/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { revalidatePath } from 'next/cache'

function makeDb(singleData: object | null = null) {
  const singleFn = vi.fn().mockResolvedValue({ data: singleData })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: singleFn,
  }
  chain.eq.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  const from = vi.fn().mockReturnValue(chain)
  return { from, chain }
}

describe('toggleFeatured', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flips is_featured from false to true', async () => {
    const { from, chain } = makeDb({ is_featured: false })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleFeatured('content-1')

    expect(chain.update).toHaveBeenCalledWith({ is_featured: true })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })

  it('flips is_featured from true to false', async () => {
    const { from, chain } = makeDb({ is_featured: true })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleFeatured('content-2')

    expect(chain.update).toHaveBeenCalledWith({ is_featured: false })
  })
})

describe('adminUnpublishContent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets status draft, clears published_at and is_featured', async () => {
    const { from, chain } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await adminUnpublishContent('content-3')

    expect(chain.update).toHaveBeenCalledWith({
      status: 'draft',
      published_at: null,
      is_featured: false,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })
})

describe('setUserRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates profile role', async () => {
    const { from, chain } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await setUserRole('user-1', 'author')

    expect(chain.update).toHaveBeenCalledWith({ role: 'author' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
  })
})

describe('toggleSuspendUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets suspended_at when user is active (suspended_at is null)', async () => {
    const { from, chain } = makeDb({ suspended_at: null })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleSuspendUser('user-2')

    const updateArg = vi.mocked(chain.update).mock.calls[0][0]
    expect(updateArg.suspended_at).not.toBeNull()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
  })

  it('clears suspended_at when user is already suspended', async () => {
    const { from, chain } = makeDb({ suspended_at: '2026-01-01T00:00:00Z' })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleSuspendUser('user-3')

    expect(chain.update).toHaveBeenCalledWith({ suspended_at: null })
  })
})

describe('deleteUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls auth.admin.deleteUser and revalidates both paths', async () => {
    const deleteUserFn = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: { admin: { deleteUser: deleteUserFn } },
    } as any)

    await deleteUser('user-4')

    expect(deleteUserFn).toHaveBeenCalledWith('user-4')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })

  it('throws when deleteUser returns an error', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: { message: 'User not found' } }),
        },
      },
    } as any)

    await expect(deleteUser('bad-id')).rejects.toThrow('User not found')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run tests/unit/lib/actions/admin.test.ts
```

Expected: FAIL — `@/lib/actions/admin` does not exist.

- [ ] **Step 3: Create `lib/actions/admin.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireAdmin } from '@/lib/require-admin'

export async function toggleFeatured(contentId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: item } = await (supabase as any)
    .from('content')
    .select('is_featured')
    .eq('id', contentId)
    .single()

  await (supabase as any)
    .from('content')
    .update({ is_featured: !item?.is_featured })
    .eq('id', contentId)

  revalidatePath('/admin/content')
}

export async function adminUnpublishContent(contentId: string) {
  await requireAdmin()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null, is_featured: false })
    .eq('id', contentId)

  revalidatePath('/admin/content')
}

export async function setUserRole(userId: string, role: 'user' | 'author' | 'admin') {
  await requireAdmin()
  const supabase = await createClient()

  await (supabase as any)
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  revalidatePath('/admin/users')
}

export async function toggleSuspendUser(userId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('suspended_at')
    .eq('id', userId)
    .single()

  await (supabase as any)
    .from('profiles')
    .update({
      suspended_at: profile?.suspended_at ? null : new Date().toISOString(),
    })
    .eq('id', userId)

  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  const supabase = createServiceRoleClient()

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  revalidatePath('/admin/content')
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npx vitest run tests/unit/lib/actions/admin.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/admin.ts tests/unit/lib/actions/admin.test.ts
git commit -m "feat: add admin Server Actions (feature, unpublish, role, suspend, delete)"
```

---

### Task 4: Admin layout + sidebar

**Files:**
- Modify: `app/[locale]/admin/layout.tsx`
- Create: `components/admin/AdminSidebar.tsx`

No unit tests needed — this is pure UI/layout with no logic.

- [ ] **Step 1: Create `components/admin/AdminSidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Globe, FileText, Users } from 'lucide-react'

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/translations', label: 'Translations', icon: Globe },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col bg-neutral-900 text-white">
      <div className="border-b border-neutral-800 px-6 py-5">
        <span className="font-mono text-sm uppercase tracking-widest">UNTOLD</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/admin'
              ? pathname === '/admin' || pathname.endsWith('/admin')
              : pathname.includes(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-neutral-800 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          ← Back to site
        </Link>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Replace `app/[locale]/admin/layout.tsx`**

```typescript
import { requireAdmin } from '@/lib/require-admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite to ensure nothing broke**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/admin/layout.tsx components/admin/AdminSidebar.tsx
git commit -m "feat: add admin sidebar and replace admin layout with full shell"
```

---

### Task 5: Recharts + Overview page

**Files:**
- Modify: `package.json` (add recharts)
- Create: `components/admin/ContentByTypeChart.tsx`
- Create: `components/admin/UsersByRoleChart.tsx`
- Create: `app/[locale]/admin/page.tsx`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

Expected: recharts added to `package.json` dependencies.

- [ ] **Step 2: Create `components/admin/ContentByTypeChart.tsx`**

```typescript
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Props {
  data: Array<{ type: string; count: number }>
}

const TYPE_COLORS: Record<string, string> = {
  article: '#b45309',
  video: '#0d9488',
  podcast: '#7c3aed',
  pill: '#be185d',
  course: '#1d4ed8',
}

export function ContentByTypeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No published content yet.</p>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="type" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.type}
              fill={TYPE_COLORS[entry.type] ?? '#888'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Create `components/admin/UsersByRoleChart.tsx`**

```typescript
'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Props {
  data: Array<{ role: string; count: number }>
}

const ROLE_COLORS: Record<string, string> = {
  user: '#94a3b8',
  author: '#b45309',
  admin: '#1d4ed8',
}

export function UsersByRoleChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="role"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
        >
          {data.map((entry) => (
            <Cell
              key={entry.role}
              fill={ROLE_COLORS[entry.role] ?? '#888'}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Create `app/[locale]/admin/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { ContentByTypeChart } from '@/components/admin/ContentByTypeChart'
import { UsersByRoleChart } from '@/components/admin/UsersByRoleChart'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Total published content + per-type breakdown
  const { data: publishedItems } = await (supabase as any)
    .from('content')
    .select('type')
    .eq('status', 'published')

  const typeMap: Record<string, number> = {}
  for (const item of publishedItems ?? []) {
    typeMap[item.type] = (typeMap[item.type] ?? 0) + 1
  }
  const contentByType = Object.entries(typeMap).map(([type, count]) => ({ type, count }))
  const publishedTotal = publishedItems?.length ?? 0

  // Users + per-role breakdown
  const { data: profiles } = await (supabase as any)
    .from('profiles')
    .select('role')

  const roleMap: Record<string, number> = {}
  for (const p of profiles ?? []) {
    roleMap[p.role] = (roleMap[p.role] ?? 0) + 1
  }
  const usersByRole = Object.entries(roleMap).map(([role, count]) => ({ role, count }))
  const usersTotal = profiles?.length ?? 0

  // Pending translations: published items missing at least one SUPPORTED_LOCALE translation
  const { data: itemsWithTranslations } = await (supabase as any)
    .from('content')
    .select('id, content_translations(locale)')
    .eq('status', 'published')

  let pendingCount = 0
  for (const item of itemsWithTranslations ?? []) {
    const existingLocales = new Set(
      (item.content_translations ?? []).map((t: any) => t.locale),
    )
    if (SUPPORTED_LOCALES.some((l) => !existingLocales.has(l))) {
      pendingCount++
    }
  }

  // Recent activity: last 10 published items
  const { data: recentItems } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      <h1 className="font-mono text-2xl uppercase tracking-wide">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Published Content</p>
          <p className="mt-1 text-3xl font-bold">{publishedTotal}</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="mt-1 text-3xl font-bold">{usersTotal}</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Pending Translations</p>
          <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Content by Type
          </h2>
          <ContentByTypeChart data={contentByType} />
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Users by Role
          </h2>
          <UsersByRoleChart data={usersByRole} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Activity
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Author</th>
              <th className="px-6 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {(recentItems ?? []).map((item: any) => {
              const enTitle = item.content_translations?.find(
                (t: any) => t.locale === 'en',
              )?.title
              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{enTitle ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.profiles?.display_name ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!recentItems || recentItems.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">No published content yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json \
  components/admin/ContentByTypeChart.tsx \
  components/admin/UsersByRoleChart.tsx \
  app/\[locale\]/admin/page.tsx
git commit -m "feat: add admin overview page with stats and recharts"
```

---

### Task 6: Content page + action buttons

**Files:**
- Create: `app/[locale]/admin/content/page.tsx`
- Create: `components/admin/FeatureButton.tsx`
- Create: `components/admin/AdminUnpublishButton.tsx`

Pattern: identical to `components/admin/TranslateButton.tsx` — `useTransition`, `router.refresh()` on success, inline error display.

- [ ] **Step 1: Create `components/admin/FeatureButton.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFeatured } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  contentId: string
  isFeatured: boolean
}

export function FeatureButton({ contentId, isFeatured }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await toggleFeatured(contentId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className={`h-6 px-2 text-sm ${
          isFeatured ? 'text-green-600' : 'text-muted-foreground'
        }`}
      >
        {isPending ? '…' : isFeatured ? '★' : '☆'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 2: Create `components/admin/AdminUnpublishButton.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminUnpublishContent } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  contentId: string
}

export function AdminUnpublishButton({ contentId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    if (!confirm('Unpublish this content? It will be moved back to draft.')) return
    setError(null)
    startTransition(async () => {
      try {
        await adminUnpublishContent(contentId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
      >
        {isPending ? '…' : 'Unpublish'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/admin/content/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { FeatureButton } from '@/components/admin/FeatureButton'
import { AdminUnpublishButton } from '@/components/admin/AdminUnpublishButton'

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: items } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      is_featured,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-2xl uppercase tracking-wide">Content</h1>
      <p className="text-sm text-muted-foreground">
        50 most recently published items across all authors.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Author</th>
              <th className="px-6 py-3">Published</th>
              <th className="px-6 py-3">Featured</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item: any) => {
              const enTitle = item.content_translations?.find(
                (t: any) => t.locale === 'en',
              )?.title
              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="max-w-xs truncate px-6 py-3 font-medium">
                    {enTitle ?? item.id}
                    {' '}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.profiles?.display_name ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <FeatureButton contentId={item.id} isFeatured={item.is_featured} />
                  </td>
                  <td className="px-6 py-3">
                    <AdminUnpublishButton contentId={item.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!items || items.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">No published content yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/admin/content/page.tsx \
  components/admin/FeatureButton.tsx \
  components/admin/AdminUnpublishButton.tsx
git commit -m "feat: add admin content page with feature and unpublish actions"
```

---

### Task 7: Users page + action buttons

**Files:**
- Create: `app/[locale]/admin/users/page.tsx`
- Create: `components/admin/RoleSelect.tsx`
- Create: `components/admin/SuspendButton.tsx`
- Create: `components/admin/DeleteUserButton.tsx`

- [ ] **Step 1: Create `components/admin/RoleSelect.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserRole } from '@/lib/actions/admin'

interface Props {
  userId: string
  currentRole: string
}

export function RoleSelect({ userId, currentRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as 'user' | 'author' | 'admin'
    setError(null)
    startTransition(async () => {
      try {
        await setUserRole(userId, role)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={isPending}
        className="rounded border bg-background px-2 py-1 text-xs"
      >
        <option value="user">user</option>
        <option value="author">author</option>
        <option value="admin">admin</option>
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 2: Create `components/admin/SuspendButton.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleSuspendUser } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  isSuspended: boolean
}

export function SuspendButton({ userId, isSuspended }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await toggleSuspendUser(userId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className={`h-6 px-2 text-xs ${
          isSuspended ? 'text-green-600' : 'text-yellow-600'
        }`}
      >
        {isPending ? '…' : isSuspended ? 'Unsuspend' : 'Suspend'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 3: Create `components/admin/DeleteUserButton.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteUser } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  displayName: string | null
}

export function DeleteUserButton({ userId, displayName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    const name = displayName ?? 'this user'
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteUser(userId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
      >
        {isPending ? '…' : 'Delete'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
```

- [ ] **Step 4: Create `app/[locale]/admin/users/page.tsx`**

Note: `auth.admin.listUsers()` returns `{ data: { users: User[] }, error }`. The `users` array has `id` and `email` fields.

```typescript
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { RoleSelect } from '@/components/admin/RoleSelect'
import { SuspendButton } from '@/components/admin/SuspendButton'
import { DeleteUserButton } from '@/components/admin/DeleteUserButton'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const serviceClient = createServiceRoleClient()

  const [profilesResult, usersResult] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('id, display_name, role, created_at, suspended_at')
      .order('created_at', { ascending: false })
      .limit(50),
    serviceClient.auth.admin.listUsers({ page: 1, perPage: 50 }),
  ])

  const profiles: any[] = profilesResult.data ?? []
  const authUsers: any[] = usersResult.data?.users ?? []
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email as string]))

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-2xl uppercase tracking-wide">Users</h1>
      <p className="text-sm text-muted-foreground">50 most recently joined users.</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Joined</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{profile.display_name ?? '—'}</td>
                <td className="px-6 py-3 text-muted-foreground">
                  {emailMap.get(profile.id) ?? '—'}
                </td>
                <td className="px-6 py-3">
                  <RoleSelect userId={profile.id} currentRole={profile.role} />
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  {profile.suspended_at ? (
                    <span className="text-xs font-medium text-red-600">Suspended</span>
                  ) : (
                    <span className="text-xs font-medium text-green-600">Active</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <SuspendButton
                      userId={profile.id}
                      isSuspended={!!profile.suspended_at}
                    />
                    <DeleteUserButton
                      userId={profile.id}
                      displayName={profile.display_name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profiles.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No users yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/admin/users/page.tsx \
  components/admin/RoleSelect.tsx \
  components/admin/SuspendButton.tsx \
  components/admin/DeleteUserButton.tsx
git commit -m "feat: add admin users page with role, suspend, and delete actions"
```

---

### Task 8: E2E tests

**Files:**
- Create: `tests/e2e/admin.spec.ts`

- [ ] **Step 1: Create `tests/e2e/admin.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin — unauthenticated guard', () => {
  test('redirects /admin to login when not authenticated', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Admin — non-admin guard', () => {
  /**
   * Requires E2E_NON_ADMIN_EMAIL and E2E_NON_ADMIN_PASSWORD env vars.
   * Skipped when those credentials are absent.
   */
  test('redirects /admin to / when logged in as non-admin', async ({ page }) => {
    const nonAdminEmail = process.env.E2E_NON_ADMIN_EMAIL
    const nonAdminPassword = process.env.E2E_NON_ADMIN_PASSWORD
    test.skip(!nonAdminEmail || !nonAdminPassword, 'E2E_NON_ADMIN_EMAIL / E2E_NON_ADMIN_PASSWORD not set')

    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill(nonAdminEmail!)
    await page.getByLabel(/password/i).fill(nonAdminPassword!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard|\//)

    await page.goto('/admin')
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/)
  })
})

test.describe('Admin — smoke tests', () => {
  /**
   * Requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD env vars.
   */
  test.skip(
    'all four admin pages render without 500 when logged in as admin',
    async ({ page }) => {
      const adminEmail = process.env.E2E_ADMIN_EMAIL
      const adminPassword = process.env.E2E_ADMIN_PASSWORD
      test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set')

      await page.goto('/auth/login')
      await page.getByLabel(/email/i).fill(adminEmail!)
      await page.getByLabel(/password/i).fill(adminPassword!)
      await page.getByRole('button', { name: /log in/i }).click()
      await page.waitForURL((url) => !url.toString().includes('auth/login'))

      for (const path of [
        '/admin',
        '/admin/translations',
        '/admin/content',
        '/admin/users',
      ]) {
        const response = await page.goto(path)
        expect(response?.status()).not.toBe(500)
        await expect(page).not.toHaveURL(/error/)
      }
    },
  )
})
```

- [ ] **Step 2: Verify TypeScript compiles without errors in E2E file**

```bash
npx tsc --noEmit 2>&1 | grep "admin.spec" || echo "No TS errors in admin.spec.ts"
```

Expected: `No TS errors in admin.spec.ts`

- [ ] **Step 3: Run full unit test suite one final time**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/admin.spec.ts
git commit -m "test: add E2E tests for admin dashboard pages"
```
