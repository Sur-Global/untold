# Content Creation Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add creation and editing UI for all five content types (article, video, podcast, pill, course) plus a unified creator dashboard showing all content.

**Architecture:** Generic `publishContent`/`unpublishContent`/`deleteContent` server actions in `lib/actions/content.ts` work for any type. Type-specific `create*`/`update*` actions live in per-type files. `/create` becomes a type picker; each type gets its own create and edit page. A new `/dashboard` page aggregates all content types via a single query.

**Tech Stack:** Next.js 16 App Router, Supabase SSR (`createServerClient`), next-intl v4, Tiptap v3 (pill body), lucide-react icons, Tailwind, shadcn/ui components.

---

## File Map

**New files:**
- `lib/actions/content.ts` — generic publish/unpublish/delete for any content type
- `lib/actions/video.ts` — createVideo, updateVideo
- `lib/actions/podcast.ts` — createPodcast, updatePodcast
- `lib/actions/pill.ts` — createPill, updatePill
- `lib/actions/course.ts` — createCourse, updateCourse
- `app/[locale]/create/article/page.tsx` — article create page (moved)
- `app/[locale]/create/article/CreateArticleForm.tsx` — article form (moved)
- `app/[locale]/create/video/page.tsx`
- `app/[locale]/create/video/CreateVideoForm.tsx`
- `app/[locale]/create/podcast/page.tsx`
- `app/[locale]/create/podcast/CreatePodcastForm.tsx`
- `app/[locale]/create/pill/page.tsx`
- `app/[locale]/create/pill/CreatePillForm.tsx`
- `app/[locale]/create/course/page.tsx`
- `app/[locale]/create/course/CreateCourseForm.tsx`
- `app/[locale]/dashboard/page.tsx` — unified creator dashboard
- `app/[locale]/dashboard/DeleteContentButton.tsx` — client delete component
- `app/[locale]/dashboard/videos/[id]/edit/page.tsx`
- `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx`
- `app/[locale]/dashboard/podcasts/[id]/edit/page.tsx`
- `app/[locale]/dashboard/podcasts/[id]/edit/EditPodcastForm.tsx`
- `app/[locale]/dashboard/pills/[id]/edit/page.tsx`
- `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx`
- `app/[locale]/dashboard/courses/[id]/edit/page.tsx`
- `app/[locale]/dashboard/courses/[id]/edit/EditCourseForm.tsx`
- `tests/e2e/content-creation.spec.ts`

**Modified files:**
- `lib/utils.ts` — add `getEditPath(type, id)`
- `tests/unit/lib/utils.test.ts` — add `getEditPath` tests
- `messages/en.json` — add `create` namespace + extend `dashboard` and `editor` namespaces
- `app/[locale]/create/page.tsx` — convert to type picker (replaces article-only page)

**Deleted files:**
- `app/[locale]/create/CreateArticleForm.tsx` — moved to `create/article/`

---

## Task 1: `getEditPath` utility + unit test

**Files:**
- Modify: `lib/utils.ts`
- Modify: `tests/unit/lib/utils.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/lib/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { slugify, readTime, cn, getEditPath } from '@/lib/utils'

// ... keep existing tests ...

describe('getEditPath', () => {
  it('returns article edit path', () => {
    expect(getEditPath('article', 'abc')).toBe('/dashboard/articles/abc/edit')
  })
  it('returns video edit path', () => {
    expect(getEditPath('video', 'abc')).toBe('/dashboard/videos/abc/edit')
  })
  it('returns podcast edit path', () => {
    expect(getEditPath('podcast', 'abc')).toBe('/dashboard/podcasts/abc/edit')
  })
  it('returns pill edit path', () => {
    expect(getEditPath('pill', 'abc')).toBe('/dashboard/pills/abc/edit')
  })
  it('returns course edit path', () => {
    expect(getEditPath('course', 'abc')).toBe('/dashboard/courses/abc/edit')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/unit/lib/utils.test.ts
```

Expected: FAIL — `getEditPath is not exported`

- [ ] **Step 3: Implement `getEditPath` in `lib/utils.ts`**

Add `import type { ContentType } from '@/lib/supabase/types'` to the **top of the file** (alongside the existing clsx/twMerge imports), then add the following after the `readTime` function:

```typescript
const TYPE_SEGMENT: Record<ContentType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

export function getEditPath(type: ContentType, id: string): string {
  return `/dashboard/${TYPE_SEGMENT[type]}/${id}/edit`
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/lib/utils.test.ts
```

