# Figma Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the site into full visual alignment with the Figma design — dark two-row nav, home page with hero + content sections, 4 missing listing pages, and a richer ContentCard.

**Architecture:** Four sequential task groups (DB + nav prep → ContentCard → listing pages → home page). ContentCard redesign is done first because it's a shared dependency. Each task produces a working, testable increment.

**Tech Stack:** Next.js 16 App Router, Server Components, Supabase SSR, Tailwind CSS, Playwright (E2E), `lucide-react` icons, `next-intl` for i18n

---

## File Map

**Created:**
- `supabase/migrations/20260323000001_add_read_time.sql` — adds `read_time_minutes` column to `content`
- `lib/readTime.ts` — utility to extract plain text from TipTap JSON and compute read time
- `components/content/BookmarkButton.tsx` — client island for bookmark toggle
- `app/[locale]/videos/page.tsx` — videos listing page
- `app/[locale]/podcasts/page.tsx` — podcasts listing page
- `app/[locale]/pills/page.tsx` — pills listing page
- `app/[locale]/courses/page.tsx` — courses listing page

**Modified:**
- `lib/nav.ts` — extend `getNavProps()` to return `userId: string | null`
- `components/layout/Navigation.tsx` — two-row dark layout, active link detection
- `components/content/ContentCard.tsx` — new props, avatar, category badge, type badge, featured star, read time, bookmark
- `app/[locale]/articles/page.tsx` — update query to join tags + profiles.avatar_url, resolve bookmarks, pass new ContentCard props
- `lib/actions/article.ts` — compute and store `read_time_minutes` on save/update
- `messages/en.json` — new i18n keys for home page + listings namespace
- `app/[locale]/page.tsx` — full home page redesign (hero + 5 content sections)

---

## Task 1: DB migration — `read_time_minutes` column

**Files:**
- Create: `supabase/migrations/20260323000001_add_read_time.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260323000001_add_read_time.sql
ALTER TABLE content ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER;
```

- [ ] **Step 2: Apply the migration**

The project uses Supabase. Apply via the Supabase dashboard SQL editor or the local CLI:
```bash
/tmp/supabase db push --db-url "$SUPABASE_DB_URL"
```
If the CLI isn't available, run the SQL directly in the Supabase dashboard → SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260323000001_add_read_time.sql
git commit -m "feat: add read_time_minutes column to content table"
```

---

## Task 2: Extend `getNavProps()` to return `userId`

**Files:**
- Modify: `lib/nav.ts`

The current `getNavProps()` returns `{ isLoggedIn, userRole }`. All listing pages need `userId` to batch-query bookmarks. We extend the return type here so every page gets it for free.

- [ ] **Step 1: Update `lib/nav.ts`**

```ts
// lib/nav.ts
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import { cache } from "react";

async function getNavPropsUncached(): Promise<{
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { isLoggedIn: false, userRole: null, userId: null };

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isLoggedIn: true,
    userRole: (profile?.role as UserRole) ?? null,
    userId: user.id,
  };
}

export const getNavProps = cache(getNavPropsUncached);
```

**Important — update all call sites:** `Navigation` only accepts `{ isLoggedIn, userRole }`. Now that `getNavProps()` returns a third field `userId`, every page that spreads `{...navProps}` into `<Navigation>` must destructure `userId` out first to avoid a TypeScript error. Find all affected pages:

```bash
grep -r "getNavProps" /Users/noahlaux/code/surglobal/untold/app --include="*.tsx" -l
```

For each file returned, change the pattern from:
```tsx
const navProps = await getNavProps()
<Navigation {...navProps} />
```
to:
```tsx
const { userId, ...navProps } = await getNavProps()
<Navigation {...navProps} />
// userId is now available for bookmark queries
```

- [ ] **Step 2: Verify TypeScript compiles after updating all call sites**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add lib/nav.ts
git commit -m "feat: expose userId from getNavProps, update all call sites"
```

---

## Task 3: Dark two-row Navigation

**Files:**
- Modify: `components/layout/Navigation.tsx`

Replace the current single-row light nav with the Figma two-row dark layout.

