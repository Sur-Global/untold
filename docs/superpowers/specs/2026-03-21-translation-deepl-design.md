# Translation / DeepL Design Spec
**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Auto-translate all published content into 5 locales (es, pt, fr, de, da) using the DeepL API. Translations fire on publish (and re-publish after edits) as a deferred background call. An admin translations dashboard at `/admin/translations` shows per-locale status for all published content and allows manual retry of missing or failed translations.

Quechua (`qu`) is excluded from this plan entirely.

**v1 constraint:** The pipeline always translates FROM the `en` row, regardless of `content.source_locale`. If an author wrote in a non-English locale, they must also provide an English translation manually. This simplification is intentional for v1.

---

## Languages

| Locale | Mode |
|---|---|
| `en` | Source — never translated |
| `es` | Auto via DeepL |
| `pt` | Auto via DeepL |
| `fr` | Auto via DeepL |
| `de` | Auto via DeepL |
| `da` | Auto via DeepL |

Constant `SUPPORTED_LOCALES = ['es', 'pt', 'fr', 'de', 'da']` defined in `lib/deepl.ts`.

---

## Architecture

### Translation Pipeline

**Trigger:** Each publish server action uses Next.js 15's `after()` API to defer the translation call until after the response is sent:

```ts
import { after } from 'next/server'

// Inside publishArticle (and all other publish actions):
after(async () => {
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
    },
    body: JSON.stringify({ contentId: id }),
  })
})
```

`after()` runs after the response is committed. Vercel keeps the serverless function alive until it completes. This is reliable fire-and-forget on Vercel.

On re-publish, existing **auto-translated** rows are overwritten. **Manually edited rows (`is_auto_translated = false`) are never overwritten** — the pipeline skips any locale that already has a manually-authored translation.

**API route:** `app/api/translate/route.ts`
- Accepts `POST { contentId: string, locale?: string }`
- Validates `x-translate-secret` header against `TRANSLATE_API_SECRET` env var — returns 401 if missing or wrong
- Returns 400 if `contentId` is missing
- Uses a service role Supabase client (see below) to bypass RLS
- Fetches the `en` row from `content_translations` plus `content.type`
- For each target locale (all 5 if `locale` omitted, one if specified):
  - **Skips if an existing row has `is_auto_translated = false`** (manually authored — do not overwrite)
  - Translates applicable fields via `lib/deepl.ts`
  - Upserts into `content_translations` with `is_auto_translated = true`
- Errors per locale are logged and skipped — partial success is fine
- Returns `{ ok: true, translated: string[] }` (locale list that succeeded)

### Service role client — `lib/supabase/service-role.ts`

New file. The anon-key client in `lib/supabase/server.ts` is insufficient for server-side operations that must bypass RLS. This file exports a service role client for use in API routes only.

```ts
import { createClient } from '@supabase/supabase-js'

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
```

**Important:** Never import this from client components. Use only in API routes and server-only modules.

### DeepL wrapper — `lib/deepl.ts`

Thin wrapper around the DeepL REST API (no SDK — plain `fetch`).

```ts
export const SUPPORTED_LOCALES = ['es', 'pt', 'fr', 'de', 'da'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

// Maps next-intl locale codes to DeepL target language codes
const DEEPL_LANG_MAP: Record<SupportedLocale, string> = {
  es: 'ES', pt: 'PT', fr: 'FR', de: 'DE', da: 'DA',
}

// DeepL endpoint auto-detected from API key:
// keys ending in ':fx' use the free tier (api-free.deepl.com)
// all others use the Pro tier (api.deepl.com)
function getDeepLBaseUrl(apiKey: string): string {
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2'
}

// Translates an array of strings in one DeepL API call.
// Returns translated strings in the same order.
export async function translateTexts(
  texts: string[],
  targetLocale: SupportedLocale
): Promise<string[]>
```

- Single API call per locale (all fields batched as array)
- Throws on non-2xx response

### Tiptap JSON text walker — `lib/tiptap-translate.ts`

Tiptap JSON bodies (articles, pills) require a recursive tree walk to extract and re-inject text content without disturbing structure or marks.

```ts
// Extracts all translatable text leaf values.
// Skips nodes of type 'codeBlock' and marks of type 'code'.
export function extractTextNodes(doc: TiptapDoc): { texts: string[]; paths: Path[] }

// Re-injects translated strings at the same paths.
export function injectTextNodes(doc: TiptapDoc, translations: string[], paths: Path[]): TiptapDoc
```

`Path` is `number[]` — index path from root to the text node. The two functions are inverses; the translated array must be the same length as the extracted array.

**Skipped node types:** `codeBlock`, any node with mark type `code`. Link `href` attributes are never translated — only the visible text content.

### Fields translated per content type

| Type | title | excerpt | description | body (Tiptap walk) |
|---|---|---|---|---|
| article | ✓ | ✓ | — | ✓ |
| video | ✓ | — | ✓ | — |
| podcast | ✓ | — | ✓ | — |
| pill | ✓ | — | — | ✓ |
| course | ✓ | — | ✓ | — |

---

## Admin Translations UI

