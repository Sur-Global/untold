# UNTOLD.ink — Plan 2: Reader Experience

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all public reader-facing content pages — listing, detail, tag, and search — so readers can discover and consume all 5 content types across all 7 locales.

**Architecture:** All pages are server components querying Supabase via the cookie-based `createClient()`. Locale-aware translation fallback: requested locale → `en` → `source_locale`. Article/pill bodies rendered from Tiptap JSON server-side using `@tiptap/html`. Shared helpers eliminate boilerplate across pages.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres, `@tiptap/html`, `@tiptap/starter-kit`, `@tailwindcss/typography`, next-intl, Tailwind CSS v4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-21-untold-site-design.md`

---

## File Map

```
app/[locale]/
├── articles/
│   ├── page.tsx                         # Articles listing (paginated)
│   └── [slug]/page.tsx                  # Article detail
├── videos/[slug]/page.tsx               # Video detail
├── podcasts/[slug]/page.tsx             # Podcast detail
├── pills/[slug]/page.tsx                # Pill detail
├── courses/[slug]/page.tsx              # Course detail
├── tag/[slug]/page.tsx                  # Tag page (all types)
└── search/page.tsx                      # Full-text search

components/content/
├── ContentCard.tsx                      # Reusable card for all 5 types
├── EmbedPlayer.tsx                      # Video/podcast iframe embed
└── ArticleBody.tsx                      # Renders Tiptap JSON → HTML

lib/
├── nav.ts                               # getNavProps() — auth state for Navigation
├── content.ts                           # getTranslation() — locale fallback helper
└── embed.ts                             # getEmbedUrl() — platform URL → embed URL

tests/unit/
├── lib/embed.test.ts
├── lib/content.test.ts
└── components/ContentCard.test.tsx
```

---

## Task 1: Setup — dependencies, helpers, i18n strings

**Files:**
- Modify: `package.json` (new deps)
- Create: `lib/nav.ts`
- Create: `lib/content.ts`
- Create: `lib/embed.ts`
- Modify: `messages/en.json`

- [ ] **Step 1: Install new dependencies**

```bash
cd /Users/noahlaux/code/surglobal/untold
npm install @tiptap/html @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
npm install -D @tailwindcss/typography
```

- [ ] **Step 2: Add typography plugin to globals.css**

Open `app/globals.css`. After the `@import "tailwindcss";` line, add:

```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 3: Write failing tests for lib/content.ts**

Create `tests/unit/lib/content.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getTranslation } from '@/lib/content'

const translations = [
  { locale: 'en', title: 'Hello', excerpt: 'World', description: null, body: null },
  { locale: 'es', title: 'Hola', excerpt: 'Mundo', description: null, body: null },
]

describe('getTranslation', () => {
  it('returns the requested locale if available', () => {
    expect(getTranslation(translations, 'es')?.title).toBe('Hola')
  })
  it('falls back to en if requested locale not found', () => {
    expect(getTranslation(translations, 'fr')?.title).toBe('Hello')
  })
  it('returns first available if en also missing', () => {
    const onlyEs = [{ locale: 'es', title: 'Hola', excerpt: null, description: null, body: null }]
    expect(getTranslation(onlyEs, 'fr')?.title).toBe('Hola')
  })
  it('returns null for empty array', () => {
    expect(getTranslation([], 'en')).toBeNull()
  })
})
```

- [ ] **Step 4: Run test — verify FAIL**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test -- tests/unit/lib/content.test.ts 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 5: Create lib/content.ts**

```typescript
export interface Translation {
  locale: string
  title: string
  excerpt: string | null
  description: string | null
  body: Record<string, unknown> | null
}

export function getTranslation(
  translations: Translation[],
  requestedLocale: string
): Translation | null {
  if (!translations.length) return null
  return (
    translations.find((t) => t.locale === requestedLocale) ??
    translations.find((t) => t.locale === 'en') ??
    translations[0]
  )
}
```