- [ ] **Step 1: Rewrite `components/layout/Navigation.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { LocaleSwitcher } from './LocaleSwitcher'
import type { UserRole } from '@/lib/supabase/types'

interface NavigationProps {
  isLoggedIn: boolean
  userRole: UserRole | null
}

const NAV_LINKS = [
  { key: 'articles' as const, href: '/articles' },
  { key: 'videos' as const, href: '/videos' },
  { key: 'podcasts' as const, href: '/podcasts' },
  { key: 'pills' as const, href: '/pills' },
  { key: 'courses' as const, href: '/courses' },
]

function isCreator(role: UserRole | null) {
  return role === 'admin' || role === 'author'
}

export function Navigation({ isLoggedIn, userRole }: NavigationProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: '#2c2420', boxShadow: '0 2px 8px rgba(44,36,32,0.08)' }}
    >
      {/* Row 1: Logo left, nav links right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{ height: 80 }}>
        <Link
          href="/"
          className="shrink-0"
          style={{
            fontFamily: 'Audiowide, sans-serif',
            fontSize: 22,
            letterSpacing: 3,
            color: '#F5F1E8',
            textDecoration: 'none',
          }}
        >
          UNTOLD
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ key, href }) => {
            const active = pathname.startsWith(`/${href.slice(1)}`) || pathname.includes(href)
            return (
              <Link
                key={key}
                href={href}
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  color: '#fff',
                  textDecoration: 'none',
                  paddingBottom: 2,
                  borderBottom: active
                    ? '2px solid #a0522d'
                    : '2px solid transparent',
                  opacity: active ? 1 : 0.85,
                  transition: 'opacity 0.15s',
                }}
              >
                {t(key)}
              </Link>
            )
          })}
        </nav>

        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger
            className="md:hidden inline-flex items-center justify-center rounded-lg p-1.5 transition-colors"
            style={{ color: '#F5F1E8' }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" style={{ background: '#2c2420', width: 288 }}>
            <nav className="flex flex-col gap-4 mt-8" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {NAV_LINKS.map(({ key, href }) => (
                <Link
                  key={key}
                  href={href}
                  className="py-2 text-base transition-opacity"
                  style={{
                    color: '#F5F1E8',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(139,69,19,0.15)',
                  }}
                >
                  {t(key)}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4">
                <LocaleSwitcher />
                {isLoggedIn && isCreator(userRole) ? (
                  <>
                    <Link href="/dashboard" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('dashboard')}
                    </Link>
                    <Link href="/create" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('createContent')}
                    </Link>
                  </>
                ) : !isLoggedIn ? (
                  <>
                    <Link href="/auth/login" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('login')}
                    </Link>
                    <Link href="/auth/signup" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('signup')}
                    </Link>
                  </>
                ) : null}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Row 2: Locale + auth, right-aligned */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 hidden md:flex items-center justify-end gap-3"
        style={{
          height: 66,
          borderTop: '1px solid rgba(139,69,19,0.1)',
        }}
      >
        <LocaleSwitcher />

        {isLoggedIn && isCreator(userRole) ? (
          <>
            <Link
              href="/dashboard"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#F5F1E8',
                border: '1px solid rgba(245,241,232,0.3)',
                borderRadius: 10,
                padding: '8px 16px',
                textDecoration: 'none',
              }}
            >
              {t('dashboard')}
            </Link>
            <Link
              href="/create"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#fff',
                background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                borderRadius: 10,
                padding: '8px 20px',
                textDecoration: 'none',
              }}
            >
              {t('createContent')}
            </Link>
          </>
        ) : !isLoggedIn ? (
          <>
            <Link
              href="/auth/login"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#F5F1E8',
                textDecoration: 'none',
                padding: '8px 16px',
              }}
            >
              {t('login')}
            </Link>
            <Link
              href="/auth/signup"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#fff',
                background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                borderRadius: 10,
                padding: '8px 20px',
                textDecoration: 'none',
              }}
            >
              {t('signup')}
            </Link>
          </>
        ) : (
          /* Logged-in reader: locale pill only (no buttons) */
          null
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Run the dev server and open the browser to verify visually**

```bash
npm run dev
```

Open http://localhost:3000/en and check:
- Dark background (`#2c2420`) on header
- Two rows visible on desktop
- UNTOLD logo in Row 1 left, nav links right
- Row 2: locale switcher + Login + Sign up (when logged out)

- [ ] **Step 3: Run Playwright nav tests**

