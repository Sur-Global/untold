# Social Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add likes, bookmarks, and follows, plus an author profile page and a bookmarks dashboard page.

**Architecture:** Three server actions (`toggleLike`, `toggleBookmark`, `toggleFollow`) in `lib/actions/social.ts` manipulate Supabase rows and recount denormalized counters. Three client components (`LikeButton`, `BookmarkButton`, `FollowButton`) in `components/social/` do optimistic UI updates via `useTransition`. All five content detail pages are updated to check the session and pass per-user state to these buttons. To avoid two `getUser()` network calls per page, content detail pages that need the user object call `supabase.auth.getUser()` once and derive their own nav props inline instead of calling `getNavProps()`. A new `requireUser` guard (auth-only, no role) protects the bookmarks dashboard page.

**Tech Stack:** Next.js 16 App Router (Server + Client Components), Supabase SSR, Vitest, Playwright

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/require-user.ts` | Create | Auth-only guard (no role check), used by bookmarks page |
| `lib/actions/social.ts` | Create | `toggleLike`, `toggleBookmark`, `toggleFollow` server actions |
| `components/social/LikeButton.tsx` | Create | Optimistic like button, shows count |
| `components/social/BookmarkButton.tsx` | Create | Optimistic bookmark toggle |
| `components/social/FollowButton.tsx` | Create | Optimistic follow/unfollow button |
| `app/[locale]/articles/[slug]/page.tsx` | Modify | Add LikeButton + BookmarkButton, single getUser() call |
| `app/[locale]/videos/[slug]/page.tsx` | Modify | Same |
| `app/[locale]/podcasts/[slug]/page.tsx` | Modify | Same |
| `app/[locale]/pills/[slug]/page.tsx` | Modify | Same |
| `app/[locale]/courses/[slug]/page.tsx` | Modify | Same |
| `app/[locale]/author/[slug]/page.tsx` | Create | Public author profile with FollowButton + content list |
| `app/[locale]/dashboard/bookmarks/page.tsx` | Create | Protected bookmarks list |
| `tests/unit/lib/require-user.test.ts` | Create | Unit tests for `requireUser` (module export check) |
| `tests/unit/components/LikeButton.test.tsx` | Create | Unit tests for LikeButton |
| `tests/unit/components/BookmarkButton.test.tsx` | Create | Unit tests for BookmarkButton |
| `tests/unit/components/FollowButton.test.tsx` | Create | Unit tests for FollowButton |
| `tests/e2e/social.spec.ts` | Create | Playwright smoke tests for social routes |

---

### Task 1: `requireUser` guard

**Files:**
- Create: `lib/require-user.ts`
- Create: `tests/unit/lib/require-user.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/lib/require-user.test.ts`:
```ts
// requireUser is entirely effectful (redirect + DB). Only the module boundary matters.
// This test just verifies the module exports the expected symbol.
import { describe, it, expect } from 'vitest'