- [ ] **Step 6: Run test — verify PASS**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test -- tests/unit/lib/content.test.ts 2>&1 | tail -5
```

Expected: PASS (4 tests).

- [ ] **Step 7: Write failing tests for lib/embed.ts**

Create `tests/unit/lib/embed.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getEmbedUrl } from '@/lib/embed'

describe('getEmbedUrl', () => {
  it('converts YouTube watch URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
  it('converts YouTube Shorts URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/shorts/abc123'))
      .toBe('https://www.youtube.com/embed/abc123')
  })
  it('converts youtu.be short URL', () => {
    expect(getEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
  it('converts Vimeo URL', () => {
    expect(getEmbedUrl('https://vimeo.com/123456789'))
      .toBe('https://player.vimeo.com/video/123456789')
  })
  it('converts Spotify episode URL', () => {
    expect(getEmbedUrl('https://open.spotify.com/episode/abc123'))
      .toBe('https://open.spotify.com/embed/episode/abc123')
  })
  it('returns null for unrecognised URL', () => {
    expect(getEmbedUrl('https://example.com/video')).toBeNull()
  })
})
```

- [ ] **Step 8: Run test — verify FAIL**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test -- tests/unit/lib/embed.test.ts 2>&1 | tail -5
```

- [ ] **Step 9: Create lib/embed.ts**

```typescript
export interface EmbedConfig {
  url: string
  platform: 'youtube' | 'vimeo' | 'spotify' | 'apple-podcasts' | 'amazon-music' | 'overcast' | 'podbean'
  aspectRatio: '16/9' | '1/1'
}

export function getEmbedUrl(url: string): string | null {
  // YouTube watch + short links
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  )
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  // Spotify (episode, show, track)
  const spotifyMatch = url.match(/open\.spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/)
  if (spotifyMatch) return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`

  // Apple Podcasts — use as-is (no reliable transform)
  if (url.includes('podcasts.apple.com')) return url

  // Amazon Music — use as-is
  if (url.includes('music.amazon.com')) return url

  // Overcast — use as-is
  if (url.includes('overcast.fm')) return url

  // Podbean — use as-is
  if (url.includes('podbean.com')) return url

  return null
}

export function getPlatformLabel(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('vimeo.com')) return 'Vimeo'
  if (url.includes('spotify.com')) return 'Spotify'
  if (url.includes('podcasts.apple.com')) return 'Apple Podcasts'
  if (url.includes('music.amazon.com')) return 'Amazon Music'
  if (url.includes('overcast.fm')) return 'Overcast'
  if (url.includes('podbean.com')) return 'Podbean'
  return 'External'
}
```

- [ ] **Step 10: Run embed tests — verify PASS**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test -- tests/unit/lib/embed.test.ts 2>&1 | tail -5
```

Expected: PASS (6 tests).

