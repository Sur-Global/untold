# Figma Alignment Design Spec

**Date:** 2026-03-22
**Figma source:** https://www.figma.com/design/JcjvxIEDQcvvUCag4ZJ7Cd/SG-2026?node-id=150-128

## Scope

Bring the live site into full visual and structural alignment with the Figma design. Four parallel workstreams:

1. Dark two-row navigation
2. Home page (hero + 5 content sections)
3. Four missing index listing pages (Videos, Podcasts, Pills, Courses)
4. ContentCard redesign

---

## 1. Navigation (Figma node 150:983)

### Structure

Two-row sticky header on a `#2c2420` background. Replaces the current single-row light nav.

**Row 1 — 80px tall**
- Left: `UNTOLD` wordmark — Audiowide font, `#F5F1E8`, `22px`, `3px` letter-spacing
- Right: nav links (Articles, Videos, Podcasts, Pills, Courses) — `JetBrains Mono 14px`, white `#fff`, `24px` gap

**Row 2 — 66px tall**
- Left: empty
- Right-aligned: locale pill + auth buttons, `12px` gap
- Divider above Row 2: `1px solid rgba(139,69,19,0.1)`

**Locale pill:** background `#F5F1E8`, text `#5a4a42`, `JetBrains Mono 14px`, `border-radius: 10px`, border `1px solid rgba(139,69,19,0.2)`

**Auth buttons — unauthenticated:**
- "Log in" (ghost, existing `variant="ghost"`)
- "Sign up" (gradient rust `linear-gradient(160deg,#8b4513,#a0522d)`, white text, `border-radius: 10px`)
- Both use existing i18n keys `nav.login` and `nav.signup`

**Auth buttons — creator (admin/author):**
- "Dashboard" — ghost style with `rgba(245,241,232,0.3)` border, `#F5F1E8` text
- "Create" — gradient rust, existing i18n key `nav.createContent`

**Auth buttons — logged-in reader:**
- Locale pill only. No Dashboard, no Create, no Login, no Signup.

**Active nav link:** `Navigation.tsx` is already `"use client"`. Use `usePathname()` to compare pathname against each link's href. Active link: add `2px` gradient underline `linear-gradient(90deg,#8b4513,#a0522d)` via `border-bottom: 2px solid` (or a `<span>` pseudo-underline with background gradient). Inactive links: `hover:opacity-80`.

**Server data:** Each page/layout already calls `getNavProps()` server-side and passes `isLoggedIn`/`userRole` props to `<Navigation>`. This pattern remains unchanged — no refactoring of how `Navigation` receives props.

**Mobile:** Single row (80px) with logo left + `<Menu>` hamburger right. Drawer background `#2c2420`, text `#F5F1E8`. All links + auth buttons in drawer.

**No search icon** in nav (excluded per design review).

---

## 2. Home Page

### Hero Section

Dark background `#2c2420`, full-width.

**Left column:**
- Eyebrow tag: "Views from the Global South" — translation key `home.subtitle`
- Headline: "UNTOLD" — translation key `home.title` (styled large, Audiowide)
- Sub-headline: add key `home.heroTagline` = `"Stories that don't make the front page."`
- Two CTA buttons:
  - "Start Reading" → `/articles` — gradient rust — new key `home.ctaRead`
  - "Explore Content" → `/articles` — ghost style — new key `home.ctaExplore`

**Right column — Featured article card:**
- Query: `SELECT … FROM content WHERE type='article' AND status='published' AND is_featured=true ORDER BY published_at DESC LIMIT 1`
- Card shows: cover image (16:9), category tag badge, title, author name
- If no featured article exists: hero renders left column only (right column omitted, left column centered)

### Content Sections (5 sections)

Order: Featured Articles, Videos, Podcasts, Knowledge Pills, Courses & Training.

**Section heading + "View all →" link** (right-aligned) to corresponding listing page.

Each section fetches **4** latest published items via Supabase server component query. Join: `content` + `content_translations` (matching locale) + `profiles` (author display_name, slug, avatar_url).

