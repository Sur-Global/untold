# Video Transcript Extraction — Design Spec

**Date:** 2026-03-23
**Status:** Approved

## Overview

Extract YouTube transcripts at publish time, store them in the database, and display them as a collapsible accordion on the video view page. The "View full transcript" button already exists in the UI but is currently non-functional.

## Data Model

**New column:** `transcript JSONB` on `video_meta`

Format: array of cue objects
```ts
{ start: string; text: string }[]
// e.g. [{ start: "0:00", text: "Hello and welcome" }, { start: "0:05", text: "Today we'll cover..." }]
```

`start` is formatted as `M:SS` (or `H:MM:SS` for videos over an hour). `show_transcript` boolean already exists and gates display; we additionally require `transcript` to be non-null before showing the button.

**Migration:** Add `transcript JSONB` column to `video_meta`.

## Extraction

### New utility: `lib/transcript.ts`

Exports `extractYouTubeTranscript(videoId: string): Promise<TranscriptCue[] | null>`

Steps:
1. Fetch `https://www.youtube.com/watch?v={videoId}` (same scraping technique used by `scrapeYouTubeChapters` in `app/api/video-metadata/route.ts`)
2. Parse `ytInitialPlayerResponse` from the page HTML
3. Find `captionTracks` in `playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks`
4. Select the English track (`vssId` starting with `.en` or `a.en`) or fall back to the first available track
5. Fetch the track's `baseUrl` with `&fmt=json3` appended
6. Parse the `json3` response — `events` array, each with `tStartMs` and `segs[].utf8` — into `{start, text}[]`
7. Format `tStartMs` (milliseconds) to `M:SS` or `H:MM:SS`

Returns `null` if the page fetch fails, `ytInitialPlayerResponse` is absent, no caption tracks exist, or the caption fetch fails. All errors are caught and logged; extraction is best-effort.

### Integration: `lib/actions/video.ts` — `publishVideo`

Extend the existing `after()` block to also trigger transcript extraction:

```ts
after(async () => {
  // existing: trigger translation
  // new: extract transcript
  const videoId = extractYouTubeId(video.embed_url)
  if (videoId) {
    const transcript = await extractYouTubeTranscript(videoId)
    if (transcript) {
      await supabase.from('video_meta').update({ transcript }).eq('content_id', id)
    }
  }
})
```

The `embed_url` must be read from the DB inside the `after()` callback (after the publish update completes).

### Re-extraction for existing videos

New server action: `extractTranscript(id: string)` in `lib/actions/video.ts`

- Verifies ownership (`author_id = user.id`)
- Reads `embed_url` from `video_meta`
- Calls `extractYouTubeTranscript`
- Upserts `transcript` into `video_meta`
- Revalidates the edit page path

**EditVideoForm** gets a "Re-extract transcript" button that calls this action — useful for videos published before this feature shipped or before YouTube finished processing captions.

### Vimeo

No transcript support. Vimeo's oEmbed API does not expose caption data. The "View full transcript" button remains hidden for Vimeo videos regardless of `show_transcript`.

## View Layer

### `TranscriptPanel` client component

New file: `components/content/TranscriptPanel.tsx`

- `"use client"` — manages open/closed state locally with `useState`
- Props: `transcript: TranscriptCue[]`
- Renders the existing "View full transcript" row as the trigger (chevron rotates on open)
- Expands inline below with a smooth CSS `max-height` transition
- Scrollable container (`max-h-96 overflow-y-auto`) for long transcripts
- Each row: timestamp in `JetBrains Mono` with `text-primary` (matching chapter list style), text in muted body color

### `app/[locale]/videos/[slug]/page.tsx`

- Replace the static "View full transcript" div with `<TranscriptPanel transcript={meta.transcript} />`
- Only render when `meta?.show_transcript && meta?.transcript?.length > 0`
- Query already fetches `video_meta`; add `transcript` to the select list

## Files to Create / Modify

| File | Change |
|------|--------|
| `supabase/migrations/…_add_transcript_to_video_meta.sql` | Add `transcript JSONB` column |
| `lib/transcript.ts` | New — YouTube transcript extraction utility |
| `lib/actions/video.ts` | Extend `publishVideo` `after()` block; add `extractTranscript` action |
| `components/content/TranscriptPanel.tsx` | New — accordion client component |
| `app/[locale]/videos/[slug]/page.tsx` | Replace static row with `TranscriptPanel`; add `transcript` to query |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | Add "Re-extract transcript" button |

## Error Handling

- Extraction failures are silent (logged, not surfaced to creator) — transcript simply stays null
- If transcript is null, the "View full transcript" button is hidden — no "unavailable" state shown to readers
- Re-extract button in edit form provides manual recovery path

## Out of Scope

- Translation of transcripts into other locales
- Editing or correcting transcript text
- Transcript search
- Vimeo transcript support