```bash
playwright-cli open http://localhost:3000/en
playwright-cli snapshot
```

Verify in snapshot: header element with dark background, two rows of content, UNTOLD text visible.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Navigation.tsx
git commit -m "feat: dark two-row navigation matching Figma design"
```

---

## Task 4: `lib/readTime.ts` utility

**Files:**
- Create: `lib/readTime.ts`

TipTap stores content as a JSON tree. We need to extract all text nodes recursively and count words.

- [ ] **Step 1: Create `lib/readTime.ts`**

```ts
// lib/readTime.ts
// Extracts plain text from a TipTap/ProseMirror JSON document tree.

interface TipTapNode {
  type?: string
  text?: string
  content?: TipTapNode[]
}

function extractText(node: TipTapNode): string {
  if (node.text) return node.text
  if (node.content) return node.content.map(extractText).join(' ')
  return ''
}

/** Returns estimated read time in minutes (minimum 1). */
export function computeReadTime(body: unknown): number {
  if (!body || typeof body !== 'object') return 1
  const text = extractText(body as TipTapNode).trim()
  if (!text) return 1
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add lib/readTime.ts
git commit -m "feat: add readTime utility for TipTap JSON"
```

---

## Task 5: Store `read_time_minutes` on article save

**Files:**
- Modify: `lib/actions/article.ts`

The `createArticle` and `updateArticle` server actions need to compute and store `read_time_minutes` after saving the body.

- [ ] **Step 1: Read the full current `lib/actions/article.ts`** to understand the update action shape before editing.

- [ ] **Step 2: Update `createArticle` in `lib/actions/article.ts`**

After the `content_translations` insert, add read time computation and update:

```ts
// Add import at top of file:
import { computeReadTime } from '@/lib/readTime'

// After the content_translations insert succeeds, add:
const bodyJson = body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null
const readTimeMinutes = bodyJson ? computeReadTime(bodyJson) : null
if (readTimeMinutes) {
  await (supabase as any)
    .from('content')
    .update({ read_time_minutes: readTimeMinutes })
    .eq('id', content.id)
}
```

- [ ] **Step 3: Find the `updateArticle` action** (likely `saveArticle` or similar in the same file) and add the same read time update after updating `content_translations`.

Read the full file first:
```bash
# use Read tool on lib/actions/article.ts
```

Then apply the same pattern wherever the body is saved.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/article.ts
git commit -m "feat: compute and store read_time_minutes on article save"
```

---

## Task 6: Confirm existing `BookmarkButton` is reusable

**Files:**
- No new files — `components/social/BookmarkButton.tsx` already exists with the correct interface.

The existing `BookmarkButton` at `components/social/BookmarkButton.tsx` already has:
- Props: `{ contentId: string, initialIsBookmarked: boolean, isLoggedIn: boolean }`
- Calls `toggleBookmark(contentId)` from `lib/actions/social.ts` (single-argument, uses `requireUser()` internally)
- Optimistic toggle via `useTransition`

`toggleBookmark` in `lib/actions/social.ts` also already exists and takes a single `contentId` argument.

**No new files needed. No changes to `social.ts` needed.**

`ContentCard` will import from `@/components/social/BookmarkButton` (not create a new one). The `isLoggedIn` prop is passed by the Server Component parent — it comes from `navProps.isLoggedIn`.

- [ ] **Step 1: Verify the existing files look as expected**

Read `components/social/BookmarkButton.tsx` and `lib/actions/social.ts` to confirm the interface matches the description above before proceeding to Task 7.

- [ ] **Step 2: No changes needed — skip to Task 7**

---

## Task 7: ContentCard redesign

**Files:**
- Modify: `components/content/ContentCard.tsx`

Add new props and redesigned layout. The card stays a Server Component (no `"use client"`). `BookmarkButton` is imported and rendered inside — it handles its own client boundary.

- [ ] **Step 1: Rewrite `components/content/ContentCard.tsx`**

```tsx
import { Link } from '@/i18n/navigation'
import type { ContentType } from '@/lib/supabase/types'
import { BookmarkButton } from '@/components/social/BookmarkButton'

const TYPE_PATHS: Record<ContentType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

const TYPE_LABEL: Record<ContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  pill: 'Pill',
  course: 'Course',
}

interface ContentCardProps {
  contentId: string
  type: ContentType
  slug: string
  title: string
  excerpt?: string | null
  description?: string | null
  coverImageUrl?: string | null
  thumbnailUrl?: string | null
  publishedAt?: string | null
  likesCount?: number
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  categoryTag?: string | null
  readTimeMinutes?: number | null
  isBookmarked?: boolean
  isLoggedIn?: boolean
  isFeatured?: boolean
  duration?: string | null
  episodeNumber?: string | null
  accentColor?: string | null
  rating?: number | null
  price?: number | null
  currency?: string | null
}

function AuthorAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        width={24}
        height={24}
        className="rounded-full object-cover shrink-0"
        style={{ width: 24, height: 24 }}
      />
    )
  }
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  return (
    <span
      className="rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
      style={{ width: 24, height: 24, background: '#8b4513', fontFamily: 'JetBrains Mono, monospace' }}
    >
      {initial}
    </span>
  )
}

export function ContentCard({
  contentId,
  type,
  slug,
  title,
  excerpt,
  description,
  coverImageUrl,
  thumbnailUrl,
  publishedAt,
  likesCount,
  authorName,
  authorSlug,
  authorAvatarUrl,
  categoryTag,
  readTimeMinutes,
  isBookmarked = false,
  isFeatured = false,
  duration,
  episodeNumber,
  accentColor,
  rating,
  price,
  currency,
  isLoggedIn = false,
}: ContentCardProps) {
  const href = `/${TYPE_PATHS[type]}/${slug}`
  const blurb = excerpt ?? description
  const image = coverImageUrl ?? thumbnailUrl

  return (
    <article
      className="rounded-lg overflow-hidden bg-[#FAF7F2] transition-shadow hover:shadow-lg"
      style={{
        border: '1px solid rgba(139,69,19,0.12)',
        boxShadow: '0 2px 8px rgba(44,36,32,0.06)',
      }}
    >
      {/* Cover image with overlaid badges */}
      <div className="relative">
        {image ? (
          <Link href={href}>
            <img
              src={image}
              alt={title}
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          </Link>
        ) : (
          <div className="w-full aspect-video bg-[#e8e0d8]" />
        )}

        {/* Featured star — top left */}
        {isFeatured && (
          <span
            className="absolute top-2 left-2 text-sm"
            title="Featured"
            style={{ color: '#F5C518', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            ★
          </span>
        )}

        {/* Type badge — top right */}
        <span
          className="absolute top-2 right-2 text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: 'rgba(139,69,19,0.85)', color: '#fff', fontSize: 11 }}
        >
          {TYPE_LABEL[type]}
        </span>

        {/* Category tag — bottom left */}
        {categoryTag && (
          <span
            className="absolute bottom-2 left-2 text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11 }}
          >
            {categoryTag}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Duration / episode / rating line */}
        {(duration || episodeNumber || rating != null) && (
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#6B5F58]">
            {episodeNumber && <span>Ep. {episodeNumber}</span>}
            {duration && <span>{duration}</span>}
            {rating != null && <span>★ {rating.toFixed(1)}</span>}
          </div>
        )}

        {/* Title */}
        <h3
          className="mb-2 text-sm leading-snug"
          style={{ fontFamily: 'Audiowide, sans-serif', textTransform: 'uppercase' }}
        >
          <Link href={href} className="hover:text-[#A0522D] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Excerpt */}
        {blurb && (
          <p className="text-xs text-[#6B5F58] line-clamp-2 mb-3">{blurb}</p>
        )}

        {/* Price (courses) */}
        {price != null && (
          <p className="text-sm font-mono font-semibold text-[#A0522D] mb-2">
            {price === 0 ? 'Free' : currency ? `${currency} ${price}` : String(price)}
          </p>
        )}

        {/* Author row */}
        {authorName && (
          <div className="flex items-center gap-2 mb-3">
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} />
            <Link
              href={authorSlug ? `/author/${authorSlug}` : '#'}
              className="text-xs font-mono text-[#6B5F58] hover:text-[#A0522D] truncate"
            >
              {authorName}
            </Link>
            {type === 'article' && readTimeMinutes && (
              <span className="text-xs font-mono text-[#9B8D85] ml-auto shrink-0">
                {readTimeMinutes} min read
              </span>
            )}
          </div>
        )}

        {/* Likes + bookmark */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(139,69,19,0.08)' }}
        >
          <span className="text-xs font-mono text-[#6B5F58]">
            {likesCount != null && likesCount > 0 ? `♥ ${likesCount}` : '♥ 0'}
          </span>
          <BookmarkButton
            contentId={contentId}
            initialIsBookmarked={isBookmarked}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Update `app/[locale]/articles/page.tsx`** to pass new required props

The query needs `avatar_url`, `read_time_minutes`, and the tags join. Replace the articles query and ContentCard call:

```ts
// Updated query in articles/page.tsx:
const articlesQuery = (supabase as any)
  .from('content')
  .select(`
    id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
    profiles!author_id ( display_name, slug, role, avatar_url ),
    content_translations ( title, excerpt, locale ),
    content_tags ( tags ( names ) )
  `, { count: 'exact' })
  .eq('type', 'article')
  .eq('status', 'published')
  .order('is_featured', { ascending: false })
  .order('published_at', { ascending: false })
  .range(offset, offset + PAGE_SIZE - 1)

// Fetch navProps (now includes userId) + articles in parallel:
const [{ userId, ...navProps }, { data: articles, count }] = await Promise.all([
  getNavProps(),
  articlesQuery,
])

// Batch bookmark query:
const contentIds = (articles ?? []).map((a: any) => a.id)
const bookmarkedIds = new Set<string>()
if (userId && contentIds.length > 0) {
  const { data: bookmarks } = await (supabase as any)
    .from('bookmarks')
    .select('content_id')
    .eq('user_id', userId)
    .in('content_id', contentIds)
  bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
}
```

Updated `<ContentCard>` call:
```tsx
const firstTag = article.content_tags?.[0]?.tags
const categoryTag = firstTag
  ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null)
  : null