Expected: 5 new tests PASS alongside existing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts tests/unit/lib/utils.test.ts
git commit -m "feat: add getEditPath utility for content type routing"
```

---

## Task 2: i18n keys for new content types

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Write the failing test (build check)**

Before editing, verify the build reports no missing i18n keys by confirming the current baseline passes:

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 2: Add i18n keys to `messages/en.json`**

Replace the entire file contents with the updated version:

```json
{
  "nav": {
    "articles": "Articles",
    "videos": "Videos",
    "podcasts": "Podcasts",
    "pills": "Knowledge Pills",
    "courses": "Courses",
    "about": "About",
    "login": "Log in",
    "signup": "Sign up",
    "createContent": "Create",
    "dashboard": "Dashboard",
    "logout": "Log out"
  },
  "home": {
    "title": "UNTOLD",
    "subtitle": "Views from the Global South",
    "featuredArticles": "Featured Articles",
    "latestStories": "The latest stories"
  },
  "auth": {
    "loginTitle": "Welcome back",
    "signupTitle": "Join UNTOLD",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "loginButton": "Log in",
    "signupButton": "Sign up",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "confirmEmail": "Check your email to confirm your account.",
    "completeProfileTitle": "Set up your profile",
    "displayNameLabel": "Display name",
    "slugLabel": "Username",
    "slugHint": "Your public URL: untold.ink/@{slug}",
    "saveProfile": "Save and continue"
  },
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Enter a valid email address",
    "passwordTooShort": "Password must be at least 8 characters",
    "slugTaken": "This username is already taken",
    "slugInvalid": "Only letters, numbers, and hyphens"
  },
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
  },
  "create": {
    "pickType": "What are you creating?",
    "article": "Article",
    "articleDesc": "Written piece with rich text",
    "video": "Video",
    "videoDesc": "Embedded video with description",
    "podcast": "Podcast",
    "podcastDesc": "Audio episode with show notes",
    "pill": "Knowledge Pill",
    "pillDesc": "Bite-sized knowledge in a colorful card",
    "course": "Course",
    "courseDesc": "Structured curriculum with pricing"
  },
  "dashboard": {
    "myContent": "My Content",
    "newContent": "Create",
    "noContent": "You haven't created anything yet.",
    "deleteContent": "Delete",
    "editContent": "Edit",
    "deleteContentConfirm": "Delete this item? This cannot be undone.",
    "myArticles": "My Articles",
    "newArticle": "New Article",
    "draft": "Draft",
    "published": "Published",
    "editArticle": "Edit article",
    "deleteArticle": "Delete article",
    "deleteConfirm": "Delete this article? This cannot be undone.",
    "noArticles": "You haven't written anything yet.",
    "publish": "Publish",
    "unpublish": "Unpublish",
    "saveChanges": "Save changes",
    "saving": "Saving\u2026",
    "saveAsDraft": "Save as draft"
  },
  "editor": {
    "titlePlaceholder": "Title",
    "excerptPlaceholder": "Short summary shown in listings (optional)",
    "coverImagePlaceholder": "Cover image URL (optional)",
    "bodyPlaceholder": "Start writing\u2026",
    "newArticle": "New article",
    "newVideo": "New video",
    "newPodcast": "New podcast",
    "newPill": "New knowledge pill",
    "newCourse": "New course",
    "backToDashboard": "\u2190 Dashboard",
    "backToCreate": "\u2190 Create",
    "embedUrlLabel": "Embed URL",
    "embedUrlPlaceholder": "YouTube, Spotify, etc.",
    "thumbnailUrlPlaceholder": "Thumbnail URL (optional)",
    "durationPlaceholder": "Duration (e.g. 45:00)",
    "episodeNumberPlaceholder": "Episode number (optional)",
    "accentColorLabel": "Accent color",
    "imageUrlPlaceholder": "Image URL (optional)",
    "priceLabel": "Price",
    "pricePlaceholder": "0.00",
    "currencyLabel": "Currency",
    "descriptionPlaceholder": "Description (optional)"
  }
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors (pre-existing errors from Navigation/LocaleSwitcher are OK).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json
git commit -m "feat: add i18n keys for content creation and unified dashboard"
```

---

## Task 3: Generic content actions (`lib/actions/content.ts`)

**Files:**
- Create: `lib/actions/content.ts`

- [ ] **Step 1: Create `lib/actions/content.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'

