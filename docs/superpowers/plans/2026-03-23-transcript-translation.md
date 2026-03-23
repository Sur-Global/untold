# Transcript Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate video transcripts into the viewer's locale on first page visit, and fix video body (description) translation which is currently skipped.

**Architecture:** Add a `transcript_translations JSONB` column to `video_meta` (locale-keyed map of translated cues). Extend the existing `/api/translate` route to (a) fix body translation for video/podcast/course types, and (b) translate transcript cues via a single DeepL batch and merge them into `transcript_translations`. Trigger per-locale translation lazily from the video page using `after()` on first visit when a translation is missing.

**Tech Stack:** Next.js App Router, Supabase Postgres, DeepL API (`lib/deepl.ts`), `after()` from `next/server`.

---

## Files

| File | Action |
|------|--------|
| `supabase/migrations/20260323000014_add_transcript_translations.sql` | Create — adds `transcript_translations` column |
| `app/api/translate/route.ts` | Modify — fix `hasBody`, add transcript translation block |
| `app/[locale]/videos/[slug]/page.tsx` | Modify — select `transcript_translations`, add `after()` trigger, pick correct transcript |

---

## Task 1: Migration — add `transcript_translations` column

**Files:**
- Create: `supabase/migrations/20260323000014_add_transcript_translations.sql`

This migration adds a nullable JSONB column to `video_meta` that holds translated transcript cues keyed by locale: `{ "es": [{start, text}, ...], "fr": [...] }`.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260323000014_add_transcript_translations.sql
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript_translations JSONB DEFAULT NULL;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 3: Verify the column exists**

```bash
npx supabase db diff
```

Expected: No pending changes (migration is fully applied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260323000014_add_transcript_translations.sql
git commit -m "feat: add transcript_translations column to video_meta"
```

---

## Task 2: Fix `/api/translate` — body translation for all content types + transcript translation

**Files:**
- Modify: `app/api/translate/route.ts`

**Current state of the file (read before editing):**
- Line 82: `const hasBody = content.type === 'article' || content.type === 'pill'`
  — This is the bug. It skips body translation for video, podcast, course.
- Lines 80–103: The body translation block using BlockNote or legacy Tiptap format.
- Lines 105–116: The `content_translations` upsert.

**Two changes in this task:**

**Change 1 — Fix `hasBody`** (line 82):
```ts
// Before
const hasBody = content.type === 'article' || content.type === 'pill'

// After
const hasBody = ['article', 'pill', 'video', 'podcast', 'course'].includes(content.type)
```

**Change 2 — Add transcript translation block** after the existing `content_translations` upsert (after line 120 `translated.push(targetLocale)`), still inside the `for (const targetLocale of locales)` loop:

```ts
// Translate transcript for video content
if (content.type === 'video') {
  try {
    const { data: videoMeta } = await (supabase as any)
      .from('video_meta')
      .select('transcript, transcript_translations')
      .eq('content_id', contentId)
      .maybeSingle()

    const sourceCues: Array<{ start: string; text: string }> = Array.isArray(videoMeta?.transcript)
      ? videoMeta.transcript
      : []

    if (sourceCues.length > 0) {
      const texts = sourceCues.map((c) => c.text)
      const translatedTexts = await translateTexts(texts, targetLocale)
      const translatedCues = sourceCues.map((c, i) => ({ start: c.start, text: translatedTexts[i] }))

      // NOTE: This is a read-then-merge-then-write pattern, not atomic.
      // If two visitors arrive simultaneously in different locales (e.g. es and fr),
      // the second write could overwrite the first locale's translation.
      // Worst case: that locale gets re-triggered on the next visit — no data is permanently lost.
      // For a content site, this is an acceptable trade-off.
      const existing = videoMeta?.transcript_translations ?? {}
      const merged = { ...existing, [targetLocale]: translatedCues }

      await (supabase as any)
        .from('video_meta')
        .update({ transcript_translations: merged })
        .eq('content_id', contentId)
    }
  } catch (err) {
    console.error(`Transcript translation failed for locale ${targetLocale}:`, err)
  }
}
```

Note: The import for `translateTexts` is already at the top of the file. No new imports needed.

- [ ] **Step 1: Edit `app/api/translate/route.ts` — fix `hasBody`**

Change line 82 from:
```ts
const hasBody = content.type === 'article' || content.type === 'pill'
```
to:
```ts
const hasBody = ['article', 'pill', 'video', 'podcast', 'course'].includes(content.type)
```

- [ ] **Step 2: Edit `app/api/translate/route.ts` — add transcript block**

Insert the transcript translation block shown above **after** the `translated.push(targetLocale)` line (currently line 120), still inside the `for (const targetLocale of locales)` loop and inside the outer `try/catch`.

The block must go between `translated.push(targetLocale)` and the closing `} catch (err)` of the existing try block. Final structure:

```ts
    // ... existing content_translations upsert ...
    if (upsertError) throw upsertError

    translated.push(targetLocale)

    // Translate transcript for video content
    if (content.type === 'video') {
      try {
        // ... transcript block as above ...
      } catch (err) {
        console.error(`Transcript translation failed for locale ${targetLocale}:`, err)
      }
    }

  } catch (err) {
    console.error(`Translation failed for locale ${targetLocale}:`, err)
  }
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/translate/route.ts
git commit -m "feat: translate video body and transcript cues in translate route"
```

---

## Task 3: Video page — select translations, trigger on first visit, display correct transcript

**Files:**
- Modify: `app/[locale]/videos/[slug]/page.tsx`

**Three changes in this file:**

**Change 1 — Add `transcript_translations` to the video_meta select** (line 57):
```ts
// Before
video_meta ( embed_url, thumbnail_url, duration, chapters, transcript )