const author = article.profiles

<ContentCard
  key={article.id}
  contentId={article.id}
  type="article"
  slug={article.slug}
  title={t?.title ?? 'Untitled'}
  excerpt={t?.excerpt}
  coverImageUrl={article.cover_image_url}
  publishedAt={article.published_at}
  likesCount={article.likes_count}
  authorName={author?.display_name}
  authorSlug={author?.slug}
  authorAvatarUrl={author?.avatar_url}
  categoryTag={categoryTag}
  readTimeMinutes={article.read_time_minutes}
  isBookmarked={bookmarkedIds.has(article.id)}
  isLoggedIn={navProps.isLoggedIn}
  isFeatured={article.is_featured}
/>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Open articles page in browser and verify card layout**

```bash
playwright-cli open http://localhost:3000/en/articles
playwright-cli snapshot
```

Check: type badge visible on each card, author initial avatar visible if no avatar_url, bookmark icon in bottom-right.

- [ ] **Step 5: Commit**

```bash
git add components/content/ContentCard.tsx app/[locale]/articles/page.tsx
git commit -m "feat: redesign ContentCard with avatar, badges, bookmark, read time"
```

---

## Task 8: Four missing listing pages

**Files:**
- Create: `app/[locale]/videos/page.tsx`
- Create: `app/[locale]/podcasts/page.tsx`
- Create: `app/[locale]/pills/page.tsx`
- Create: `app/[locale]/courses/page.tsx`