### Route: `/admin/translations`

Server component. Requires admin role. Fetches the 50 most recently published content items (ordered by `published_at DESC`) joined with their `content_translations` rows. Renders a table:

| Column | Content |
|---|---|
| Title | English title + content type badge |
| Published | Published date |
| en / es / pt / fr / de / da | Per-locale status icon |

**Status icons:**
- ✓ green — auto-translated (`is_auto_translated = true`)
- ✓ blue — manual override (`is_auto_translated = false`, locale ≠ `en`)
- ✗ red + "Translate" button — no row exists for this locale

### Components

**`components/admin/TranslateButton.tsx`** (`'use client'`)
- Props: `contentId: string`, `locale: string`
- On click: calls the `retranslate` Server Action (see below)
- Shows loading spinner during call
- Calls `router.refresh()` on success to re-fetch server component data
- Shows error message inline on failure

**`lib/actions/translate.ts`** (new Server Action)
- `retranslate(contentId, locale)` — server action callable from `TranslateButton`
- Calls `fetch('/api/translate', { ..., headers: { 'x-translate-secret': process.env.TRANSLATE_API_SECRET! } })` with the secret
- The secret is a server-only env var; it never reaches the client this way
- Throws on error so the client component can catch and display it

This pattern keeps the secret server-side while allowing a client component to trigger translation.

### Auth guard — `lib/require-admin.ts`

```ts
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')
  return { user }
}
```

### Admin layout — `app/[locale]/admin/layout.tsx`

Minimal layout: simple "Admin" header. Plan 7 (Admin Dashboard) will replace this with the full admin nav sidebar.

---

## Publish Actions

Only `publishArticle` exists in `lib/actions/article.ts`. The other content types need publish actions created:

- `publishVideo(id)` in `lib/actions/video.ts`
- `publishPodcast(id)` in `lib/actions/podcast.ts`
- `publishPill(id)` in `lib/actions/pill.ts`
- `publishCourse(id)` in `lib/actions/course.ts` (admin only)

Each follows the same pattern as `publishArticle`: update `content.status = 'published'`, set `published_at`, then use `after()` to fire the translate call.

---

## Error Handling

- DeepL errors per locale: logged to console, skipped — other locales continue
- Missing translations fall back to `en` via existing `getTranslation()` in `lib/content.ts`
- Failed translations show as ✗ in admin UI — retry available via "Translate" button
- API route returns 401 if `x-translate-secret` header is missing or wrong
- API route returns 400 if `contentId` is missing
- `retranslate` Server Action throws on non-ok response so `TranslateButton` can display the error

---

## Environment Variables

```
DEEPL_API_KEY=            # DeepL free (ends in :fx) or Pro API key
TRANSLATE_API_SECRET=     # High-entropy secret (32+ chars) for /api/translate
SUPABASE_SERVICE_ROLE_KEY=  # Already present
```

`DEEPL_API_KEY` is already in `.env.local.example`. Add `TRANSLATE_API_SECRET` to `.env.local.example`.

---

## File Structure

### New files
```
lib/deepl.ts
lib/tiptap-translate.ts
lib/require-admin.ts
lib/supabase/service-role.ts
lib/actions/translate.ts
app/api/translate/route.ts
app/[locale]/admin/layout.tsx
app/[locale]/admin/translations/page.tsx
components/admin/TranslateButton.tsx
tests/unit/lib/deepl.test.ts
tests/unit/lib/tiptap-translate.test.ts
tests/unit/app/api/translate.test.ts
tests/e2e/translations.spec.ts
```

### Modified files
```
lib/actions/article.ts      — add after() translate call in publishArticle
lib/actions/video.ts        — add publishVideo + after() translate call
lib/actions/podcast.ts      — add publishPodcast + after() translate call
lib/actions/pill.ts         — add publishPill + after() translate call
lib/actions/course.ts       — add publishCourse + after() translate call
.env.local.example          — add TRANSLATE_API_SECRET
```

---

## Testing

### Unit tests

**`tests/unit/lib/tiptap-translate.test.ts`**
- Extracts text nodes from a simple paragraph
- Re-injects translations in correct positions
- Skips `codeBlock` node content
- Skips inline `code` mark content
- Handles empty doc (no crash)

**`tests/unit/lib/deepl.test.ts`**
- Mocks `fetch`; verifies correct DeepL API call shape (URL, auth header, body)
- Uses free-tier URL when API key ends in `:fx`
- Uses Pro URL when API key does not end in `:fx`
- Returns translated strings in correct order
- Throws on non-2xx response

**`tests/unit/app/api/translate.test.ts`**
- Returns 401 with missing secret header
- Returns 401 with wrong secret header
- Returns 400 with missing contentId
- Correct field selection per content type (article vs video)
- Upserts `is_auto_translated = true`
- Skips locale where existing row has `is_auto_translated = false`

### E2E tests

**`tests/e2e/translations.spec.ts`**
- `/admin/translations` redirects to login when unauthenticated
- `/admin/translations` redirects to `/` when authenticated as non-admin user
- Page renders without 500 for admin (smoke test — no real DeepL call)