// After
video_meta ( embed_url, thumbnail_url, duration, chapters, transcript, transcript_translations )
```

**Change 2 — Add `after()` import and trigger** after line 70 (where `meta` is derived):

At the top of the file, add `after` to the import from `next/server`:
```ts
import { after } from 'next/server'
```

After `const meta = ...` (line 70), add:
```ts
// Trigger transcript translation on first visit for non-English locales
if (
  locale !== 'en' &&
  Array.isArray(meta?.transcript) &&
  meta.transcript.length > 0 &&
  !meta?.transcript_translations?.[locale]
) {
  after(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
        },
        body: JSON.stringify({ contentId: video.id, locale }),
      })
    } catch (err) {
      console.error('[transcript-translation] trigger failed:', err)
    }
  })
}
```

**Change 3 — Pick the correct transcript to display** (replace current line 253 area):
```ts
// Before (existing line ~253)
{Array.isArray(meta?.transcript) && meta.transcript.length > 0 && (
  <TranscriptPanel transcript={meta.transcript as TranscriptCue[]} />
)}

// After
{(() => {
  const displayTranscript: TranscriptCue[] | null =
    locale !== 'en' && Array.isArray(meta?.transcript_translations?.[locale])
      ? (meta.transcript_translations[locale] as TranscriptCue[])
      : Array.isArray(meta?.transcript) ? (meta.transcript as TranscriptCue[]) : null
  return displayTranscript && displayTranscript.length > 0
    ? <TranscriptPanel transcript={displayTranscript} />
    : null
})()}
```

- [ ] **Step 1: Add `transcript_translations` to the video_meta select**

In `app/[locale]/videos/[slug]/page.tsx` line 57, change:
```ts
video_meta ( embed_url, thumbnail_url, duration, chapters, transcript )
```
to:
```ts
video_meta ( embed_url, thumbnail_url, duration, chapters, transcript, transcript_translations )
```

- [ ] **Step 2: Add `after` import**

Add `import { after } from 'next/server'` to the imports at the top of `app/[locale]/videos/[slug]/page.tsx`.

- [ ] **Step 3: Add the lazy trigger block**

After `const meta = Array.isArray(video.video_meta) ? video.video_meta[0] : video.video_meta ?? {}` (line 70), insert the `after()` trigger block as shown above.

- [ ] **Step 4: Update the TranscriptPanel render**

Find the `{/* Transcript panel */}` comment block (~line 252) and replace it with the `displayTranscript` logic shown above.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Manual smoke test**

1. Open a video page in a non-English locale (e.g. `/es/videos/<slug>`).
2. Check browser devtools Network tab — after page load, a POST to `/api/translate` should fire in the background.
3. Reload the page — the transcript should now appear in Spanish (or whichever locale).
4. Check the DB: `video_meta.transcript_translations` should have an `"es"` key with translated cues.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/videos/[slug]/page.tsx
git commit -m "feat: show translated transcript on video page, trigger on first visit"
```