Also add i18n keys for listing descriptions.

- [ ] **Step 1: Add i18n keys to `messages/en.json`**

Add a `listings` namespace:
```json
"listings": {
  "videosDesc": "Watch videos from journalists and creators across the Global South.",
  "podcastsDesc": "Listen to audio stories and conversations.",
  "pillsDesc": "Bite-sized knowledge to expand your perspective.",
  "coursesDesc": "Structured learning from Global South practitioners."
}
```

Also add to `messages/es.json`, `messages/pt.json`, etc. with equivalent copy (or copy the English as a placeholder for other locales).

- [ ] **Step 2: Create `app/[locale]/videos/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'

const PAGE_SIZE = 12

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function VideosPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  const query = (supabase as any)
    .from('content')
    .select(`
      id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
      profiles!author_id ( display_name, slug, role, avatar_url ),
      content_translations ( title, excerpt, locale ),
      content_tags ( tags ( names ) ),
      video_meta ( thumbnail_url, duration )
    `, { count: 'exact' })
    .eq('type', 'video')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const [{ userId, ...navProps }, { data: items, count }] = await Promise.all([
    getNavProps(),
    query,
  ])

  const contentIds = (items ?? []).map((i: any) => i.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">Videos</h1>
          <p className="text-[#6B5F58]">Watch videos from journalists and creators across the Global South.</p>
        </div>

        {items && items.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item: any) => {
                const t = getTranslation(item.content_translations ?? [], locale)
                const author = item.profiles
                const firstTag = item.content_tags?.[0]?.tags
                const categoryTag = firstTag ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null) : null
                return (
                  <ContentCard
                    key={item.id}
                    contentId={item.id}
                    type="video"
                    slug={item.slug}
                    title={t?.title ?? 'Untitled'}
                    excerpt={t?.excerpt}
                    coverImageUrl={item.cover_image_url ?? item.video_meta?.thumbnail_url}
                    publishedAt={item.published_at}
                    likesCount={item.likes_count}
                    authorName={author?.display_name}
                    authorSlug={author?.slug}
                    authorAvatarUrl={author?.avatar_url}
                    categoryTag={categoryTag}
                    duration={item.video_meta?.duration}
                    isBookmarked={bookmarkedIds.has(item.id)}
                    isLoggedIn={navProps.isLoggedIn}
                    isFeatured={item.is_featured}
                  />
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {page > 1 && (
                  <a href={`?page=${page - 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    ← Previous
                  </a>
                )}
                <span className="px-4 py-2 font-mono text-sm text-[#6B5F58]">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <a href={`?page=${page + 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    Next →
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-20 text-[#6B5F58]">No videos yet.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/podcasts/page.tsx`** — same structure as videos, but:
  - type filter: `podcast`
  - heading: `Podcasts`
  - description: `Listen to audio stories and conversations.`
  - join: `podcast_meta ( duration, episode_number )` instead of `video_meta`
  - pass `episodeNumber={item.podcast_meta?.episode_number}`, `duration={item.podcast_meta?.duration}`
  - empty state: `No podcasts yet.`

- [ ] **Step 4: Create `app/[locale]/pills/page.tsx`** — same structure, but:
  - type filter: `pill`
  - heading: `Knowledge Pills`
  - description: `Bite-sized knowledge to expand your perspective.`
  - join: `pill_meta ( accent_color, image_url )`
  - pass `accentColor={item.pill_meta?.accent_color}`, `coverImageUrl={item.cover_image_url ?? item.pill_meta?.image_url}`
  - empty state: `No knowledge pills yet.`

- [ ] **Step 5: Create `app/[locale]/courses/page.tsx`** — same structure, but:
  - type filter: `course`
  - heading: `Courses`
  - description: `Structured learning from Global South practitioners.`
  - join: `course_meta ( price, currency, duration, rating )`
  - pass `price={item.course_meta?.price}`, `currency={item.course_meta?.currency}`, `rating={item.course_meta?.rating}`, `duration={item.course_meta?.duration}`
  - empty state: `No courses yet.`

- [ ] **Step 6: Verify all four pages load**

```bash
playwright-cli open http://localhost:3000/en/videos
playwright-cli snapshot
playwright-cli goto http://localhost:3000/en/podcasts
playwright-cli snapshot
playwright-cli goto http://localhost:3000/en/pills
playwright-cli snapshot
playwright-cli goto http://localhost:3000/en/courses
playwright-cli snapshot
```

Expected: all four pages load with heading text visible and no JS errors in console.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/videos/page.tsx app/[locale]/podcasts/page.tsx app/[locale]/pills/page.tsx app/[locale]/courses/page.tsx messages/en.json
git commit -m "feat: add Videos, Podcasts, Pills, and Courses listing pages"
```

---

## Task 9: Home page redesign

**Files:**
- Modify: `app/[locale]/page.tsx`
- Add i18n keys: `messages/en.json` (home namespace additions)

- [ ] **Step 1: Add home i18n keys to `messages/en.json`**

The key `"featuredArticles": "Featured Articles"` already exists in the `home` namespace — do NOT duplicate it. Add only the following new keys to the `home` namespace:

```json
"heroTagline": "Stories that don't make the front page.",
"ctaRead": "Start Reading",
"ctaExplore": "Explore Content",
"videos": "Videos",
"podcasts": "Podcasts",
"pills": "Knowledge Pills",
"courses": "Courses & Training",
"viewAll": "View all"
```

- [ ] **Step 2: Read the current `app/[locale]/page.tsx`** to understand what data fetching is already present before rewriting.

- [ ] **Step 3: Rewrite `app/[locale]/page.tsx`**

The page fetches six queries in parallel: featured article (for hero), + 4 items each of the 5 content types. Then renders hero + 5 sections.

```tsx
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

const SECTION_SIZE = 4

function buildContentQuery(supabase: any, type: string) {
  return supabase
    .from('content')
    .select(`
      id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, excerpt, locale ),
      content_tags ( tags ( names ) )
    `)
    .eq('type', type)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(SECTION_SIZE)
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations('home')
  const tNav = await getTranslations('nav')

  const [
    { userId, ...navProps },
    { data: featuredArticle },
    { data: articles },
    { data: videos },
    { data: podcasts },
    { data: pills },
    { data: courses },
  ] = await Promise.all([
    getNavProps(),
    // Featured article for hero
    (supabase as any)
      .from('content')
      .select(`
        id, slug, cover_image_url,
        profiles!author_id ( display_name, slug ),
        content_translations ( title, locale ),
        content_tags ( tags ( names ) )
      `)
      .eq('type', 'article')
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    buildContentQuery(supabase, 'article'),
    buildContentQuery(supabase, 'video'),
    buildContentQuery(supabase, 'podcast'),
    buildContentQuery(supabase, 'pill'),
    buildContentQuery(supabase, 'course'),
  ])

  // Batch bookmark resolution
  const allItems = [...(articles ?? []), ...(videos ?? []), ...(podcasts ?? []), ...(pills ?? []), ...(courses ?? [])]
  const contentIds = allItems.map((i: any) => i.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  function renderCards(items: any[]) {
    return items.map((item: any) => {
      const trans = getTranslation(item.content_translations ?? [], locale)
      const author = item.profiles
      const firstTag = item.content_tags?.[0]?.tags
      const categoryTag = firstTag ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null) : null
      return (
        <ContentCard
          key={item.id}
          contentId={item.id}
          type={item.type}
          slug={item.slug}
          title={trans?.title ?? 'Untitled'}
          excerpt={trans?.excerpt}
          coverImageUrl={item.cover_image_url}
          publishedAt={item.published_at}
          likesCount={item.likes_count}
          authorName={author?.display_name}
          authorSlug={author?.slug}
          authorAvatarUrl={author?.avatar_url}
          categoryTag={categoryTag}
          readTimeMinutes={item.read_time_minutes}
          isBookmarked={bookmarkedIds.has(item.id)}
          isLoggedIn={navProps.isLoggedIn}
          isFeatured={item.is_featured}
        />
      )
    })
  }

  type Section = { label: string; href: string; items: any[] }
  const sections: Section[] = [
    { label: t('featuredArticles'), href: '/articles', items: articles ?? [] },
    { label: t('videos'), href: '/videos', items: videos ?? [] },
    { label: t('podcasts'), href: '/podcasts', items: podcasts ?? [] },
    { label: t('pills'), href: '/pills', items: pills ?? [] },
    { label: t('courses'), href: '/courses', items: courses ?? [] },
  ].filter(s => s.items.length > 0)

  const heroTrans = featuredArticle
    ? getTranslation(featuredArticle.content_translations ?? [], locale)
    : null
  const heroAuthor = featuredArticle?.profiles

  return (
    <>
      <Navigation {...navProps} />
      <main>
        {/* Hero */}
        <section
          className="py-20 px-4 sm:px-6"
          style={{ background: '#2c2420' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
            {/* Left column */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-mono mb-4 uppercase tracking-widest"
                style={{ color: 'rgba(245,241,232,0.6)' }}
              >
                {t('subtitle')}
              </p>
              <h1
                className="mb-4 text-4xl sm:text-5xl leading-tight"
                style={{ fontFamily: 'Audiowide, sans-serif', color: '#F5F1E8' }}
              >
                {t('title')}
              </h1>
              <p
                className="text-lg mb-8"
                style={{ color: 'rgba(245,241,232,0.75)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {t('heroTagline')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/articles"
                  style={{
                    background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  {t('ctaRead')}
                </Link>
                <Link
                  href="/articles"
                  style={{
                    border: '1px solid rgba(245,241,232,0.3)',
                    color: '#F5F1E8',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  {t('ctaExplore')}
                </Link>
              </div>
            </div>

            {/* Right column: featured article card */}
            {featuredArticle && heroTrans && (
              <div
                className="shrink-0 rounded-xl overflow-hidden"
                style={{
                  width: 320,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(245,241,232,0.12)',
                }}
              >
                {featuredArticle.cover_image_url && (
                  <img
                    src={featuredArticle.cover_image_url}
                    alt={heroTrans.title}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-4">
                  <p
                    className="text-xs font-mono mb-1"
                    style={{ color: 'rgba(245,241,232,0.5)' }}
                  >
                    ★ Featured
                  </p>
                  <h3
                    className="text-sm leading-snug mb-2"
                    style={{ fontFamily: 'Audiowide, sans-serif', color: '#F5F1E8' }}
                  >
                    {heroTrans.title}
                  </h3>
                  {heroAuthor && (
                    <p className="text-xs font-mono" style={{ color: 'rgba(245,241,232,0.5)' }}>
                      {heroAuthor.display_name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Content sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
          {sections.map(({ label, href, items }) => (
            <section key={href}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl" style={{ fontFamily: 'Audiowide, sans-serif' }}>{label}</h2>
                <Link
                  href={href}
                  className="text-sm font-mono text-[#A0522D] hover:underline"
                >
                  {t('viewAll')} →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {renderCards(items)}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Open home page and verify**

```bash
playwright-cli open http://localhost:3000/en
playwright-cli snapshot
```

Check: dark hero section with UNTOLD headline + two CTA buttons, at least one content section below.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/page.tsx messages/en.json
git commit -m "feat: home page redesign with hero and content sections"
```

---

## Task 10: Playwright verification suite

Run end-to-end tests to confirm all workstreams are working.

> **Note on `playwright-cli`:** This project uses the `playwright-cli` skill for browser automation. It is a CLI wrapper around Playwright that provides snapshot-based verification. The commands below are the correct verification method for this project — not a placeholder for a different tool. Each `snapshot` command returns a YAML accessibility tree that you inspect to confirm element visibility. The dev server must be running at `http://localhost:3000` before running these steps.

- [ ] **Step 1: Verify navigation (unauthenticated)**

```bash
playwright-cli open http://localhost:3000/en
playwright-cli snapshot
```

Check in snapshot:
- Two rows in header
- Dark background present on header
- `UNTOLD` text visible in Row 1
- `Articles`, `Videos`, `Podcasts`, `Pills`, `Courses` visible
- Row 2 has locale switcher + Login + Sign up

- [ ] **Step 2: Verify navigation (creator)**

Login as test@untold.ink (author), then:
```bash
playwright-cli goto http://localhost:3000/en
playwright-cli snapshot
```
Row 2 must show `Dashboard` and `Create` instead of Login/Sign up.

- [ ] **Step 3: Verify navigation (reader)**

Login as reader@untold.ink, then:
```bash
playwright-cli goto http://localhost:3000/en
playwright-cli snapshot
```
Row 2 must show locale pill only — no Dashboard, no Create, no Login.

- [ ] **Step 4: Verify all listing pages return content or empty state**

```bash
playwright-cli goto http://localhost:3000/en/videos
playwright-cli snapshot
playwright-cli goto http://localhost:3000/en/podcasts
playwright-cli snapshot
playwright-cli goto http://localhost:3000/en/pills
playwright-cli snapshot
playwright-cli goto http://localhost:3000/en/courses
playwright-cli snapshot
```

Expected: each page shows heading text, no crash/error page.

- [ ] **Step 5: Verify ContentCard elements on articles page**

```bash
playwright-cli goto http://localhost:3000/en/articles
playwright-cli snapshot
```

Check snapshot for: author name text, bookmark icon, type badge ("Article").

- [ ] **Step 6: Commit any final fixes discovered during verification**

```bash
git add -p
git commit -m "fix: playwright verification fixes"
```

---

## Done

All four workstreams complete when:
- Navigation has dark background and two rows on desktop
- Home page renders hero + at least one content section
- `/en/videos`, `/en/podcasts`, `/en/pills`, `/en/courses` all load without errors
- Articles page (and new listing pages) show cards with author avatar, type badge, and bookmark icon