If a section returns 0 items → hide the entire section (no placeholder, no heading).

Each section wrapped in `<Suspense fallback={<SectionSkeleton />}` where `SectionSkeleton` is a new simple component: 4 skeleton card divs, `animate-pulse`, `bg-[#2c2420]/10`, matching card aspect ratio.

**New i18n keys to add in `home`:**
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

---

## 3. Missing Index Listing Pages

The detail pages (`/[locale]/videos/[slug]`, `/[locale]/podcasts/[slug]`, etc.) already exist and must **not be changed**. Only the index pages are missing.

All new files live under `app/[locale]/`:

| Page | File | Type filter | Page size | Heading key | Description key |
|------|------|-------------|-----------|-------------|-----------------|
| Videos | `videos/page.tsx` | `video` | 12 | `nav.videos` | new: `listings.videosDesc` |
| Podcasts | `podcasts/page.tsx` | `podcast` | 12 | `nav.podcasts` | new: `listings.podcastsDesc` |
| Pills | `pills/page.tsx` | `pill` | 12 | `nav.pills` | new: `listings.pillsDesc` |
| Courses | `courses/page.tsx` | `course` | 12 | `nav.courses` | new: `listings.coursesDesc` |

**New i18n keys in `listings` namespace:**
```json
"videosDesc": "Watch videos from journalists and creators across the Global South.",
"podcastsDesc": "Listen to audio stories and conversations.",
"pillsDesc": "Bite-sized knowledge to expand your perspective.",
"coursesDesc": "Structured learning from Global South practitioners."
```

**Articles page stays at `PAGE_SIZE = 20`** — no change.

Each listing page follows the exact same structure as `app/[locale]/articles/page.tsx`:
- Server Component, `getNavProps()` called in parallel with data query
- `<Navigation>` + `<Footer>` wrapper
- Heading + description
- `grid md:grid-cols-2 lg:grid-cols-3 gap-6` grid of `<ContentCard>`s
- Prev/Next pagination matching the articles page implementation
- Empty state: `<p>No [content type] yet.</p>` when count = 0

Supabase query shape (same as articles page, adapted per type):
```ts
.from('content')
.select(`
  id, slug, type, is_featured, likes_count, published_at, cover_image_url,
  read_time_minutes,
  profiles!author_id ( display_name, slug, role, avatar_url ),
  content_translations ( title, excerpt, locale ),
  content_tags ( tags ( names ) )
`, { count: 'exact' })
.eq('type', '<type>')
.eq('status', 'published')
.order('published_at', { ascending: false })
.range(offset, offset + PAGE_SIZE - 1)
```

**`categoryTag` locale resolution:** After fetching, resolve the first tag name for the active locale:
```ts
const firstTag = article.content_tags?.[0]?.tags
const categoryTag = firstTag
  ? (firstTag.names[locale] ?? firstTag.names['en'] ?? Object.values(firstTag.names)[0] ?? null)
  : null
```
If no tags: `categoryTag = null`, and the badge is not rendered.

---

## 4. ContentCard Redesign

### New props (added to existing interface)

```ts
contentId: string          // content.id — required for bookmark
authorAvatarUrl?: string | null  // profiles.avatar_url
categoryTag?: string | null      // first tag name, locale-resolved (see below); omit if no tags
readTimeMinutes?: number | null  // articles only — see below
isBookmarked?: boolean           // pre-resolved server-side
isFeatured?: boolean             // content.is_featured
```

Remove `id` from any drafts — use `contentId` instead.

### Read time

**New migration:** Add column `read_time_minutes integer` to `content` table (nullable, default null).

**Populated on save:** In the article save server action, after saving `content_translations.body` (TipTap JSON), compute:
```ts
function computeReadTime(body: JSONContent): number {
  const text = extractText(body) // recursive walk of TipTap doc nodes
  const wordCount = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / 200))
}
```
Store result in `content.read_time_minutes`.

**Listing query:** Add `read_time_minutes` to the `content` select. No body JSON is fetched in listing queries.

For non-article types: `readTimeMinutes` is always null and not rendered.

### Bookmark

