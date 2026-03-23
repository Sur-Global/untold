# Video Transcript Extraction — Design Spec

**Date:** 2026-03-23
**Status:** Approved

## Overview

Extract YouTube transcripts at publish time, store them in the database, and display them as a collapsible accordion on the video view page. The "View full transcript" button already exists in the UI but is currently non-functional.

## Data Model

**New column:** `transcript JSONB` on `video_meta`

Format: array of cue objects
```ts
// Canonical type — exported from lib/transcript.ts
export interface TranscriptCue {
  start: string  // formatted "M:SS" or "H:MM:SS"
  text: string
}
```

`show_transcript` boolean already exists and gates display; we additionally require `transcript` to be non-null and non-empty before showing the button.

**Migration:** `supabase/migrations/20260323000013_add_transcript_to_video_meta.sql` — add `transcript JSONB` column to `video_meta`.

## Extraction

### Shared utility: `lib/youtube.ts`

`extractYouTubeId(url: string): string | null` — currently a private function in `app/api/video-metadata/route.ts`. Move it to `lib/youtube.ts` and export it. Update the import in `video-metadata/route.ts`.

### New utility: `lib/transcript.ts`

Exports `TranscriptCue` interface and `extractYouTubeTranscript(videoId: string): Promise<TranscriptCue[] | null>`

Steps:
1. Fetch `https://www.youtube.com/watch?v={videoId}` (same User-Agent headers as `scrapeYouTubeChapters`)
2. Parse **`ytInitialPlayerResponse`** from the page HTML — this is a separate JSON blob from `ytInitialData` (used for chapters). Regex: `/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s+\w+|<\/script>)/`
3. Navigate to `playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks`
4. Select the English track (`vssId` starting with `.en` or `a.en`) or fall back to the first available track
5. Fetch the track's `baseUrl` with `&fmt=json3` appended
6. Parse the `json3` response — `events` array, each with `tStartMs` and `segs[].utf8` — into `TranscriptCue[]`
7. Format `tStartMs` (milliseconds) to `M:SS` or `H:MM:SS`
8. If `json3` returns an empty body or no events, return `null` — do not attempt fallback formats (out of scope)

Returns `null` if the page fetch fails, `ytInitialPlayerResponse` is absent, no caption tracks exist, or the caption fetch fails. All errors are caught and logged; extraction is best-effort.

### New API route: `app/api/transcript/route.ts`

Follows the same pattern as `/api/translate` — authenticated by a secret header `x-transcript-secret`, not by user session. This allows the route to be called from the `after()` background context where the request session is gone.

```
POST /api/transcript
Headers: x-transcript-secret: <TRANSCRIPT_API_SECRET>
Body: { contentId: string }
```

Inside the route:
1. Validate the secret header against `process.env.TRANSCRIPT_API_SECRET`
2. Fetch `video_meta` for the given `contentId` to get `embed_url`
3. Call `extractYouTubeId(embed_url)` from `lib/youtube.ts` — return `204` if no YouTube ID (Vimeo or unknown)
4. Call `extractYouTubeTranscript(videoId)` from `lib/transcript.ts`
5. Upsert result into `video_meta.transcript` using a **service-role Supabase client**
6. Return `200` on success, `204` if no transcript found, `500` on error

**Environment variable:** `TRANSCRIPT_API_SECRET` — add to `.env.local`, `.env.local.example`, and Vercel config.

### Integration: `lib/actions/content.ts` — `publishContent`

The `after()` block already triggers translation. Add a second call to POST to `/api/transcript`, matching the same pattern exactly (including `if (!res.ok)` logging):

