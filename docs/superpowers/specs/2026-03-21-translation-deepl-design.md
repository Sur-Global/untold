# Translation / DeepL Design Spec
**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Auto-translate all published content into 5 locales (es, pt, fr, de, da) using the DeepL API. Translations fire on publish (and re-publish after edits) as a fire-and-forget background call. An admin translations dashboard at `/admin/translations` shows per-locale status for all published content and allows manual retry of missing or failed translations.

Quechua (`qu`) is excluded from this plan entirely.

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

**Trigger:** Each publish server action calls `fetch('/api/translate', { method: 'POST', body: JSON.stringify({ contentId }) })` without `await` — fire and forget. On re-publish, existing auto-translations are overwritten.

**API route:** `app/api/translate/route.ts`
- Accepts `POST { contentId: string, locale?: string }`
- Validates `x-translate-secret` header against `TRANSLATE_API_SECRET` env var
- Uses Supabase service role client to bypass RLS
- Fetches the `en` row from `content_translations` plus `content.type`
- For each target locale (all 5 if `locale` omitted, one if specified):
  - Translates applicable fields via `lib/deepl.ts`
  - Upserts into `content_translations` with `is_auto_translated = true`
- Errors per locale are logged and skipped — partial success is fine
- Returns `{ ok: true, translated: string[] }` (locale list that succeeded)

**Security:** `TRANSLATE_API_SECRET` env var. The publish server actions include it as `x-translate-secret`. Requests without the header return 401.

### DeepL wrapper — `lib/deepl.ts`

Thin wrapper around the DeepL REST API (no SDK — plain `fetch`).

```ts
export const SUPPORTED_LOCALES = ['es', 'pt', 'fr', 'de', 'da'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

// Maps next-intl locale codes to DeepL target language codes
const DEEPL_LANG_MAP: Record<SupportedLocale, string> = {
  es: 'ES', pt: 'PT', fr: 'FR', de: 'DE', da: 'DA',
}

// Translates an array of strings in one DeepL API call.
// Returns translated strings in the same order.
export async function translateTexts(
  texts: string[],
  targetLocale: SupportedLocale
): Promise<string[]>
```

- Uses `https://api-free.deepl.com/v2/translate` (free tier) — switch to `api.deepl.com` for Pro
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

Server component. Requires admin role.

Fetches all published content joined with their `content_translations` rows. Renders a table:

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
- On click: calls `POST /api/translate` with `{ contentId, locale }`
- Shows loading spinner during call
- Calls `router.refresh()` on success to re-fetch server component data
- Shows error toast on failure

### Auth guard — `lib/require-admin.ts`

```ts
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')
  return { user }
}
```

### Admin layout — `app/[locale]/admin/layout.tsx`

Minimal layout: simple "Admin" header. Plan 7 (Admin Dashboard) will replace this with the full admin nav sidebar.

---

## Error Handling

- DeepL errors per locale: logged to console, skipped — other locales continue
- Missing translations fall back to `en` via existing `getTranslation()` in `lib/content.ts`
- Failed translations show as ✗ in admin UI — retry available via "Translate" button
- API route returns 401 if `x-translate-secret` header is missing or wrong
- API route returns 400 if `contentId` is missing

---

## Environment Variables

```
DEEPL_API_KEY=           # DeepL free or Pro API key
TRANSLATE_API_SECRET=    # Shared secret for /api/translate endpoint
SUPABASE_SERVICE_ROLE_KEY=  # Already present
```

Add `TRANSLATE_API_SECRET` to `.env.local.example`.

---

## File Structure

### New files
```
lib/deepl.ts
lib/tiptap-translate.ts
lib/require-admin.ts
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
lib/actions/article.ts      — add fire-and-forget translate call in publishArticle
lib/actions/video.ts        — add fire-and-forget translate call in publishVideo
lib/actions/podcast.ts      — add fire-and-forget translate call in publishPodcast
lib/actions/pill.ts         — add fire-and-forget translate call in publishPill
lib/actions/course.ts       — add fire-and-forget translate call in publishCourse
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
- Returns translated strings in correct order
- Throws on non-2xx response

**`tests/unit/app/api/translate.test.ts`**
- Returns 401 with missing/wrong secret header
- Returns 400 with missing contentId
- Correct field selection per content type (article vs video)
- Upserts `is_auto_translated = true`

### E2E tests

**`tests/e2e/translations.spec.ts`**
- `/admin/translations` redirects to login when unauthenticated
- Page renders without 500 (smoke test — no real DeepL call)