export async function publishContent(id: string, _formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  // 'layout' invalidates /dashboard and all nested pages (edit pages included)
  revalidatePath('/dashboard', 'layout')
}

export async function unpublishContent(id: string, _formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard', 'layout')
}

export async function deleteContent(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "actions/content" | head -10
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/content.ts
git commit -m "feat: add generic publishContent/unpublishContent/deleteContent server actions"
```

---

## Task 4: Video and Podcast actions

**Files:**
- Create: `lib/actions/video.ts`
- Create: `lib/actions/podcast.ts`

- [ ] **Step 1: Create `lib/actions/video.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createVideo(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const thumbnailUrl = (formData.get('thumbnail_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'video',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: thumbnailUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create video')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: 'en',
      title,
      description,
      body: null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save video translation')

  const { error: metaError } = await (supabase as any)
    .from('video_meta')
    .insert({
      content_id: content.id,
      embed_url: embedUrl,
      thumbnail_url: thumbnailUrl,
      duration,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save video metadata')

  revalidatePath('/dashboard')
  redirect(`/dashboard/videos/${content.id}/edit`)
}

export async function updateVideo(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const thumbnailUrl = (formData.get('thumbnail_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null

  await (supabase as any)
    .from('content')
    .update({ cover_image_url: thumbnailUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: 'en', title, description, body: null },
      { onConflict: 'content_id,locale' }
    )

  await (supabase as any)
    .from('video_meta')
    .upsert(
      { content_id: id, embed_url: embedUrl, thumbnail_url: thumbnailUrl, duration },
      { onConflict: 'content_id' }
    )

  revalidatePath(`/dashboard/videos/${id}/edit`)
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: Create `lib/actions/podcast.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createPodcast(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null
  const episodeNumber = (formData.get('episode_number') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'podcast',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: coverImageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create podcast')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: 'en',
      title,
      description,
      body: null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save podcast translation')

  const { error: metaError } = await (supabase as any)
    .from('podcast_meta')
    .insert({
      content_id: content.id,
      embed_url: embedUrl,
      cover_image_url: coverImageUrl,
      duration,
      episode_number: episodeNumber,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save podcast metadata')

  revalidatePath('/dashboard')
  redirect(`/dashboard/podcasts/${content.id}/edit`)
}

export async function updatePodcast(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null
  const episodeNumber = (formData.get('episode_number') as string)?.trim() || null

  await (supabase as any)
    .from('content')
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: 'en', title, description, body: null },
      { onConflict: 'content_id,locale' }
    )

  await (supabase as any)
    .from('podcast_meta')
    .upsert(
      { content_id: id, embed_url: embedUrl, cover_image_url: coverImageUrl, duration, episode_number: episodeNumber },
      { onConflict: 'content_id' }
    )

  revalidatePath(`/dashboard/podcasts/${id}/edit`)
  revalidatePath('/dashboard')
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "actions/(video|podcast)" | head -10
```

Expected: no errors for these files.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/video.ts lib/actions/podcast.ts
git commit -m "feat: add createVideo/updateVideo and createPodcast/updatePodcast server actions"
```

---

## Task 5: Pill and Course actions

**Files:**
- Create: `lib/actions/pill.ts`
- Create: `lib/actions/course.ts`

- [ ] **Step 1: Create `lib/actions/pill.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createPill(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const body = formData.get('body') as string | null
  const accentColor = (formData.get('accent_color') as string)?.trim() || '#C45D3A'
  const imageUrl = (formData.get('image_url') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'pill',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: imageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create pill')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: 'en',
      title,
      body: body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save pill translation')

  const { error: metaError } = await (supabase as any)
    .from('pill_meta')
    .insert({
      content_id: content.id,
      accent_color: accentColor,
      image_url: imageUrl,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save pill metadata')

  revalidatePath('/dashboard')
  redirect(`/dashboard/pills/${content.id}/edit`)
}

export async function updatePill(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const body = formData.get('body') as string | null
  const accentColor = (formData.get('accent_color') as string)?.trim() || '#C45D3A'
  const imageUrl = (formData.get('image_url') as string)?.trim() || null

  await (supabase as any)
    .from('content')
    .update({ cover_image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      {
        content_id: id,
        locale: 'en',
        title,
        body: body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null,
      },
      { onConflict: 'content_id,locale' }
    )

  await (supabase as any)
    .from('pill_meta')
    .upsert(
      { content_id: id, accent_color: accentColor, image_url: imageUrl },
      { onConflict: 'content_id' }
    )

  revalidatePath(`/dashboard/pills/${id}/edit`)
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: Create `lib/actions/course.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createCourse(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const price = parseFloat((formData.get('price') as string) || '0') || 0
  const currency = (formData.get('currency') as string)?.trim() || 'USD'
  const duration = (formData.get('duration') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'course',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: coverImageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create course')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: 'en',
      title,
      description,
      body: null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save course translation')

  const { error: metaError } = await (supabase as any)
    .from('course_meta')
    .insert({
      content_id: content.id,
      price,
      currency,
      duration,
      students_count: 0,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save course metadata')

  revalidatePath('/dashboard')
  redirect(`/dashboard/courses/${content.id}/edit`)
}

export async function updateCourse(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const price = parseFloat((formData.get('price') as string) || '0') || 0
  const currency = (formData.get('currency') as string)?.trim() || 'USD'
  const duration = (formData.get('duration') as string)?.trim() || null

  await (supabase as any)
    .from('content')
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: 'en', title, description, body: null },
      { onConflict: 'content_id,locale' }
    )

  await (supabase as any)
    .from('course_meta')
    .upsert(
      { content_id: id, price, currency, duration },
      { onConflict: 'content_id' }
    )

  revalidatePath(`/dashboard/courses/${id}/edit`)
  revalidatePath('/dashboard')
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "actions/(pill|course)" | head -10
```

Expected: no errors for these files.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/pill.ts lib/actions/course.ts
git commit -m "feat: add createPill/updatePill and createCourse/updateCourse server actions"
```

---

## Task 6: Convert `/create` to type picker + move article form

**Files:**
- Modify: `app/[locale]/create/page.tsx`
- Create: `app/[locale]/create/article/page.tsx`
- Create: `app/[locale]/create/article/CreateArticleForm.tsx` (same content as current `create/CreateArticleForm.tsx`)
- Delete: `app/[locale]/create/CreateArticleForm.tsx`

- [ ] **Step 1: Create `/create/article/CreateArticleForm.tsx`**

This is the same component as the existing `create/CreateArticleForm.tsx`. Copy its content verbatim:

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateArticleForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => createArticle(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          placeholder={t('titlePlaceholder')}
          required
          className="text-xl font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Input
          id="excerpt"
          name="excerpt"
          placeholder={t('excerptPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          placeholder={t('coverImagePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('bodyPlaceholder')}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="gradient-rust text-white border-0"
      >
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create `/create/article/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { CreateArticleForm } from './CreateArticleForm'

export default async function CreateArticlePage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/create" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToCreate')}
        </Link>
        <h1 className="mb-8">{t('newArticle')}</h1>
        <CreateArticleForm />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Update `/create/page.tsx` to be the type picker**

Replace the entire content of `app/[locale]/create/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { FileText, Video, Mic, Zap, BookOpen } from 'lucide-react'

const CONTENT_TYPES = [
  { key: 'article', href: '/create/article', Icon: FileText },
  { key: 'video', href: '/create/video', Icon: Video },
  { key: 'podcast', href: '/create/podcast', Icon: Mic },
  { key: 'pill', href: '/create/pill', Icon: Zap },
  { key: 'course', href: '/create/course', Icon: BookOpen },
] as const

export default async function CreatePickerPage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('create')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="mb-10 text-center">{t('pickType')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTENT_TYPES.map(({ key, href, Icon }) => (
            <Link
              key={key}
              href={href}
              className="group flex items-start gap-4 p-5 rounded-xl transition-colors"
              style={{
                border: '1px solid rgba(139,69,19,0.2)',
                background: 'rgba(245,241,232,0.5)',
              }}
            >
              <Icon
                size={24}
                className="mt-0.5 shrink-0 text-[#C45D3A] group-hover:text-[#A04030] transition-colors"
              />
              <div>
                <p className="font-semibold leading-tight">
                  {t(key as 'article' | 'video' | 'podcast' | 'pill' | 'course')}
                </p>
                <p className="text-sm text-[#6B5F58] mt-1">
                  {t(`${key}Desc` as 'articleDesc' | 'videoDesc' | 'podcastDesc' | 'pillDesc' | 'courseDesc')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 4: Delete `app/[locale]/create/CreateArticleForm.tsx`**

Use `git rm` so the deletion is immediately staged:

```bash
git rm "app/[locale]/create/CreateArticleForm.tsx"
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "create/" | head -10
```

Expected: no errors in create pages.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/create/
git commit -m "feat: convert /create to type picker, move article form to /create/article"
```

---

## Task 7: Create Video and Podcast forms

**Files:**
- Create: `app/[locale]/create/video/page.tsx`
- Create: `app/[locale]/create/video/CreateVideoForm.tsx`
- Create: `app/[locale]/create/podcast/page.tsx`
- Create: `app/[locale]/create/podcast/CreatePodcastForm.tsx`

- [ ] **Step 1: Create `app/[locale]/create/video/CreateVideoForm.tsx`**

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createVideo } from '@/lib/actions/video'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateVideoForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => createVideo(new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input id="embed_url" name="embed_url" type="url" placeholder={t('embedUrlPlaceholder')} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
        <Input id="thumbnail_url" name="thumbnail_url" type="url" placeholder={t('thumbnailUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} />
      </div>

      <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/create/video/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { CreateVideoForm } from './CreateVideoForm'

export default async function CreateVideoPage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/create" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToCreate')}
        </Link>
        <h1 className="mb-8">{t('newVideo')}</h1>
        <CreateVideoForm />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/create/podcast/CreatePodcastForm.tsx`**

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createPodcast } from '@/lib/actions/podcast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreatePodcastForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => createPodcast(new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input id="embed_url" name="embed_url" type="url" placeholder={t('embedUrlPlaceholder')} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input id="cover_image_url" name="cover_image_url" type="url" placeholder={t('coverImagePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="episode_number">Episode number</Label>
        <Input id="episode_number" name="episode_number" placeholder={t('episodeNumberPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} />
      </div>

      <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create `app/[locale]/create/podcast/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { CreatePodcastForm } from './CreatePodcastForm'

export default async function CreatePodcastPage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/create" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToCreate')}
        </Link>
        <h1 className="mb-8">{t('newPodcast')}</h1>
        <CreatePodcastForm />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "create/(video|podcast)" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/create/video/ app/\[locale\]/create/podcast/
git commit -m "feat: add create video and podcast pages with forms"
```

---

## Task 8: Create Pill and Course forms

**Files:**
- Create: `app/[locale]/create/pill/page.tsx`
- Create: `app/[locale]/create/pill/CreatePillForm.tsx`
- Create: `app/[locale]/create/course/page.tsx`
- Create: `app/[locale]/create/course/CreateCourseForm.tsx`

- [ ] **Step 1: Create `app/[locale]/create/pill/CreatePillForm.tsx`**

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createPill } from '@/lib/actions/pill'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreatePillForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => createPill(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label>{t('accentColorLabel')}</Label>
        <div className="flex items-center gap-3">
          <input
            id="accent_color"
            name="accent_color"
            type="color"
            defaultValue="#C45D3A"
            className="w-10 h-10 rounded cursor-pointer border border-[rgba(139,69,19,0.2)]"
          />
          <span className="text-sm text-[#6B5F58]">Pick the pill accent color</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" type="url" placeholder={t('imageUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>Body *</Label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('bodyPlaceholder')}
        />
      </div>

      <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/create/pill/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { CreatePillForm } from './CreatePillForm'

export default async function CreatePillPage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/create" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToCreate')}
        </Link>
        <h1 className="mb-8">{t('newPill')}</h1>
        <CreatePillForm />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/create/course/CreateCourseForm.tsx`**

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createCourse } from '@/lib/actions/course'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateCourseForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => createCourse(new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input id="cover_image_url" name="cover_image_url" type="url" placeholder={t('coverImagePlaceholder')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('priceLabel')}</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue="0" placeholder={t('pricePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t('currencyLabel')}</Label>
          <Input id="currency" name="currency" defaultValue="USD" maxLength={3} placeholder="USD" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} />
      </div>

      <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create `app/[locale]/create/course/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { CreateCourseForm } from './CreateCourseForm'

export default async function CreateCoursePage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/create" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToCreate')}
        </Link>
        <h1 className="mb-8">{t('newCourse')}</h1>
        <CreateCourseForm />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "create/(pill|course)" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/create/pill/ app/\[locale\]/create/course/
git commit -m "feat: add create pill and course pages with forms"
```

---

## Task 9: Unified Dashboard page

**Files:**
- Create: `app/[locale]/dashboard/page.tsx`
- Create: `app/[locale]/dashboard/DeleteContentButton.tsx`

- [ ] **Step 1: Create `app/[locale]/dashboard/DeleteContentButton.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'

export function DeleteContentButton({ id }: { id: string }) {
  const td = useTranslations('dashboard')
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700"
      disabled={isPending}
      onClick={() => {
        if (confirm(td('deleteContentConfirm'))) {
          startTransition(() => deleteContent(id))
        }
      }}
    >
      {td('deleteContent')}
    </Button>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/dashboard/page.tsx`**

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn, getEditPath } from '@/lib/utils'
import { publishContent, unpublishContent } from '@/lib/actions/content'
import { DeleteContentButton } from './DeleteContentButton'
import type { ContentType } from '@/lib/supabase/types'

const TYPE_LABEL: Record<ContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  pill: 'Pill',
  course: 'Course',
}

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === 'published'
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{
        background: isPublished ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
        color: isPublished ? '#16a34a' : '#A0522D',
      }}
    >
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[rgba(196,93,58,0.1)] text-[#C45D3A]">
      {TYPE_LABEL[type]}
    </span>
  )
}

export default async function DashboardPage() {
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('dashboard')

  const { data: items } = await (supabase as any)
    .from('content')
    .select(`
      id, type, status, created_at,
      content_translations ( title, locale )
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const getTitle = (item: any) => {
    const tr = item.content_translations?.find((tr: any) => tr.locale === 'en')
      ?? item.content_translations?.[0]
    return tr?.title ?? '(Untitled)'
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1>{t('myContent')}</h1>
          <Link href="/create" className={cn(buttonVariants(), 'gradient-rust text-white border-0')}>
            {t('newContent')}
          </Link>
        </div>

        {(!items || items.length === 0) ? (
          <p className="text-[#6B5F58]">{t('noContent')}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item: any) => (
              <li
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ border: '1px solid rgba(139,69,19,0.15)', background: 'rgba(245,241,232,0.5)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getTitle(item)}</p>
                  <p className="text-xs text-[#6B5F58] font-mono mt-0.5">
                    {new Date(item.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />

                <div className="flex items-center gap-2">
                  <Link
                    href={getEditPath(item.type, item.id)}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    {t('editContent')}
                  </Link>

                  {item.status === 'draft' ? (
                    <form action={publishContent.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('publish')}</Button>
                    </form>
                  ) : (
                    <form action={unpublishContent.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('unpublish')}</Button>
                    </form>
                  )}

                  <DeleteContentButton id={item.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "dashboard/page\|DeleteContentButton" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/dashboard/page.tsx app/\[locale\]/dashboard/DeleteContentButton.tsx
git commit -m "feat: add unified creator dashboard showing all content types"
```

---

## Task 10: Edit Video and Podcast pages

**Files:**
- Create: `app/[locale]/dashboard/videos/[id]/edit/page.tsx`
- Create: `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx`
- Create: `app/[locale]/dashboard/podcasts/[id]/edit/page.tsx`
- Create: `app/[locale]/dashboard/podcasts/[id]/edit/EditPodcastForm.tsx`

- [ ] **Step 1: Create `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx`**

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateVideo } from '@/lib/actions/video'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditVideoFormProps {
  id: string
  status: string
  initialTitle: string
  initialDescription: string
  initialEmbedUrl: string
  initialThumbnailUrl: string
  initialDuration: string
}

export function EditVideoForm({
  id, status, initialTitle, initialDescription,
  initialEmbedUrl, initialThumbnailUrl, initialDuration,
}: EditVideoFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => updateVideo(id, new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input id="embed_url" name="embed_url" type="url" defaultValue={initialEmbedUrl} placeholder={t('embedUrlPlaceholder')} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={initialDescription} placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
        <Input id="thumbnail_url" name="thumbnail_url" type="url" defaultValue={initialThumbnailUrl} placeholder={t('thumbnailUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" defaultValue={initialDuration} placeholder={t('durationPlaceholder')} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => publishContent(id, new FormData()))}>
            {td('publish')}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}>
            {td('unpublish')}
          </Button>
        )}

        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => { if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id)) }}>
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/dashboard/videos/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditVideoForm } from './EditVideoForm'

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, status, cover_image_url,
      content_translations ( title, description, locale ),
      video_meta ( embed_url, thumbnail_url, duration )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'video')
    .single()

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
  const meta = content.video_meta?.[0] ?? content.video_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/dashboard" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToDashboard')}
        </Link>
        <h1 className="mb-8">{tr?.title ?? '(Untitled)'}</h1>
        <EditVideoForm
          id={id}
          status={content.status}
          initialTitle={tr?.title ?? ''}
          initialDescription={tr?.description ?? ''}
          initialEmbedUrl={meta.embed_url ?? ''}
          initialThumbnailUrl={meta.thumbnail_url ?? ''}
          initialDuration={meta.duration ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/dashboard/podcasts/[id]/edit/EditPodcastForm.tsx`**

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updatePodcast } from '@/lib/actions/podcast'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditPodcastFormProps {
  id: string
  status: string
  initialTitle: string
  initialDescription: string
  initialEmbedUrl: string
  initialCoverImageUrl: string
  initialDuration: string
  initialEpisodeNumber: string
}

export function EditPodcastForm({
  id, status, initialTitle, initialDescription,
  initialEmbedUrl, initialCoverImageUrl, initialDuration, initialEpisodeNumber,
}: EditPodcastFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => updatePodcast(id, new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input id="embed_url" name="embed_url" type="url" defaultValue={initialEmbedUrl} placeholder={t('embedUrlPlaceholder')} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={initialDescription} placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input id="cover_image_url" name="cover_image_url" type="url" defaultValue={initialCoverImageUrl} placeholder={t('coverImagePlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="episode_number">Episode number</Label>
        <Input id="episode_number" name="episode_number" defaultValue={initialEpisodeNumber} placeholder={t('episodeNumberPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" defaultValue={initialDuration} placeholder={t('durationPlaceholder')} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => publishContent(id, new FormData()))}>
            {td('publish')}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}>
            {td('unpublish')}
          </Button>
        )}

        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => { if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id)) }}>
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Create `app/[locale]/dashboard/podcasts/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditPodcastForm } from './EditPodcastForm'

export default async function EditPodcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, status, cover_image_url,
      content_translations ( title, description, locale ),
      podcast_meta ( embed_url, cover_image_url, duration, episode_number )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'podcast')
    .single()

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
  const meta = content.podcast_meta?.[0] ?? content.podcast_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/dashboard" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToDashboard')}
        </Link>
        <h1 className="mb-8">{tr?.title ?? '(Untitled)'}</h1>
        <EditPodcastForm
          id={id}
          status={content.status}
          initialTitle={tr?.title ?? ''}
          initialDescription={tr?.description ?? ''}
          initialEmbedUrl={meta.embed_url ?? ''}
          initialCoverImageUrl={meta.cover_image_url ?? ''}
          initialDuration={meta.duration ?? ''}
          initialEpisodeNumber={meta.episode_number ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/(videos|podcasts)" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/dashboard/videos/ app/\[locale\]/dashboard/podcasts/
git commit -m "feat: add edit pages for video and podcast content types"
```

---

## Task 11: Edit Pill and Course pages

**Files:**
- Create: `app/[locale]/dashboard/pills/[id]/edit/page.tsx`
- Create: `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx`
- Create: `app/[locale]/dashboard/courses/[id]/edit/page.tsx`
- Create: `app/[locale]/dashboard/courses/[id]/edit/EditCourseForm.tsx`

- [ ] **Step 1: Create `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx`**

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updatePill } from '@/lib/actions/pill'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditPillFormProps {
  id: string
  status: string
  initialTitle: string
  initialBody: Record<string, unknown> | null
  initialAccentColor: string
  initialImageUrl: string
}

export function EditPillForm({
  id, status, initialTitle, initialBody, initialAccentColor, initialImageUrl,
}: EditPillFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(initialBody)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => updatePill(id, fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label>{t('accentColorLabel')}</Label>
        <div className="flex items-center gap-3">
          <input
            id="accent_color"
            name="accent_color"
            type="color"
            defaultValue={initialAccentColor || '#C45D3A'}
            className="w-10 h-10 rounded cursor-pointer border border-[rgba(139,69,19,0.2)]"
          />
          <span className="text-sm text-[#6B5F58]">Pick the pill accent color</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" type="url" defaultValue={initialImageUrl} placeholder={t('imageUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => publishContent(id, new FormData()))}>
            {td('publish')}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}>
            {td('unpublish')}
          </Button>
        )}

        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => { if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id)) }}>
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/dashboard/pills/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditPillForm } from './EditPillForm'

export default async function EditPillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, status,
      content_translations ( title, body, locale ),
      pill_meta ( accent_color, image_url )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'pill')
    .single()

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
  const meta = content.pill_meta?.[0] ?? content.pill_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/dashboard" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToDashboard')}
        </Link>
        <h1 className="mb-8">{tr?.title ?? '(Untitled)'}</h1>
        <EditPillForm
          id={id}
          status={content.status}
          initialTitle={tr?.title ?? ''}
          initialBody={tr?.body ?? null}
          initialAccentColor={meta.accent_color ?? '#C45D3A'}
          initialImageUrl={meta.image_url ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/dashboard/courses/[id]/edit/EditCourseForm.tsx`**

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateCourse } from '@/lib/actions/course'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditCourseFormProps {
  id: string
  status: string
  initialTitle: string
  initialDescription: string
  initialCoverImageUrl: string
  initialPrice: number
  initialCurrency: string
  initialDuration: string
}

export function EditCourseForm({
  id, status, initialTitle, initialDescription, initialCoverImageUrl,
  initialPrice, initialCurrency, initialDuration,
}: EditCourseFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => updateCourse(id, new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={initialDescription} placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input id="cover_image_url" name="cover_image_url" type="url" defaultValue={initialCoverImageUrl} placeholder={t('coverImagePlaceholder')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('priceLabel')}</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={String(initialPrice)} placeholder={t('pricePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t('currencyLabel')}</Label>
          <Input id="currency" name="currency" defaultValue={initialCurrency || 'USD'} maxLength={3} placeholder="USD" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" defaultValue={initialDuration} placeholder={t('durationPlaceholder')} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => publishContent(id, new FormData()))}>
            {td('publish')}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}>
            {td('unpublish')}
          </Button>
        )}

        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => { if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id)) }}>
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Create `app/[locale]/dashboard/courses/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditCourseForm } from './EditCourseForm'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, status,
      content_translations ( title, description, locale ),
      course_meta ( price, currency, duration )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'course')
    .single()

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
  const meta = content.course_meta?.[0] ?? content.course_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/dashboard" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToDashboard')}
        </Link>
        <h1 className="mb-8">{tr?.title ?? '(Untitled)'}</h1>
        <EditCourseForm
          id={id}
          status={content.status}
          initialTitle={tr?.title ?? ''}
          initialDescription={tr?.description ?? ''}
          initialCoverImageUrl={content.cover_image_url ?? ''}
          initialPrice={meta.price ?? 0}
          initialCurrency={meta.currency ?? 'USD'}
          initialDuration={meta.duration ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/(pills|courses)" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/dashboard/pills/ app/\[locale\]/dashboard/courses/
git commit -m "feat: add edit pages for pill and course content types"
```

---

## Task 12: Playwright smoke tests

**Files:**
- Create: `tests/e2e/content-creation.spec.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Content creation — unauthenticated guards', () => {
  const protectedRoutes = [
    '/create',
    '/create/article',
    '/create/video',
    '/create/podcast',
    '/create/pill',
    '/create/course',
    '/dashboard',
  ]

  for (const route of protectedRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login|auth\/signup/)
    })
  }
})

test.describe('Dashboard — unauthenticated guards', () => {
  const editRoutes = [
    '/dashboard/videos/fake-id/edit',
    '/dashboard/podcasts/fake-id/edit',
    '/dashboard/pills/fake-id/edit',
    '/dashboard/courses/fake-id/edit',
  ]

  for (const route of editRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/auth\/login|auth\/signup/)
    })
  }
})
```

- [ ] **Step 2: Run the tests**

```bash
npx playwright test tests/e2e/content-creation.spec.ts --reporter=line
```

Expected: All tests PASS — unauthenticated requests redirect to login.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/content-creation.spec.ts
git commit -m "test: add Playwright smoke tests for content creation and dashboard guards"
```

---

## Done

After all 12 tasks complete:

- `/create` — type picker with 5 content type cards
- `/create/article`, `/create/video`, `/create/podcast`, `/create/pill`, `/create/course` — creation forms
- `/dashboard` — unified view of all content with type badges, publish/unpublish, delete
- `/dashboard/videos/[id]/edit`, `/dashboard/podcasts/[id]/edit`, `/dashboard/pills/[id]/edit`, `/dashboard/courses/[id]/edit` — edit forms
- All mutations protected by `.eq('author_id', user.id)` IDOR guard
- Generic `publishContent`/`unpublishContent`/`deleteContent` shared across all types
- Playwright tests verify all new routes redirect when unauthenticated