- [ ] **Step 11: Create lib/nav.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export async function getNavProps(): Promise<{
  isLoggedIn: boolean
  userRole: UserRole | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isLoggedIn: false, userRole: null }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    isLoggedIn: true,
    userRole: (profile?.role as UserRole) ?? null,
  }
}
```

- [ ] **Step 12: Add reader i18n strings to messages/en.json**

Open `messages/en.json` and add these keys alongside the existing ones:

```json
{
  "content": {
    "readTime": "{minutes} min read",
    "likes": "{count} likes",
    "publishedOn": "Published {date}",
    "by": "by",
    "noResults": "No results found.",
    "loadMore": "Load more",
    "episode": "Episode",
    "duration": "Duration",
    "price": "Price",
    "students": "students",
    "rating": "Rating",
    "freeLabel": "Free"
  },
  "search": {
    "placeholder": "Search articles, videos, podcasts...",
    "results": "{count} results for \"{query}\"",
    "noResults": "No results for \"{query}\"",
    "filterAll": "All",
    "filterArticles": "Articles",
    "filterVideos": "Videos",
    "filterPodcasts": "Podcasts",
    "filterPills": "Pills",
    "filterCourses": "Courses"
  },
  "tag": {
    "heading": "#{tag}",
    "contentCount": "{count} pieces of content"
  }
}
```

Copy the same keys (with English values as placeholders) into `messages/es.json`, `pt.json`, `fr.json`, `de.json`, `da.json`, `qu.json`:

```bash
cd /Users/noahlaux/code/surglobal/untold
node -e "
const fs = require('fs');
const en = JSON.parse(fs.readFileSync('messages/en.json','utf8'));
['es','pt','fr','de','da','qu'].forEach(l => {
  const existing = JSON.parse(fs.readFileSync(\`messages/\${l}.json\`,'utf8'));
  const merged = { ...existing, content: en.content, search: en.search, tag: en.tag };
  fs.writeFileSync(\`messages/\${l}.json\`, JSON.stringify(merged, null, 2));
});
console.log('done');
"
```

- [ ] **Step 13: Run full test suite**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test 2>&1 | tail -10
```

Expected: all existing tests + 10 new tests passing.

- [ ] **Step 14: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add .
git commit -m "feat: add content/embed helpers, nav helper, reader i18n strings"
```

---

## Task 2: ContentCard component

**Files:**
- Create: `components/content/ContentCard.tsx`
- Create: `tests/unit/components/ContentCard.test.tsx`

The ContentCard renders a preview of any content type: article, video, podcast, pill, or course.

- [ ] **Step 1: Write failing tests**

Create `tests/unit/components/ContentCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContentCard } from '@/components/content/ContentCard'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const base = {
  id: '1',
  slug: 'test-slug',
  title: 'Test Title',
  publishedAt: '2026-03-21T00:00:00Z',
  likesCount: 42,
  authorName: 'Jane Doe',
  authorSlug: 'jane-doe',
}

describe('ContentCard', () => {
  it('renders article card with title and author', () => {
    render(<ContentCard {...base} type="article" excerpt="Some excerpt" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('links to the correct slug path for articles', () => {
    render(<ContentCard {...base} type="article" />)
    const link = screen.getAllByRole('link')[0]
    expect(link.getAttribute('href')).toContain('/articles/test-slug')
  })

  it('renders video card with duration', () => {
    render(<ContentCard {...base} type="video" duration="15:30" />)
    expect(screen.getByText('15:30')).toBeInTheDocument()
  })

  it('renders pill card with accent color', () => {
    const { container } = render(
      <ContentCard {...base} type="pill" accentColor="#6B8E23" />
    )
    expect(container.querySelector('[style]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test -- tests/unit/components/ContentCard.test.tsx 2>&1 | tail -5
```

- [ ] **Step 3: Create ContentCard component**

Create `components/content/ContentCard.tsx`:

```typescript
import Link from 'next/link'
import type { ContentType } from '@/lib/supabase/types'

const TYPE_PATHS: Record<ContentType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

const TYPE_BADGE: Record<ContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  pill: 'Pill',
  course: 'Course',
}

interface ContentCardProps {
  id: string
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
  duration?: string | null
  episodeNumber?: string | null
  accentColor?: string | null
  rating?: number | null
  price?: number | null
  currency?: string | null
}

export function ContentCard({
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
  duration,
  episodeNumber,
  accentColor,
  rating,
  price,
  currency,
}: ContentCardProps) {
  const href = `/${TYPE_PATHS[type]}/${slug}`
  const blurb = excerpt ?? description
  const image = coverImageUrl ?? thumbnailUrl
  const pillStyle = type === 'pill' && accentColor
    ? { borderTop: `3px solid ${accentColor}` }
    : undefined

  return (
    <article
      className="rounded-lg overflow-hidden bg-[#FAF7F2] transition-shadow hover:shadow-lg"
      style={{
        border: '1px solid rgba(139,69,19,0.12)',
        boxShadow: '0 2px 8px rgba(44,36,32,0.06)',
        ...pillStyle,
      }}
    >
      {/* Cover image */}
      {image && (
        <Link href={href}>
          <img
            src={image}
            alt=""
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </Link>
      )}

      <div className="p-5">
        {/* Type badge + duration */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: 'rgba(160,82,45,0.1)', color: '#A0522D' }}
          >
            {TYPE_BADGE[type]}
          </span>
          {duration && (
            <span className="text-xs font-mono text-[#6B5F58]">{duration}</span>
          )}
          {episodeNumber && (
            <span className="text-xs font-mono text-[#6B5F58]">{episodeNumber}</span>
          )}
          {rating != null && (
            <span className="text-xs font-mono text-[#6B5F58]">★ {rating.toFixed(1)}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base leading-snug" style={{ fontFamily: 'Audiowide, sans-serif', textTransform: 'uppercase' }}>
          <Link href={href} className="hover:text-[#A0522D] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Excerpt / description */}
        {blurb && (
          <p className="text-sm text-[#6B5F58] line-clamp-2 mb-3">{blurb}</p>
        )}

        {/* Price (courses) */}
        {price != null && (
          <p className="text-sm font-mono font-semibold text-[#A0522D] mb-3">
            {price === 0 ? 'Free' : `${currency ?? ''} ${price}`}
          </p>
        )}

        {/* Footer: author + likes + date */}
        <div className="flex items-center justify-between text-xs text-[#6B5F58] font-mono mt-3 pt-3" style={{ borderTop: '1px solid rgba(139,69,19,0.08)' }}>
          {authorName && authorSlug && (
            <Link href={`/author/${authorSlug}`} className="hover:text-[#A0522D] truncate max-w-[60%]">
              {authorName}
            </Link>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {likesCount != null && likesCount > 0 && (
              <span>♥ {likesCount}</span>
            )}
            {publishedAt && (
              <span>{new Date(publishedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test -- tests/unit/components/ContentCard.test.tsx 2>&1 | tail -5
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add components/content/ContentCard.tsx tests/unit/components/ContentCard.test.tsx
git commit -m "feat: add ContentCard component for all 5 content types"
```

---

## Task 3: EmbedPlayer + ArticleBody components

**Files:**
- Create: `components/content/EmbedPlayer.tsx`
- Create: `components/content/ArticleBody.tsx`

- [ ] **Step 1: Create EmbedPlayer component**

Create `components/content/EmbedPlayer.tsx`:

```typescript
'use client'
import { getEmbedUrl, getPlatformLabel } from '@/lib/embed'

interface EmbedPlayerProps {
  url: string
  title?: string
  aspectRatio?: '16/9' | '4/3' | '1/1'
}

export function EmbedPlayer({ url, title, aspectRatio = '16/9' }: EmbedPlayerProps) {
  const embedUrl = getEmbedUrl(url)
  const platform = getPlatformLabel(url)

  if (!embedUrl) {
    return (
      <div className="rounded-lg p-4 text-sm text-[#6B5F58]" style={{ background: 'rgba(44,36,32,0.04)', border: '1px solid rgba(139,69,19,0.12)' }}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#A0522D] hover:underline">
          Open on {platform} ↗
        </a>
      </div>
    )
  }

  // Spotify uses a fixed height; everything else 16/9
  const isSpotify = url.includes('spotify.com')
  const paddingMap = { '16/9': '56.25%', '4/3': '75%', '1/1': '100%' }
  const paddingBottom = isSpotify ? undefined : paddingMap[aspectRatio]

  if (isSpotify) {
    return (
      <iframe
        src={embedUrl}
        width="100%"
        height="232"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={title ?? platform}
        className="rounded-xl"
        style={{ border: 'none' }}
      />
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title={title ?? platform}
        style={{ border: 'none' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create ArticleBody component**

Create `components/content/ArticleBody.tsx`:

```typescript
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'

interface ArticleBodyProps {
  json: Record<string, unknown>
}

export function ArticleBody({ json }: ArticleBodyProps) {
  let html = ''
  try {
    html = generateHTML(json as any, [
      StarterKit,
      Underline,
      Table,
      TableRow,
      TableCell,
      TableHeader,
    ])
  } catch {
    html = '<p>Unable to render content.</p>'
  }

  return (
    <div
      className="prose prose-stone max-w-none
        prose-headings:font-['Audiowide'] prose-headings:uppercase
        prose-a:text-[#A0522D] prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-[#A0522D] prose-blockquote:text-[#6B5F58]
        prose-code:text-[#A0522D] prose-code:bg-[rgba(160,82,45,0.08)]
        prose-pre:bg-[#1C1712] prose-pre:text-[#E8E6E3]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

- [ ] **Step 3: TypeScript check on new files**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep -E 'content/|embed\.' | head -20
```

Fix any TypeScript errors in the new files.

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add components/content/EmbedPlayer.tsx components/content/ArticleBody.tsx
git commit -m "feat: add EmbedPlayer and ArticleBody components"
```

---

## Task 4: Articles listing page

**Files:**
- Create: `app/[locale]/articles/page.tsx`

The articles listing page shows all published articles from admin + author roles, paginated (20 per page), with cover images, titles, excerpts, and author info.

- [ ] **Step 1: Create articles listing page**

Create `app/[locale]/articles/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'

const PAGE_SIZE = 20

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ArticlesPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const navProps = await getNavProps()

  const { data: articles, count } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, type, is_featured, likes_count, published_at, cover_image_url,
      profiles!author_id ( display_name, slug, role ),
      content_translations ( title, excerpt, locale )
    `, { count: 'exact' })
    .eq('type', 'article')
    .eq('status', 'published')
    .in('profiles.role', ['admin', 'author'])  // mirrors homepage_feed: admin/author content only
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">Articles</h1>
          <p className="text-[#6B5F58]">In-depth writing from the Global South</p>
        </div>

        {articles && articles.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article: any) => {
                const t = getTranslation(article.content_translations ?? [], locale)
                const author = article.profiles
                return (
                  <ContentCard
                    key={article.id}
                    id={article.id}
                    type="article"
                    slug={article.slug}
                    title={t?.title ?? 'Untitled'}
                    excerpt={t?.excerpt}
                    coverImageUrl={article.cover_image_url}
                    publishedAt={article.published_at}
                    likesCount={article.likes_count}
                    authorName={author?.display_name}
                    authorSlug={author?.slug}
                  />
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {page > 1 && (
                  <a href={`?page=${page - 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    ← Previous
                  </a>
                )}
                <span className="px-4 py-2 font-mono text-sm text-[#6B5F58]">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <a href={`?page=${page + 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    Next →
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-20 text-[#6B5F58]">No articles yet.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep 'articles' | head -10
```

Fix any errors in the new file. `as any` casts on Supabase queries are acceptable here (stub types).

- [ ] **Step 3: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add app/\[locale\]/articles/
git commit -m "feat: add articles listing page with pagination"
```

---

## Task 5: Article detail page

**Files:**
- Create: `app/[locale]/articles/[slug]/page.tsx`

The article detail page renders the full Tiptap body, author info, cover image, likes count, and read time. Uses `notFound()` if the slug doesn't exist.

- [ ] **Step 1: Create article detail page**

Create `app/[locale]/articles/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { readTime } from '@/lib/utils'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
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
  const navProps = await getNavProps()

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
                {article.likes_count > 0 && (
                  <>
                    <span className="mx-2">·</span>
                    <span>♥ {article.likes_count}</span>
                  </>
                )}
              </div>
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

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep 'articles/\[slug\]' | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add app/\[locale\]/articles/
git commit -m "feat: add article detail page with Tiptap body rendering"
```

---

## Task 6: Video + Podcast detail pages

**Files:**
- Create: `app/[locale]/videos/[slug]/page.tsx`
- Create: `app/[locale]/podcasts/[slug]/page.tsx`

- [ ] **Step 1: Create video detail page**

Create `app/[locale]/videos/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function VideoPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

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
          {video.likes_count > 0 && <span>♥ {video.likes_count}</span>}
          {video.published_at && (
            <span>{new Date(video.published_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          {author && (
            <Link href={`/author/${author.slug}`} className="hover:text-[#A0522D]">
              by {author.display_name}
            </Link>
          )}
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

- [ ] **Step 2: Create podcast detail page**

Create `app/[locale]/podcasts/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PodcastPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

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
          <div>
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

- [ ] **Step 3: TypeScript check + fix**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep -E 'videos|podcasts' | head -10
```

Fix any errors in the new files.

- [ ] **Step 4: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add app/\[locale\]/videos/ app/\[locale\]/podcasts/
git commit -m "feat: add video and podcast detail pages with embed player"
```

---

## Task 7: Pill + Course detail pages

**Files:**
- Create: `app/[locale]/pills/[slug]/page.tsx`
- Create: `app/[locale]/courses/[slug]/page.tsx`

- [ ] **Step 1: Create pill detail page**

Create `app/[locale]/pills/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PillPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

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

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Pill header with accent color */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{ background: `${accentColor}12`, borderTop: `4px solid ${accentColor}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              Knowledge Pill
            </span>
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

- [ ] **Step 2: Create course detail page**

Create `app/[locale]/courses/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function CoursePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

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
          </div>

          {/* Course info sidebar */}
          <div
            className="rounded-xl p-6 h-fit"
            style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.12)', boxShadow: '0 4px 16px rgba(44,36,32,0.08)' }}
          >
            {/* Price */}
            {meta && (
              <p className="text-2xl font-mono font-bold text-[#A0522D] mb-4">
                {meta.price === 0 ? 'Free' : `${meta.currency} ${meta.price}`}
              </p>
            )}

            <button
              className="w-full py-3 rounded-lg font-mono text-sm font-semibold text-white mb-4"
              style={{ background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)' }}
            >
              Enroll Now
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

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep -E 'pills|courses' | head -10
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add app/\[locale\]/pills/ app/\[locale\]/courses/
git commit -m "feat: add pill and course detail pages"
```

---

## Task 8: Tag page

**Files:**
- Create: `app/[locale]/tag/[slug]/page.tsx`

The tag page shows all published content tagged with a given tag, grouped or mixed.

- [ ] **Step 1: Create tag page**

Create `app/[locale]/tag/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function TagPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

  // Look up the tag
  const { data: tag } = await (supabase as any)
    .from('tags')
    .select('id, slug, names')
    .eq('slug', slug)
    .single()

  if (!tag) notFound()

  const tagLabel = (tag.names as Record<string, string>)?.[locale] ?? tag.names?.en ?? tag.slug

  // Get all published content with this tag
  const { data: items } = await (supabase as any)
    .from('content_tags')
    .select(`
      content (
        id, slug, type, is_featured, likes_count, published_at, cover_image_url, status,
        profiles!author_id ( display_name, slug, role ),
        content_translations ( title, excerpt, description, locale ),
        video_meta ( duration ),
        podcast_meta ( duration, episode_number ),
        pill_meta ( accent_color ),
        course_meta ( price, currency, rating )
      )
    `)
    .eq('tag_id', tag.id)

  // Flatten and filter: published content by admin/author only (mirrors homepage_feed logic)
  const published = (items ?? [])
    .map((row: any) => row.content)
    .filter((c: any) => c && c.status === 'published' && ['admin', 'author'].includes(c.profiles?.role))
    .sort((a: any, b: any) => {
      if (a.is_featured && !b.is_featured) return -1
      if (!a.is_featured && b.is_featured) return 1
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">#{tagLabel}</h1>
          <p className="text-[#6B5F58] font-mono">{published.length} pieces of content</p>
        </div>

        {published.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {published.map((item: any) => {
              const t = getTranslation(item.content_translations ?? [], locale)
              const author = item.profiles
              return (
                <ContentCard
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  slug={item.slug}
                  title={t?.title ?? 'Untitled'}
                  excerpt={t?.excerpt}
                  description={t?.description}
                  coverImageUrl={item.cover_image_url}
                  publishedAt={item.published_at}
                  likesCount={item.likes_count}
                  authorName={author?.display_name}
                  authorSlug={author?.slug}
                  duration={item.video_meta?.duration ?? item.podcast_meta?.duration}
                  episodeNumber={item.podcast_meta?.episode_number}
                  accentColor={item.pill_meta?.accent_color}
                  rating={item.course_meta?.rating}
                  price={item.course_meta?.price}
                  currency={item.course_meta?.currency}
                />
              )
            })}
          </div>
        ) : (
          <p className="text-center py-20 text-[#6B5F58]">No content for this tag yet.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep 'tag' | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add app/\[locale\]/tag/
git commit -m "feat: add tag page showing all content for a given tag"
```

---

## Task 9: Search page

**Files:**
- Create: `app/[locale]/search/page.tsx`

**Prerequisite:** The `search_vector` tsvector column and GIN index on `content_translations` were created in Plan 1's migration (`supabase/migrations/20260321000001_schema.sql`). This plan assumes that migration has been applied.

Full-text search using Postgres tsvector. Query param `?q=search+term&type=article`. Returns up to 20 results ordered by role priority (admin > author > user) then ts_rank.

- [ ] **Step 1: Create search page**

Create `app/[locale]/search/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import type { ContentType } from '@/lib/supabase/types'

const CONTENT_TYPES: ContentType[] = ['article', 'video', 'podcast', 'pill', 'course']

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; type?: string }>
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { q = '', type: typeFilter } = await searchParams
  const navProps = await getNavProps()
  const supabase = await createClient()

  let results: any[] = []

  if (q.trim()) {
    // Use Postgres full-text search via the search_vector column
    let query = (supabase as any)
      .from('content_translations')
      .select(`
        content_id, locale, title, excerpt, description,
        content!inner (
          id, slug, type, is_featured, likes_count, published_at, cover_image_url,
          profiles!author_id ( display_name, slug, role ),
          video_meta ( duration ),
          podcast_meta ( duration, episode_number ),
          pill_meta ( accent_color ),
          course_meta ( price, currency, rating )
        )
      `)
      .textSearch('search_vector', q.trim().split(/\s+/).join(' & '), { type: 'websearch' })
      .eq('locale', locale !== 'en' ? locale : 'en')
      .eq('content.status', 'published')
      .limit(20)

    if (typeFilter && CONTENT_TYPES.includes(typeFilter as ContentType)) {
      query = query.eq('content.type', typeFilter)
    }

    const { data } = await query

    // Deduplicate by content_id and sort by role priority
    const seen = new Set<string>()
    results = (data ?? [])
      .filter((row: any) => {
        if (seen.has(row.content_id)) return false
        seen.add(row.content_id)
        return row.content != null
      })
      .sort((a: any, b: any) => {
        // Role priority: admin → author → user (spec requirement)
        // True ts_rank ordering within each group requires a Postgres RPC; use recency as tiebreaker
        const rolePriority: Record<string, number> = { admin: 0, author: 1, user: 2 }
        const ra = rolePriority[a.content?.profiles?.role ?? 'user'] ?? 2
        const rb = rolePriority[b.content?.profiles?.role ?? 'user'] ?? 2
        if (ra !== rb) return ra - rb
        // Tiebreaker: most recently published first (proxy for ts_rank within same role group)
        return new Date(b.content?.published_at ?? 0).getTime() - new Date(a.content?.published_at ?? 0).getTime()
      })
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {/* Search header */}
        <div className="mb-8">
          <h1 className="mb-6">Search</h1>
          <form method="GET" className="flex gap-3 max-w-2xl">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search articles, videos, podcasts..."
              className="flex-1 px-4 py-2 rounded-lg font-mono text-sm"
              style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.2)', color: '#2C2420' }}
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-lg font-mono text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #8B4513, #A0522D)' }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Type filter tabs */}
        {q && (
          <div className="flex flex-wrap gap-2 mb-8">
            {[null, ...CONTENT_TYPES].map((t) => {
              const label = t ? t.charAt(0).toUpperCase() + t.slice(1) + 's' : 'All'
              const isActive = t === (typeFilter || null)
              return (
                <a
                  key={t ?? 'all'}
                  href={`?q=${encodeURIComponent(q)}${t ? `&type=${t}` : ''}`}
                  className="px-3 py-1 rounded font-mono text-xs uppercase tracking-wider transition-colors"
                  style={{
                    background: isActive ? '#A0522D' : 'rgba(160,82,45,0.08)',
                    color: isActive ? '#fff' : '#A0522D',
                  }}
                >
                  {label}
                </a>
              )
            })}
          </div>
        )}

        {/* Results */}
        {q && (
          <p className="text-sm font-mono text-[#6B5F58] mb-8">
            {results.length > 0
              ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${q}"`
              : `No results for "${q}"`}
          </p>
        )}

        {results.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((row: any) => {
              const item = row.content
              const t = getTranslation(
                [{ locale: row.locale, title: row.title, excerpt: row.excerpt ?? null, description: row.description ?? null, body: null }],
                locale
              )
              const author = item?.profiles
              return (
                <ContentCard
                  key={row.content_id}
                  id={item.id}
                  type={item.type}
                  slug={item.slug}
                  title={t?.title ?? 'Untitled'}
                  excerpt={t?.excerpt}
                  description={t?.description}
                  coverImageUrl={item.cover_image_url}
                  publishedAt={item.published_at}
                  likesCount={item.likes_count}
                  authorName={author?.display_name}
                  authorSlug={author?.slug}
                  duration={item.video_meta?.duration ?? item.podcast_meta?.duration}
                  episodeNumber={item.podcast_meta?.episode_number}
                  accentColor={item.pill_meta?.accent_color}
                  rating={item.course_meta?.rating}
                  price={item.course_meta?.price}
                  currency={item.course_meta?.currency}
                />
              )
            })}
          </div>
        )}

        {!q && (
          <p className="text-center py-20 text-[#6B5F58]">Enter a search term above.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/noahlaux/code/surglobal/untold && npx tsc --noEmit 2>&1 | grep 'search' | head -10
```

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/noahlaux/code/surglobal/untold && npm test 2>&1 | tail -10
```

All tests should pass (Plan 1 tests + 14 new tests added in this plan: 10 from Task 1 + 4 from Task 2).

- [ ] **Step 4: Final commit**

```bash
cd /Users/noahlaux/code/surglobal/untold
git add app/\[locale\]/search/
git commit -m "feat: add full-text search page with type filter"
```

---

## Done

After completing Plan 2, you have:
- ✅ `lib/nav.ts` — `getNavProps()` shared auth helper
- ✅ `lib/content.ts` — `getTranslation()` with locale fallback
- ✅ `lib/embed.ts` — platform embed URL extraction (YouTube, Vimeo, Spotify, and more)
- ✅ `ContentCard` — reusable card for all 5 content types
- ✅ `EmbedPlayer` — iframe embed for video + podcast platforms
- ✅ `ArticleBody` — server-side Tiptap JSON → HTML rendering
- ✅ `/articles` — paginated articles listing
- ✅ `/articles/[slug]` — full article with body, author, tags
- ✅ `/videos/[slug]`, `/podcasts/[slug]` — detail pages with embed
- ✅ `/pills/[slug]`, `/courses/[slug]` — detail pages
- ✅ `/tag/[slug]` — all content for a tag
- ✅ `/search` — full-text search with type filter

**Next plans:**
- Plan 3: Article Editor (Tiptap — rich text, pull quotes, footnotes, social embeds, image upload)
- Plan 4: Content Creation forms (video, podcast, pill, course)
- Plan 5: Social features (likes, bookmarks, follows, author profiles)
- Plan 6: Translation pipeline (DeepL Edge Function)
- Plan 7: Admin dashboard