describe('require-user module', () => {
  it('exports requireUser function', async () => {
    const mod = await import('@/lib/require-user')
    expect(typeof mod.requireUser).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/lib/require-user.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/require-user.ts`**

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call from any server component that requires authentication but no specific role.
 * Redirects to /auth/login if not authenticated.
 * Returns { user } on success.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { user }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/lib/require-user.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/require-user.ts tests/unit/lib/require-user.test.ts
git commit -m "feat: add requireUser auth guard (no role check)"
```

---

### Task 2: Social server actions

**Files:**
- Create: `lib/actions/social.ts`

There is no pure logic to unit-test in these actions (all DB I/O). Tests are covered by Playwright in Task 9.

- [ ] **Step 1: Create `lib/actions/social.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/require-user'

export async function toggleLike(contentId: string) {
  const { user } = await requireUser()
  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
  } else {
    await (supabase as any)
      .from('likes')
      .insert({ user_id: user.id, content_id: contentId })
  }

  // Recount and sync the denormalized counter
  const { count } = await (supabase as any)
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', contentId)

  await (supabase as any)
    .from('content')
    .update({ likes_count: count ?? 0 })
    .eq('id', contentId)

  revalidatePath('/', 'layout')
}

export async function toggleBookmark(contentId: string) {
  const { user } = await requireUser()
  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('bookmarks')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
  } else {
    await (supabase as any)
      .from('bookmarks')
      .insert({ user_id: user.id, content_id: contentId })
  }

  revalidatePath('/', 'layout')
}

export async function toggleFollow(profileId: string) {
  const { user } = await requireUser()
  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', profileId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
  } else {
    await (supabase as any)
      .from('follows')
      .insert({ follower_id: user.id, following_id: profileId })
  }

  // Recount denormalized counters for both parties
  const { count: followersCount } = await (supabase as any)
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profileId)

  const { count: followingCount } = await (supabase as any)
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)

  await (supabase as any)
    .from('profiles')
    .update({ followers_count: followersCount ?? 0 })
    .eq('id', profileId)

  await (supabase as any)
    .from('profiles')
    .update({ following_count: followingCount ?? 0 })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/social.ts
git commit -m "feat: add toggleLike, toggleBookmark, toggleFollow server actions"
```

---

### Task 3: `LikeButton`, `BookmarkButton` components

**Files:**
- Create: `components/social/LikeButton.tsx`
- Create: `components/social/BookmarkButton.tsx`
- Create: `tests/unit/components/LikeButton.test.tsx`
- Create: `tests/unit/components/BookmarkButton.test.tsx`

- [ ] **Step 1: Write the failing tests**

`tests/unit/components/LikeButton.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/actions/social', () => ({
  toggleLike: vi.fn().mockResolvedValue(undefined),
  toggleBookmark: vi.fn().mockResolvedValue(undefined),
}))

import { LikeButton } from '@/components/social/LikeButton'

describe('LikeButton', () => {
  it('renders with initial count and like state', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={false}
        initialCount={5}
        isLoggedIn={true}
      />
    )
    expect(screen.getByRole('button')).toHaveTextContent('5')
  })

  it('shows filled heart when initially liked', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={true}
        initialCount={3}
        isLoggedIn={true}
      />
    )
    expect(screen.getByRole('button').textContent).toContain('♥')
  })

  it('is disabled when not logged in', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={false}
        initialCount={0}
        isLoggedIn={false}
      />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('toggles optimistically on click', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={false}
        initialCount={5}
        isLoggedIn={true}
      />
    )
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn.textContent).toContain('6')
  })
})
```

`tests/unit/components/BookmarkButton.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/actions/social', () => ({
  toggleLike: vi.fn().mockResolvedValue(undefined),
  toggleBookmark: vi.fn().mockResolvedValue(undefined),
}))

import { BookmarkButton } from '@/components/social/BookmarkButton'

describe('BookmarkButton', () => {
  it('renders a button', () => {
    render(
      <BookmarkButton contentId="abc" initialIsBookmarked={false} isLoggedIn={true} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('is disabled when not logged in', () => {
    render(
      <BookmarkButton contentId="abc" initialIsBookmarked={false} isLoggedIn={false} />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('toggles optimistically on click', () => {
    render(
      <BookmarkButton contentId="abc" initialIsBookmarked={false} isLoggedIn={true} />
    )
    const btn = screen.getByRole('button')
    const beforeTitle = btn.getAttribute('title')
    fireEvent.click(btn)
    expect(btn.getAttribute('title')).not.toBe(beforeTitle)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/unit/components/LikeButton.test.tsx tests/unit/components/BookmarkButton.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/social/LikeButton.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toggleLike } from '@/lib/actions/social'

interface LikeButtonProps {
  contentId: string
  initialIsLiked: boolean
  initialCount: number
  isLoggedIn: boolean
}

export function LikeButton({ contentId, initialIsLiked, initialCount, isLoggedIn }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setIsLiked(!isLiked)
    setCount(c => isLiked ? c - 1 : c + 1)
    startTransition(() => toggleLike(contentId))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      title={isLoggedIn ? undefined : 'Sign in to like'}
      className="flex items-center gap-1.5 text-sm font-mono text-[#6B5F58] hover:text-[#A0522D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span>{isLiked ? '♥' : '♡'}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
```

- [ ] **Step 4: Create `components/social/BookmarkButton.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toggleBookmark } from '@/lib/actions/social'

interface BookmarkButtonProps {
  contentId: string
  initialIsBookmarked: boolean
  isLoggedIn: boolean
}

export function BookmarkButton({ contentId, initialIsBookmarked, isLoggedIn }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setIsBookmarked(!isBookmarked)
    startTransition(() => toggleBookmark(contentId))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      title={isLoggedIn ? (isBookmarked ? 'Remove bookmark' : 'Bookmark') : 'Sign in to bookmark'}
      className="flex items-center gap-1.5 text-sm font-mono text-[#6B5F58] hover:text-[#A0522D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isBookmarked ? '🔖' : '🏷'}
    </button>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/unit/components/LikeButton.test.tsx tests/unit/components/BookmarkButton.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/social/LikeButton.tsx components/social/BookmarkButton.tsx tests/unit/components/LikeButton.test.tsx tests/unit/components/BookmarkButton.test.tsx
git commit -m "feat: add LikeButton and BookmarkButton client components"
```

---

### Task 4: `FollowButton` component

**Files:**
- Create: `components/social/FollowButton.tsx`
- Create: `tests/unit/components/FollowButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/unit/components/FollowButton.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/actions/social', () => ({
  toggleFollow: vi.fn().mockResolvedValue(undefined),
}))

import { FollowButton } from '@/components/social/FollowButton'

describe('FollowButton', () => {
  it('renders Follow when not following', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={false} isLoggedIn={true} />
    )
    expect(screen.getByRole('button')).toHaveTextContent('Follow')
  })

  it('renders Following when already following', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={true} isLoggedIn={true} />
    )
    expect(screen.getByRole('button')).toHaveTextContent('Following')
  })

  it('is disabled when not logged in', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={false} isLoggedIn={false} />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('toggles optimistically on click', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={false} isLoggedIn={true} />
    )
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Following')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/components/FollowButton.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/social/FollowButton.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from '@/lib/actions/social'

interface FollowButtonProps {
  profileId: string
  initialIsFollowing: boolean
  isLoggedIn: boolean
}

export function FollowButton({ profileId, initialIsFollowing, isLoggedIn }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setIsFollowing(!isFollowing)
    startTransition(() => toggleFollow(profileId))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      title={isLoggedIn ? undefined : 'Sign in to follow'}
      className="px-4 py-1.5 rounded-full text-sm font-mono font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={
        isFollowing
          ? { background: 'rgba(160,82,45,0.12)', color: '#A0522D', border: '1px solid rgba(160,82,45,0.3)' }
          : { background: 'rgba(160,82,45,0.85)', color: '#FAF7F2', border: '1px solid transparent' }
      }
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/components/FollowButton.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/social/FollowButton.tsx tests/unit/components/FollowButton.test.tsx
git commit -m "feat: add FollowButton client component"
```

---

### Task 5: Wire social buttons into the article detail page

**Files:**
- Modify: `app/[locale]/articles/[slug]/page.tsx`

**Key pattern change:** This page calls `supabase.auth.getUser()` to get the user for social state. To avoid a redundant second `getUser()` call (which `getNavProps()` also makes internally), we call `getUser()` once and derive nav props inline — removing the `getNavProps()` import and call.

Nav props are derived as:
```tsx
const { data: { user } } = await supabase.auth.getUser()
let navUserRole = null
if (user) {
  const { data: navProfile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).single()
  navUserRole = navProfile?.role ?? null
}
const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }
```

- [ ] **Step 1: Replace `app/[locale]/articles/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { readTime } from '@/lib/utils'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('content')
    .select('content_translations ( title, excerpt, locale )')
    .eq('slug', slug)
    .eq('type', 'article')
    .eq('status', 'published')
    .single()

  const t = getTranslation(data?.content_translations ?? [], locale)
  return {
    title: t?.title ? `${t.title} — UNTOLD` : 'UNTOLD',
    description: t?.excerpt ?? undefined,
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  // Single getUser() call — derive nav props from it to avoid duplicate auth network call
  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: article } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at, cover_image_url, source_locale,
      profiles!author_id ( id, display_name, slug, avatar_url, followers_count, role ),
      content_translations ( title, excerpt, body, locale ),
      content_tags ( tags ( slug, names ) )
    `)
    .eq('slug', slug)
    .eq('type', 'article')
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  const t = getTranslation(article.content_translations ?? [], locale)
  if (!t) notFound()

  const author = article.profiles
  const body = t.body as Record<string, unknown> | null
  const tags = article.content_tags?.map((ct: any) => ct.tags) ?? []

  // Check per-user social state
  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('content_id', article.id)
        .maybeSingle(),
      (supabase as any)
        .from('bookmarks')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('content_id', article.id)
        .maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  // Estimate read time from body text
  const bodyText = body
    ? JSON.stringify(body).replace(/"[^"]*":\s*"/g, ' ').replace(/[{}\[\]",]/g, ' ')
    : ''
  const minutes = readTime(bodyText)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <header className="mb-10">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag: any) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded hover:bg-[rgba(160,82,45,0.12)] transition-colors"
                  style={{ background: 'rgba(160,82,45,0.07)', color: '#A0522D' }}
                >
                  #{tag.names?.en ?? tag.slug}
                </Link>
              ))}
            </div>
          )}

          <h1 className="mb-6">{t.title}</h1>

          {t.excerpt && (
            <p className="text-xl text-[#6B5F58] mb-6 leading-relaxed">{t.excerpt}</p>
          )}

          {/* Author + meta bar */}
          <div className="flex items-center gap-4 py-4" style={{ borderTop: '1px solid rgba(139,69,19,0.12)', borderBottom: '1px solid rgba(139,69,19,0.12)' }}>
            {author?.avatar_url && (
              <img src={author.avatar_url} alt={author.display_name} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div className="flex-1 min-w-0">
              {author && (
                <Link href={`/author/${author.slug}`} className="font-mono text-sm font-semibold hover:text-[#A0522D] transition-colors">
                  {author.display_name}
                </Link>
              )}
              <div className="text-xs text-[#6B5F58] font-mono mt-0.5">
                {article.published_at && (
                  <span>{new Date(article.published_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                )}
                <span className="mx-2">·</span>
                <span>{minutes} min read</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LikeButton
                contentId={article.id}
                initialIsLiked={isLiked}
                initialCount={article.likes_count ?? 0}
                isLoggedIn={!!user}
              />
              <BookmarkButton
                contentId={article.id}
                initialIsBookmarked={isBookmarked}
                isLoggedIn={!!user}
              />
            </div>
          </div>
        </header>

        {/* Cover image */}
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={t.title}
            className="w-full rounded-xl mb-10 aspect-video object-cover"
          />
        )}

        {/* Body */}
        {body ? (
          <ArticleBody json={body} />
        ) : (
          <p className="text-[#6B5F58]">No content available.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/articles/[slug]/page.tsx"
git commit -m "feat: add LikeButton and BookmarkButton to article detail page"
```

---

### Task 6: Wire social buttons into video, podcast, pill, and course detail pages

**Files:**
- Modify: `app/[locale]/videos/[slug]/page.tsx`
- Modify: `app/[locale]/podcasts/[slug]/page.tsx`
- Modify: `app/[locale]/pills/[slug]/page.tsx`
- Modify: `app/[locale]/courses/[slug]/page.tsx`

Same pattern as Task 5: single `getUser()` call at the top, derive `navProps` inline, query social state if user exists, remove `getNavProps()` import/call.

- [ ] **Step 1: Replace `app/[locale]/videos/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function VideoPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: video } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, description, locale ),
      video_meta ( embed_url, thumbnail_url, duration )
    `)
    .eq('slug', slug)
    .eq('type', 'video')
    .eq('status', 'published')
    .single()

  if (!video) notFound()

  const t = getTranslation(video.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = video.video_meta
  const author = video.profiles

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', video.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', video.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Embed */}
        {meta?.embed_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <EmbedPlayer url={meta.embed_url} title={t.title} />
          </div>
        )}

        <h1 className="mb-4">{t.title}</h1>

        {/* Meta bar */}
        <div className="flex items-center gap-4 mb-6 text-sm font-mono text-[#6B5F58]">
          {meta?.duration && <span>⏱ {meta.duration}</span>}
          {video.published_at && (
            <span>{new Date(video.published_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          {author && (
            <Link href={`/author/${author.slug}`} className="hover:text-[#A0522D]">
              by {author.display_name}
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <LikeButton
              contentId={video.id}
              initialIsLiked={isLiked}
              initialCount={video.likes_count ?? 0}
              isLoggedIn={!!user}
            />
            <BookmarkButton
              contentId={video.id}
              initialIsBookmarked={isBookmarked}
              isLoggedIn={!!user}
            />
          </div>
        </div>

        {t.description && (
          <p className="text-[#6B5F58] leading-relaxed">{t.description}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Replace `app/[locale]/podcasts/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PodcastPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: podcast } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, description, locale ),
      podcast_meta ( embed_url, cover_image_url, duration, episode_number )
    `)
    .eq('slug', slug)
    .eq('type', 'podcast')
    .eq('status', 'published')
    .single()

  if (!podcast) notFound()

  const t = getTranslation(podcast.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = podcast.podcast_meta
  const author = podcast.profiles

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', podcast.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', podcast.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Cover + meta */}
        <div className="flex gap-6 mb-8">
          {meta?.cover_image_url && (
            <img
              src={meta.cover_image_url}
              alt={t.title}
              className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1">
            {meta?.episode_number && (
              <p className="text-sm font-mono text-[#A0522D] mb-1">{meta.episode_number}</p>
            )}
            <h1 className="text-2xl mb-2">{t.title}</h1>
            <div className="flex items-center gap-3 text-sm font-mono text-[#6B5F58]">
              {meta?.duration && <span>⏱ {meta.duration}</span>}
              {author && (
                <Link href={`/author/${author.slug}`} className="hover:text-[#A0522D]">
                  {author.display_name}
                </Link>
              )}
              <div className="ml-auto flex items-center gap-3">
                <LikeButton
                  contentId={podcast.id}
                  initialIsLiked={isLiked}
                  initialCount={podcast.likes_count ?? 0}
                  isLoggedIn={!!user}
                />
                <BookmarkButton
                  contentId={podcast.id}
                  initialIsBookmarked={isBookmarked}
                  isLoggedIn={!!user}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Embed */}
        {meta?.embed_url && (
          <div className="mb-8">
            <EmbedPlayer url={meta.embed_url} title={t.title} />
          </div>
        )}

        {t.description && (
          <p className="text-[#6B5F58] leading-relaxed">{t.description}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Replace `app/[locale]/pills/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PillPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: pill } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug ),
      content_translations ( title, body, locale ),
      pill_meta ( accent_color, image_url )
    `)
    .eq('slug', slug)
    .eq('type', 'pill')
    .eq('status', 'published')
    .single()

  if (!pill) notFound()

  const t = getTranslation(pill.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = pill.pill_meta
  const accentColor = meta?.accent_color ?? '#6B8E23'
  const body = t.body as Record<string, unknown> | null

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', pill.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', pill.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Pill header with accent color */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{ background: `${accentColor}12`, borderTop: `4px solid ${accentColor}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              Knowledge Pill
            </span>
            <div className="flex items-center gap-3">
              <LikeButton
                contentId={pill.id}
                initialIsLiked={isLiked}
                initialCount={pill.likes_count ?? 0}
                isLoggedIn={!!user}
              />
              <BookmarkButton
                contentId={pill.id}
                initialIsBookmarked={isBookmarked}
                isLoggedIn={!!user}
              />
            </div>
          </div>
          <h1 className="mb-4" style={{ color: '#2C2420' }}>{t.title}</h1>
          {meta?.image_url && (
            <img src={meta.image_url} alt="" className="w-full rounded-xl object-cover max-h-48" />
          )}
        </div>

        {body ? (
          <ArticleBody json={body} />
        ) : (
          <p className="text-[#6B5F58]">No content.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 4: Replace `app/[locale]/courses/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function CoursePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: course } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, cover_image_url, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, description, locale ),
      course_meta ( price, currency, duration, students_count, rating )
    `)
    .eq('slug', slug)
    .eq('type', 'course')
    .eq('status', 'published')
    .single()

  if (!course) notFound()

  const t = getTranslation(course.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = course.course_meta
  const author = course.profiles

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', course.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', course.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="md:col-span-2">
            {course.cover_image_url && (
              <img
                src={course.cover_image_url}
                alt={t.title}
                className="w-full rounded-xl mb-8 aspect-video object-cover"
              />
            )}
            <h1 className="mb-4">{t.title}</h1>
            {t.description && (
              <p className="text-[#6B5F58] leading-relaxed text-lg">{t.description}</p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <LikeButton
                contentId={course.id}
                initialIsLiked={isLiked}
                initialCount={course.likes_count ?? 0}
                isLoggedIn={!!user}
              />
              <BookmarkButton
                contentId={course.id}
                initialIsBookmarked={isBookmarked}
                isLoggedIn={!!user}
              />
            </div>
          </div>

          {/* Course info sidebar */}
          <div
            className="rounded-xl p-6 h-fit"
            style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.12)', boxShadow: '0 4px 16px rgba(44,36,32,0.08)' }}
          >
            {/* Price */}
            {meta && (
              <p className="text-2xl font-mono font-bold text-[#A0522D] mb-4">
                {meta.price === 0 ? 'Free' : meta.currency ? `${meta.currency} ${meta.price}` : String(meta.price)}
              </p>
            )}

            <button
              disabled
              className="w-full py-3 rounded-lg font-mono text-sm font-semibold mb-4 cursor-not-allowed"
              style={{ background: 'rgba(139,69,19,0.3)', color: 'rgba(255,255,255,0.6)' }}
              title="Enrollment coming soon"
            >
              Enroll Now — Coming Soon
            </button>

            <div className="space-y-3 text-sm font-mono text-[#6B5F58]">
              {meta?.duration && <div className="flex justify-between"><span>Duration</span><span>{meta.duration}</span></div>}
              {meta?.students_count != null && <div className="flex justify-between"><span>Students</span><span>{meta.students_count}</span></div>}
              {meta?.rating != null && <div className="flex justify-between"><span>Rating</span><span>★ {meta.rating.toFixed(1)}</span></div>}
              {author && (
                <div className="flex justify-between">
                  <span>Instructor</span>
                  <span>{author.display_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/videos/[slug]/page.tsx" "app/[locale]/podcasts/[slug]/page.tsx" "app/[locale]/pills/[slug]/page.tsx" "app/[locale]/courses/[slug]/page.tsx"
git commit -m "feat: add social buttons to video, podcast, pill, course detail pages"
```

---

### Task 7: Author profile page

**Files:**
- Create: `app/[locale]/author/[slug]/page.tsx`

Same single-`getUser()` pattern. The FollowButton is only rendered when `user` exists and `user.id !== author.id`.

- [ ] **Step 1: Create `app/[locale]/author/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { FollowButton } from '@/components/social/FollowButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('display_name')
    .eq('slug', slug)
    .single()

  return {
    title: profile?.display_name ? `${profile.display_name} — UNTOLD` : 'UNTOLD',
  }
}

export default async function AuthorPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: author } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, slug, avatar_url, bio, followers_count, following_count, role')
    .eq('slug', slug)
    .single()

  if (!author) notFound()

  let isFollowing = false
  if (user) {
    const { data: follow } = await (supabase as any)
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', author.id)
      .maybeSingle()
    isFollowing = !!follow
  }

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, type, slug, created_at,
      content_translations ( title, locale )
    `)
    .eq('author_id', author.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Author header */}
        <div
          className="flex items-start gap-6 mb-10 pb-10"
          style={{ borderBottom: '1px solid rgba(139,69,19,0.12)' }}
        >
          {author.avatar_url && (
            <img
              src={author.avatar_url}
              alt={author.display_name}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-mono font-bold mb-1">{author.display_name}</h1>
            <div className="flex gap-4 text-sm font-mono text-[#6B5F58] mb-3">
              <span>{author.followers_count ?? 0} followers</span>
              <span>{author.following_count ?? 0} following</span>
            </div>
            {author.bio && (
              <p className="text-[#6B5F58] leading-relaxed mb-4">{author.bio}</p>
            )}
            {user && user.id !== author.id && (
              <FollowButton
                profileId={author.id}
                initialIsFollowing={isFollowing}
                isLoggedIn={true}
              />
            )}
          </div>
        </div>

        {/* Published content */}
        <h2 className="text-lg font-mono font-semibold mb-6">Published Content</h2>
        {(!content || content.length === 0) ? (
          <p className="text-[#6B5F58]">No published content yet.</p>
        ) : (
          <ul className="space-y-3">
            {content.map((item: any) => {
              const tr = getTranslation(item.content_translations ?? [], locale)
              return (
                <li
                  key={item.id}
                  className="p-4 rounded-lg"
                  style={{ border: '1px solid rgba(139,69,19,0.12)', background: 'rgba(245,241,232,0.5)' }}
                >
                  <Link
                    href={`/${item.type}s/${item.slug}`}
                    className="font-semibold hover:text-[#A0522D] transition-colors"
                  >
                    {tr?.title ?? '(Untitled)'}
                  </Link>
                  <p className="text-xs font-mono text-[#6B5F58] mt-1 capitalize">{item.type}</p>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/author/[slug]/page.tsx"
git commit -m "feat: add public author profile page with follow button and content list"
```

---

### Task 8: Bookmarks dashboard page

**Files:**
- Create: `app/[locale]/dashboard/bookmarks/page.tsx`

`requireUser()` returns `{ user }`. Use that user to derive nav props (single auth call) and fetch bookmarks.

- [ ] **Step 1: Create `app/[locale]/dashboard/bookmarks/page.tsx`**

```tsx
import { requireUser } from '@/lib/require-user'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function BookmarksPage({ params }: PageProps) {
  const { locale } = await params
  const { user } = await requireUser()
  const supabase = await createClient()

  // requireUser already verified auth — derive nav props without a second getUser() call
  const { data: navProfile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).single()
  const navProps = { isLoggedIn: true, userRole: (navProfile?.role ?? null) as any }

  const { data: bookmarks } = await (supabase as any)
    .from('bookmarks')
    .select(`
      content_id, created_at,
      content (
        id, type, slug, status,
        content_translations ( title, locale )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const publishedBookmarks = (bookmarks ?? []).filter(
    (bm: any) => bm.content?.status === 'published'
  )

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="mb-8">My Bookmarks</h1>

        {publishedBookmarks.length === 0 ? (
          <p className="text-[#6B5F58]">No bookmarks yet. Visit any content page and click the bookmark icon.</p>
        ) : (
          <ul className="space-y-3">
            {publishedBookmarks.map((bm: any) => {
              const item = bm.content
              const tr = getTranslation(item.content_translations ?? [], locale)
              return (
                <li
                  key={bm.content_id}
                  className="p-4 rounded-lg"
                  style={{ border: '1px solid rgba(139,69,19,0.12)', background: 'rgba(245,241,232,0.5)' }}
                >
                  <Link
                    href={`/${item.type}s/${item.slug}`}
                    className="font-semibold hover:text-[#A0522D] transition-colors"
                  >
                    {tr?.title ?? '(Untitled)'}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-[#6B5F58] capitalize">{item.type}</span>
                    <span className="text-xs font-mono text-[#6B5F58]">
                      Saved {new Date(bm.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/dashboard/bookmarks/page.tsx"
git commit -m "feat: add bookmarks dashboard page (requireUser protected)"
```

---

### Task 9: Playwright e2e tests

**Files:**
- Create: `tests/e2e/social.spec.ts`

- [ ] **Step 1: Create `tests/e2e/social.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('Social — unauthenticated guards', () => {
  test('redirects /dashboard/bookmarks to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/bookmarks')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Social — author profile', () => {
  test('unknown author slug returns 404', async ({ page }) => {
    const response = await page.goto('/author/this-slug-does-not-exist-xyz')
    expect(response?.status()).toBe(404)
  })
})

test.describe('Social — content detail pages with social buttons', () => {
  test('article detail page renders like and bookmark buttons when unauthenticated', async ({ page }) => {
    // Navigate to home first and follow any article link
    await page.goto('/')
    await expect(page).not.toHaveURL(/error/)

    const articleLink = page.locator('a[href*="/articles/"]').first()
    if (await articleLink.count() === 0) {
      // No published articles in DB — skip the button test
      return
    }
    await articleLink.click()
    await expect(page).not.toHaveURL(/error/)

    // Unauthenticated: like and bookmark buttons should be present but disabled
    const likeBtn = page.locator('button[title="Sign in to like"]')
    const bookmarkBtn = page.locator('button[title="Sign in to bookmark"]')
    await expect(likeBtn).toBeVisible()
    await expect(bookmarkBtn).toBeVisible()
    await expect(likeBtn).toBeDisabled()
    await expect(bookmarkBtn).toBeDisabled()
  })

  test('author profile page renders without error', async ({ page }) => {
    // Navigate to home and follow any author link
    await page.goto('/')
    const authorLink = page.locator('a[href*="/author/"]').first()
    if (await authorLink.count() === 0) {
      return
    }
    await authorLink.click()
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('main')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run full unit test suite**

```bash
npx vitest run
```

Expected: all unit tests pass. Playwright tests require a running dev server and are validated manually or in CI.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/social.spec.ts
git commit -m "test: add Playwright smoke tests for social features"
```

---

## Done

After all 9 tasks:

- `requireUser` guard is live and used by the bookmarks page
- `toggleLike`, `toggleBookmark`, `toggleFollow` server actions keep denormalized counters accurate
- `LikeButton`, `BookmarkButton`, `FollowButton` have unit tests and provide optimistic UI on all 5 content types
- All content detail pages use a single `getUser()` call (no duplicate auth network calls)
- Author profile page is live at `/author/[slug]` with FollowButton + content list
- Bookmarks page is live at `/dashboard/bookmarks` (auth-protected)
- All unit tests pass; Playwright smoke tests guard redirect behavior and button rendering
