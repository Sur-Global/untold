# Transcript Translation Design

## Goal

Translate video transcripts into the viewer's locale on first page visit, storing the result so subsequent visits are instant. Also fix video description (`body`) translation, which is currently skipped by the translate route.

## Architecture

Two coordinated changes:

1. **Fix `/api/translate`** to translate `body` for all content types (video, podcast, course) — currently only article and pill are covered.
2. **Add per-locale transcript translation** triggered lazily from the video page on first visit in a given locale.

Translation is performed by DeepL (already wired up). Translations are stored in Postgres alongside existing data. No new environment variables.

## Tech Stack

Next.js App Router, Supabase (Postgres), DeepL API, `after()` for background work.

---

## Storage

**Migration:** Add `transcript_translations JSONB DEFAULT NULL` to `video_meta`.

```sql
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript_translations JSONB DEFAULT NULL;
```

The column holds a locale-keyed map:

```json
{
  "es": [{ "start": "0:04", "text": "Hola a todos..." }, ...],
  "fr": [{ "start": "0:04", "text": "Bonjour à tous..." }, ...]
}
```

- English is always the canonical source in the existing `transcript` column — it is never written to `transcript_translations`.
- A null column or missing locale key means that locale has not been translated yet.
- Writing one locale must not overwrite others — use `jsonb_set` / merge approach in the upsert.

---

## Translate Route Fix (`/api/translate`)

**Current behaviour:** `hasBody` only covers `article` and `pill`, so `body` is never translated for `video`, `podcast`, or `course`.

**Fix:** Extend `hasBody` to all content types:

```ts
// Before
const hasBody = content.type === 'article' || content.type === 'pill'

// After
const hasBody = ['article', 'pill', 'video', 'podcast', 'course'].includes(content.type)
```

This is a one-line change. It means the publish-time translation pass (which calls `/api/translate` for all locales) will now also translate video/podcast/course `body` fields.

---

## Transcript Translation Pipeline

### In `/api/translate`

When called with a `locale` and the content type is `video`:

1. Fetch `video_meta.transcript` (English `TranscriptCue[]`).
2. If null or empty, skip — nothing to translate.
3. Extract all `text` fields into a string array.
4. Send as a single DeepL batch: `translateTexts(texts, locale)`.
5. Rebuild the cue array: same `start` timestamps, translated `text`.
6. Merge into `transcript_translations` using Supabase's JSONB update to set only the target locale key — do not overwrite other locale keys.

The merge pattern (using `jsonb_set` via raw SQL or Supabase's `.update` with `||` operator):

```ts
// Fetch current value, merge, write back
const { data: current } = await supabase
  .from('video_meta')
  .select('transcript_translations')
  .eq('content_id', contentId)
  .single()

const merged = { ...(current?.transcript_translations ?? {}), [locale]: translatedCues }

await supabase
  .from('video_meta')
  .update({ transcript_translations: merged })
  .eq('content_id', contentId)
```

### Error handling

- If DeepL fails, log the error and leave `transcript_translations[locale]` unset — it will be retried on next page visit.
- If `transcript` is null, return early without writing anything.

---

## Trigger: First Page Visit

**Location:** `app/[locale]/videos/[slug]/page.tsx` server component.

**Logic:**

```ts
// Add transcript_translations to the video_meta select
video_meta ( embed_url, thumbnail_url, duration, chapters, transcript, transcript_translations )

// After fetching the video:
const locale = params.locale  // e.g. "es"
const needsTranscript =
  locale !== 'en' &&
  Array.isArray(meta?.transcript) &&
  meta.transcript.length > 0 &&
  !meta?.transcript_translations?.[locale]

if (needsTranscript) {
  after(async () => {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
      },
      body: JSON.stringify({ contentId: video.id, locale }),
    })
  })
}
```

The `after()` call runs after the response is sent, so the page load is not blocked. The current request always renders immediately.

---

## View Layer

`TranscriptPanel` already accepts `transcript: TranscriptCue[]`. The video page selects which array to pass:

```ts
const displayTranscript =
  locale !== 'en'
    ? (meta?.transcript_translations?.[locale] as TranscriptCue[] | undefined) ?? meta?.transcript
    : meta?.transcript
```

- First visit in a non-English locale: English transcript is shown (translation is queued in background).
- Subsequent visits: translated transcript is shown.
- English locale: always shows the English transcript directly.

No changes needed to `TranscriptPanel` itself.

---

## Data Flow Summary

```
First visit (es):
  Page load → fetch video (transcript_translations.es = null)
            → render with English transcript
            → after() → POST /api/translate {contentId, locale: "es"}
                       → DeepL batch translate cues
                       → write transcript_translations.es to DB

Second visit (es):
  Page load → fetch video (transcript_translations.es = [...])
            → render with Spanish transcript
            → no after() triggered
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_transcript_translations.sql` | Add `transcript_translations` column |
| `app/api/translate/route.ts` | Extend `hasBody`; add transcript translation block |
| `app/[locale]/videos/[slug]/page.tsx` | Select `transcript_translations`; add `after()` trigger; pass correct transcript to `TranscriptPanel` |

---

## Out of Scope

- Translating transcripts for Vimeo or other platforms (no transcript source).
- Surfacing a "translated" badge in the UI.
- Allowing users to switch between English and translated transcript.
- Re-translating when the source transcript is updated.