**Server-side resolution:** `getNavProps()` returns `{ isLoggedIn, userRole }` — it does not expose `user.id`. Extend it to also return `userId: string | null` (from `user.id` before the profile query). All pages already call `getNavProps()`, so `userId` is available without an extra auth call.

Before rendering the card list, fetch the authenticated user's bookmarks in a single batch query:
```ts
const bookmarkedIds = new Set<string>()
if (navProps.userId) {
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('content_id')
    .eq('user_id', navProps.userId)
    .in('content_id', contentIds)
  bookmarks?.forEach(b => bookmarkedIds.add(b.content_id))
}
```
Pass `isBookmarked={bookmarkedIds.has(article.id)}` to each card. If user not authenticated, always `false`.

**`BookmarkButton` (new client island):**
- Props: `contentId: string`, `initialIsBookmarked: boolean`
- Optimistic: toggle local state immediately on click, call existing bookmark server action
- Renders a bookmark icon (outline when not bookmarked, filled when bookmarked)
- If not logged in, redirect to `/auth/login` on click

### Card layout

The card shell (`ContentCard`) remains a Server Component. Client islands (`BookmarkButton`, `LikeButton`) are passed as children or rendered inline with `"use client"`.

```
┌──────────────────────────────┐
│ [cover image 16:9]           │
│ ★ featured    [Article badge]│  ← absolute overlays on image
│ [Category tag]               │
├──────────────────────────────┤
│ Title                        │
│ [avatar] Author · 5 min read │
│ ♥ 12             [bookmark]  │
└──────────────────────────────┘
```

**Featured star badge:** top-left of image, shown only when `isFeatured = true`. Style: gold `#F5C518` star icon or ★ character.

**Type badge:** top-right of image. Style: rust background, white text, `JetBrains Mono 11px`, small padding.

**Category tag:** bottom-left of image (absolute). Style: dark semi-transparent background, white text, `12px`.

**Author row:** 24×24 avatar (rounded-full). If `authorAvatarUrl` is null: render initials (first letter of display name) with `bg-[#8b4513]` background, white text. Author name links to `/author/[authorSlug]`.

**Read time:** shown inline in author row after `·` separator. Only for articles. Translation key: `content.readTime` (`"{minutes} min read"` — already exists).

**Likes:** `♥ {count}` — already exists. Keep existing logic.

**Bookmark icon:** `BookmarkButton` client island, right side of bottom row. Uses `lucide-react` Bookmark icon.

### Callers to update

All pages that render `<ContentCard>` must:
1. Add `avatar_url` to the profiles join in their Supabase query
2. Resolve bookmarks via batch query (if user is logged in)
3. Pass new props: `contentId`, `authorAvatarUrl`, `isBookmarked`, `isFeatured`

Affected files: `app/[locale]/articles/page.tsx`, all 4 new listing pages, home page sections.

---

## 5. Non-Goals

- Search functionality
- Author profile page redesign (already exists)
- Admin dashboard UI changes
- Comment system
- Notification system

---

## 6. Testing

After each workstream, verify with Playwright:

**Navigation:**
1. Renders with two rows, dark background (`#2c2420`)
2. Row 1: UNTOLD logo + 5 nav links visible
3. Row 2: locale pill + "Log in" + "Sign up" visible (unauthenticated)
4. Logged-in creator (test@untold.ink / author role): sees "Dashboard" + "Create" in Row 2, not "Log in"/"Sign up"
5. Logged-in reader (reader@untold.ink): sees locale pill in Row 2 only — no Dashboard, no Create, no Log in/Sign up

**Home page:**
1. Hero headline and CTA buttons render
2. At least one content section (e.g. "Featured Articles") visible when data exists
3. If no featured article: hero renders without right card, no error

**Listing pages:**
1. `/en/videos`, `/en/podcasts`, `/en/pills`, `/en/courses` all return HTTP 200
2. Each page renders heading and either cards or empty state message

**ContentCard:**
1. Author name visible on card
2. Bookmark icon visible on card
3. Featured star visible on a card where `is_featured = true`