```ts
after(async () => {
  // existing: trigger translation (unchanged)

  // new: trigger transcript extraction
  try {
    const transcriptRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/transcript`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-transcript-secret': process.env.TRANSCRIPT_API_SECRET!,
      },
      body: JSON.stringify({ contentId: id }),
    })
    if (!transcriptRes.ok) {
      console.error(`Transcript trigger failed for ${id}: ${transcriptRes.status}`)
    }
  } catch (err) {
    console.error(`Transcript trigger error for ${id}:`, err)
  }
})
```

Transcript extraction runs unconditionally for all published content. The API route skips silently (204) if the content has no YouTube URL. The `show_transcript` toggle controls display only, not extraction — this is intentional so the transcript is available if a creator later enables the toggle.

### Dead code: `publishVideo` in `lib/actions/video.ts`

`publishVideo` (line 150) is never called from the UI — `EditVideoForm` uses `publishContent` from `lib/actions/content.ts`. As part of this work, **delete `publishVideo` and `unpublishVideo`** from `lib/actions/video.ts` to eliminate the orphaned `after()` block that would otherwise miss the transcript trigger.

### Re-extraction for existing videos

New server action: `extractTranscript(id: string)` in `lib/actions/video.ts`

1. First query: verify ownership — update `content` with `.eq('id', id).eq('author_id', user.id)` or select with ownership filter; return early if not owned
2. Second query: fetch `embed_url` from `video_meta` where `content_id = id`
3. Call `extractYouTubeId` and `extractYouTubeTranscript`
4. Upsert `transcript` into `video_meta`
5. `revalidatePath('/dashboard', 'layout')` to cover the edit page
6. For the public view page (locale-prefixed route), call `revalidatePath('/(locales)/videos/[slug]', 'page')` — or simply rely on the `/api/transcript` route's upsert triggering ISR revalidation if configured; alternatively accept that CDN cache will expire naturally (since this is a manual creator action, immediate revalidation of the public page is best-effort)

**Note on `revalidatePath` and locales:** `revalidatePath('/videos', 'layout')` does not cover `app/[locale]/videos/[slug]`. Call `revalidatePath('/[locale]/videos/[slug]')` with the `page` option, or if the slug is available in the action, construct the exact path.

**EditVideoForm** gets a "Re-extract transcript" button that calls this action — useful for videos published before this feature shipped or before YouTube finished processing captions.

**i18n:** The button label is a new UI string. Add key (e.g. `dashboard.videos.reExtractTranscript`) to `messages/en.json` and translate to `es`, `pt`, `fr`, `de`, `da`.

### Vimeo

No transcript support. Vimeo's oEmbed API does not expose caption data. The API route returns `204` for non-YouTube URLs. The "View full transcript" button remains hidden for Vimeo videos.

## View Layer

### `TranscriptPanel` client component

New file: `components/content/TranscriptPanel.tsx`

- `"use client"` — manages open/closed state locally with `useState`
- Props: `transcript: TranscriptCue[]` (type imported from `lib/transcript.ts`)
- Renders the existing "View full transcript" row as the trigger (chevron rotates on open)
- Expands inline below with a smooth CSS `max-height` transition
- Scrollable container (`max-h-96 overflow-y-auto`) for long transcripts
- Each row: timestamp in `JetBrains Mono` with `text-primary` (matching chapter list style), text in muted body color

### `app/[locale]/videos/[slug]/page.tsx`

- Add `transcript` to the `video_meta` select list
- Replace the static "View full transcript" div with `<TranscriptPanel transcript={meta.transcript} />`
- Only render when `meta?.show_transcript && meta?.transcript?.length > 0`

## Files to Create / Modify

| File | Change |
|------|--------|
| `supabase/migrations/20260323000013_add_transcript_to_video_meta.sql` | Add `transcript JSONB` column |
| `lib/youtube.ts` | New — shared `extractYouTubeId` utility (moved from `video-metadata/route.ts`) |
| `lib/transcript.ts` | New — `TranscriptCue` type + YouTube extraction utility |
| `app/api/transcript/route.ts` | New — secret-authenticated POST endpoint |
| `lib/actions/content.ts` | Extend `publishContent` `after()` block to trigger transcript extraction |
| `lib/actions/video.ts` | Delete `publishVideo` + `unpublishVideo`; add `extractTranscript` server action |
| `components/content/TranscriptPanel.tsx` | New — accordion client component |
| `app/[locale]/videos/[slug]/page.tsx` | Add `transcript` to query; replace static row with `TranscriptPanel` |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | Add "Re-extract transcript" button |
| `app/api/video-metadata/route.ts` | Update to import `extractYouTubeId` from `lib/youtube.ts` |
| `messages/en.json` (+ `es`, `pt`, `fr`, `de`, `da`) | Add i18n key for "Re-extract transcript" button |
| `.env.local.example` | Add `TRANSCRIPT_API_SECRET` |

## Error Handling

- Extraction failures are silent (logged, not surfaced to creator) — transcript simply stays null
- If transcript is null or empty, the "View full transcript" button is hidden — no "unavailable" state shown to readers
- Re-extract button in edit form provides manual recovery path

## Testing (Playwright)

- Verify the "Re-extract transcript" button is visible in the edit form for a published video
- Verify the "View full transcript" accordion renders and expands on the public video view page when `show_transcript` is true and transcript data exists
- Verify the accordion is absent when `show_transcript` is false
- Verify the accordion is absent when `show_transcript` is true but `transcript` is null/empty (extraction failed)

## Out of Scope

- Translation of transcripts into other locales
- Editing or correcting transcript text
- Transcript search
- Vimeo transcript support
- Fallback caption formats (srv3, ttml) if json3 is unavailable
