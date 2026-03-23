# Video Transcript Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract YouTube transcripts at publish time, store in `video_meta.transcript`, and display as a collapsible accordion on the video view page.

**Architecture:** A new `/api/transcript` POST route (secret-authenticated, mirrors `/api/translate`) handles extraction using `lib/transcript.ts` (scrapes `ytInitialPlayerResponse` for caption tracks). `publishContent` fires it in `after()`. `TranscriptPanel` is a client component that manages accordion state, receiving the pre-fetched transcript from the Server Component.

**Tech Stack:** Next.js 14+ App Router, Supabase (service-role client for API route), YouTube watch page scraping (no API key), `lib/youtube.ts` shared ID extractor.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260323000013_add_transcript_to_video_meta.sql` | Create | Add `transcript JSONB` column |
| `lib/youtube.ts` | Create | Shared `extractYouTubeId` — moved from `video-metadata/route.ts` |
| `lib/transcript.ts` | Create | `TranscriptCue` type + `extractYouTubeTranscript` |
| `app/api/transcript/route.ts` | Create | Secret-auth POST endpoint, upserts transcript via service-role client |
| `app/api/video-metadata/route.ts` | Modify | Import `extractYouTubeId` from `lib/youtube.ts` instead of defining it locally |
| `lib/actions/content.ts` | Modify | Extend `publishContent` `after()` to POST to `/api/transcript` |
| `lib/actions/video.ts` | Modify | Delete `publishVideo`/`unpublishVideo`; add `extractTranscript` server action |
| `components/content/TranscriptPanel.tsx` | Create | `"use client"` accordion component |
| `app/[locale]/videos/[slug]/page.tsx` | Modify | Add `transcript` to query; replace static row with `TranscriptPanel` |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | Modify | Add "Re-extract transcript" button |
| `messages/en.json` (+ es, pt, fr, de, da) | Modify | i18n key for button label |
| `.env.local.example` | Modify | Add `TRANSCRIPT_API_SECRET` |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260323000013_add_transcript_to_video_meta.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add transcript storage to video_meta
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT NULL;
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
```

Expected: migration applied, no errors. Verify in Supabase Studio that `video_meta` now has a `transcript` column of type `jsonb`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260323000013_add_transcript_to_video_meta.sql
git commit -m "feat: add transcript column to video_meta"
```

---

## Task 2: Shared YouTube ID Extractor

**Files:**
- Create: `lib/youtube.ts`
- Modify: `app/api/video-metadata/route.ts`

- [ ] **Step 1: Create `lib/youtube.ts`**

```ts
/**
 * Shared YouTube utility — import this instead of defining extractYouTubeId locally.
 */

/** Extract the YouTube video ID from any YouTube URL format. Returns null for non-YouTube URLs. */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&\n?#]+)/
  )
  return match?.[1] ?? null
}
```

- [ ] **Step 2: Update `app/api/video-metadata/route.ts` to use it**

Remove the local `extractYouTubeId` function (lines 21–26) and add the import at the top:

```ts
import { extractYouTubeId } from '@/lib/youtube'
```

The rest of the file is unchanged.

- [ ] **Step 3: Verify the app compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/youtube.ts app/api/video-metadata/route.ts
git commit -m "refactor: extract extractYouTubeId to shared lib/youtube.ts"
```

---

## Task 3: Transcript Extraction Utility

**Files:**
- Create: `lib/transcript.ts`

- [ ] **Step 1: Create `lib/transcript.ts`**

```ts
export interface TranscriptCue {
  start: string  // "M:SS" or "H:MM:SS"
  text: string
}

/** Format milliseconds to "M:SS" or "H:MM:SS" */
function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const min = Math.floor((totalSecs % 3600) / 60)
  const sec = totalSecs % 60
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${min}:${String(sec).padStart(2, '0')}`
}

/**
 * Extract transcript cues from a YouTube video.
 * Scrapes ytInitialPlayerResponse from the watch page and fetches the json3 caption track.
 * Returns null on any failure — extraction is best-effort.
 */
export async function extractYouTubeTranscript(videoId: string): Promise<TranscriptCue[] | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) return null

    const html = await res.text()

    // ytInitialPlayerResponse is a separate blob from ytInitialData
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s+\w+|<\/script>)/)
    if (!match) return null

    const playerResponse = JSON.parse(match[1])
    const captionTracks: Array<{ baseUrl: string; vssId: string }> =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (captionTracks.length === 0) return null

    // Prefer English track, fall back to first available
    const track =
      captionTracks.find((t) => t.vssId?.startsWith('.en') || t.vssId?.startsWith('a.en')) ??
      captionTracks[0]

    const captionRes = await fetch(`${track.baseUrl}&fmt=json3`)
    if (!captionRes.ok) return null

    const data = await captionRes.json()
    const events: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }> =
      data?.events ?? []

    const cues: TranscriptCue[] = []
    for (const event of events) {
      if (event.tStartMs == null || !event.segs) continue
      const text = event.segs
        .map((s) => s.utf8 ?? '')
        .join('')
        .replace(/\n/g, ' ')
        .trim()
      if (!text || text === '\n') continue
      cues.push({ start: formatMs(event.tStartMs), text })
    }

    return cues.length > 0 ? cues : null
  } catch (err) {
    console.error('[transcript] extraction failed:', err)
    return null
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/transcript.ts
git commit -m "feat: add YouTube transcript extraction utility"
```

---

## Task 4: Transcript API Route

**Files:**
- Create: `app/api/transcript/route.ts`
- Modify: `.env.local.example`
- Add env var to `.env.local`

- [ ] **Step 1: Add env var to `.env.local.example`**

Append after the `TRANSLATE_API_SECRET` line:

```
TRANSCRIPT_API_SECRET=your-transcript-secret-32-chars-min
```

- [ ] **Step 2: Add the actual secret to `.env.local`**

Generate a random secret and add it:

```bash
echo "TRANSCRIPT_API_SECRET=$(openssl rand -hex 16)" >> .env.local
```

- [ ] **Step 3: Create `app/api/transcript/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { extractYouTubeId } from '@/lib/youtube'
import { extractYouTubeTranscript } from '@/lib/transcript'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-transcript-secret')
  if (!secret || secret !== process.env.TRANSCRIPT_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { contentId } = body as { contentId?: string }
  if (!contentId) {
    return NextResponse.json({ error: 'contentId required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: meta } = await (supabase as any)
    .from('video_meta')
    .select('embed_url')
    .eq('content_id', contentId)
    .maybeSingle()

  if (!meta?.embed_url) {
    // Not a video or no embed URL — skip silently
    return new NextResponse(null, { status: 204 })
  }

  const videoId = extractYouTubeId(meta.embed_url)
  if (!videoId) {
    // Vimeo or unknown platform — no transcript support
    return new NextResponse(null, { status: 204 })
  }

  const transcript = await extractYouTubeTranscript(videoId)
  if (!transcript) {
    return new NextResponse(null, { status: 204 })
  }

  await (supabase as any)
    .from('video_meta')
    .update({ transcript })
    .eq('content_id', contentId)

  return NextResponse.json({ ok: true, cues: transcript.length })
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/api/transcript/route.ts .env.local.example
git commit -m "feat: add /api/transcript route for background extraction"
```

---

## Task 5: Wire into publishContent

**Files:**
- Modify: `lib/actions/content.ts`

- [ ] **Step 1: Extend the `after()` block in `publishContent`**

The current `after()` block is at lines 22–38 of `lib/actions/content.ts`. Add the transcript trigger inside the same `after()` call, after the existing translation fetch:

```ts
after(async () => {
  // existing translation trigger — leave unchanged
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
      },
      body: JSON.stringify({ contentId: id }),
    })
    if (!res.ok) {
      console.error(`Translation trigger failed for ${id}: ${res.status}`)
    }
  } catch (err) {
    console.error(`Translation trigger error for ${id}:`, err)
  }

  // transcript extraction
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

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/content.ts
git commit -m "feat: trigger transcript extraction on content publish"
```

---

## Task 6: Clean up lib/actions/video.ts + add extractTranscript

**Files:**
- Modify: `lib/actions/video.ts`

- [ ] **Step 1: Delete `publishVideo` and `unpublishVideo`**

Remove both functions (lines 150–196 of `lib/actions/video.ts`). They are dead code — `EditVideoForm` calls `publishContent` from `lib/actions/content.ts`. Verify no other file imports them:

```bash
grep -r "publishVideo\|unpublishVideo" --include="*.ts" --include="*.tsx" .
```

Expected: only found in `lib/actions/video.ts` itself. If found elsewhere, investigate before deleting.

Also remove the `import { after } from 'next/server'` line at the top of the file — `after` is only used by `publishVideo`, so it becomes unused after deletion.

- [ ] **Step 2: Add `extractTranscript` server action**

Add at the end of `lib/actions/video.ts`:

```ts
import { extractYouTubeId } from '@/lib/youtube'
import { extractYouTubeTranscript } from '@/lib/transcript'

export async function extractTranscript(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  // Verify ownership
  const { data: owned } = await (supabase as any)
    .from('content')
    .select('id')
    .eq('id', id)
    .eq('author_id', user.id)
    .single()

  if (!owned) return

  // Get embed URL
  const { data: meta } = await (supabase as any)
    .from('video_meta')
    .select('embed_url')
    .eq('content_id', id)
    .single()

  if (!meta?.embed_url) return

  const videoId = extractYouTubeId(meta.embed_url)
  if (!videoId) return

  const transcript = await extractYouTubeTranscript(videoId)
  if (!transcript) return

  await (supabase as any)
    .from('video_meta')
    .update({ transcript })
    .eq('content_id', id)

  revalidatePath('/dashboard', 'layout')
  // Best-effort: revalidate the public video view page across all locales.
  // Note: revalidatePath with literal dynamic segments like '/[locale]/videos/[slug]'
  // is not officially documented to work as a wildcard — if the accordion doesn't
  // update immediately on the public page after re-extraction, this is expected;
  // the cache will expire naturally on next request.
  revalidatePath('/[locale]/videos/[slug]', 'page')
}
```

The `revalidatePath`, `createClient`, and `requireCreator` imports are already at the top of the file.

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/actions/video.ts
git commit -m "feat: add extractTranscript action, remove dead publishVideo/unpublishVideo"
```

---

## Task 7: TranscriptPanel Component

**Files:**
- Create: `components/content/TranscriptPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import type { TranscriptCue } from '@/lib/transcript'

interface TranscriptPanelProps {
  transcript: TranscriptCue[]
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card border border-primary/20 rounded-2xl mb-8 overflow-hidden">
      {/* Trigger row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 h-[55px] flex items-center justify-between hover:bg-primary/5 transition-colors"
        aria-expanded={open}
      >
        <span
          className="font-medium text-sm tracking-[0.28px] text-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          View full transcript
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        >
          <path
            d="M5 10h10M10 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '24rem' : '0' }}
      >
        <div className="overflow-y-auto max-h-96 px-5 pb-5">
          <div className="flex flex-col gap-1 pt-2">
            {transcript.map((cue, i) => (
              <div key={i} className="flex items-start gap-4 px-3 py-2 rounded-[10px] hover:bg-primary/5 transition-colors">
                <span
                  className="font-semibold text-primary text-sm tracking-[0.28px] w-14 flex-shrink-0 mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {cue.start}
                </span>
                <span className="text-sm text-[#5a4a42] tracking-[0.28px] leading-[1.5]">
                  {cue.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/content/TranscriptPanel.tsx
git commit -m "feat: add TranscriptPanel accordion component"
```

---

## Task 8: Video View Page Integration

**Files:**
- Modify: `app/[locale]/videos/[slug]/page.tsx`

- [ ] **Step 1: Add imports**

```ts
import { TranscriptPanel } from '@/components/content/TranscriptPanel'
import type { TranscriptCue } from '@/lib/transcript'
```

- [ ] **Step 2: Add `transcript` to the video_meta select**

Change line 55 from:
```ts
video_meta ( embed_url, thumbnail_url, duration, chapters, show_transcript )
```
to:
```ts
video_meta ( embed_url, thumbnail_url, duration, chapters, show_transcript, transcript )
```

- [ ] **Step 3: Replace the static "View full transcript" div**

Find the static `{meta?.show_transcript && (...)}` block (lines 251–263) and replace it with:

```tsx
{meta?.show_transcript && Array.isArray(meta?.transcript) && meta.transcript.length > 0 && (
  <TranscriptPanel transcript={meta.transcript as TranscriptCue[]} />
)}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/videos/[slug]/page.tsx
git commit -m "feat: integrate TranscriptPanel into video view page"
```

---

## Task 9: Re-extract Button in EditVideoForm

**Files:**
- Modify: `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx`
- Modify: `messages/en.json` + `es.json`, `pt.json`, `fr.json`, `de.json`, `da.json`

- [ ] **Step 1: Add i18n key to `messages/en.json`**

In the `"editor"` section, add after `"videoUrlExtracting"`:

```json
"reExtractTranscript": "Re-extract transcript",
"reExtractingTranscript": "Extracting…"
```

- [ ] **Step 2: Translate to all other locales**

`messages/es.json`:
```json
"reExtractTranscript": "Re-extraer transcripción",
"reExtractingTranscript": "Extrayendo…"
```

`messages/pt.json`:
```json
"reExtractTranscript": "Re-extrair transcrição",
"reExtractingTranscript": "Extraindo…"
```

`messages/fr.json`:
```json
"reExtractTranscript": "Ré-extraire la transcription",
"reExtractingTranscript": "Extraction…"
```

`messages/de.json`:
```json
"reExtractTranscript": "Transkript neu extrahieren",
"reExtractingTranscript": "Wird extrahiert…"
```

`messages/da.json`:
```json
"reExtractTranscript": "Genudtræk transskription",
"reExtractingTranscript": "Udtrækker…"
```

- [ ] **Step 3: Add the button to EditVideoForm**

Read `EditVideoForm.tsx` first to find the right place (near the `show_transcript` toggle). Import `extractTranscript`:

```ts
import { extractTranscript } from '@/lib/actions/video'
```

Add a button near the `show_transcript` section that:
1. Calls `extractTranscript(id)` via `useTransition`
2. Shows "Extracting…" while pending
3. Only renders when `status === 'published'`

```tsx
const [isExtracting, startExtractTransition] = useTransition()

// In JSX, near the show_transcript toggle:
{status === 'published' && (
  <button
    type="button"
    onClick={() => startExtractTransition(() => extractTranscript(id))}
    disabled={isExtracting}
    className="text-sm text-primary hover:underline font-['JetBrains_Mono',monospace] tracking-[0.28px] disabled:opacity-50"
  >
    {isExtracting ? t('reExtractingTranscript') : t('reExtractTranscript')}
  </button>
)}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx \
  messages/en.json messages/es.json messages/pt.json messages/fr.json messages/de.json messages/da.json
git commit -m "feat: add re-extract transcript button to video edit form"
```

---

## Task 10: Playwright Verification

- [ ] **Step 1: Open the browser and navigate to a published video's edit page**

```bash
playwright-cli open http://localhost:3000
```

Log in as a creator (use test credentials from memory). Navigate to the edit page of a published YouTube video.

- [ ] **Step 2: Verify "Re-extract transcript" button is visible**

Take a snapshot and confirm the button is present.

```bash
playwright-cli snapshot
```

Expected: "Re-extract transcript" button visible near the transcript toggle.

- [ ] **Step 3: Click the button and verify it doesn't error**

```bash
playwright-cli click <ref-of-button>
playwright-cli snapshot
```

Expected: button briefly shows "Extracting…" then returns to normal. No error state.

- [ ] **Step 4: Seed transcript data and verify view page accordion**

Manually verify in Supabase Studio (or via a test video with captions) that `video_meta.transcript` now has data. Then navigate to the public video view page:

```bash
playwright-cli goto http://localhost:3000/en/videos/<slug>
playwright-cli snapshot
```

Expected: "View full transcript" button visible (only if `show_transcript` is true and `transcript` has data).

- [ ] **Step 5: Click the accordion and verify it expands**

```bash
playwright-cli click <ref-of-view-full-transcript-button>
playwright-cli snapshot
```

Expected: transcript cues visible with timestamps in primary color, text in body color.

- [ ] **Step 6: Verify accordion absent when show_transcript is false**

On a video where `show_transcript = false`, navigate to its view page and confirm the "View full transcript" button is not rendered.

- [ ] **Step 7: Verify accordion absent when transcript is null**

On a video where `show_transcript = true` but `transcript IS NULL` (no extraction yet), confirm the button is not rendered.

- [ ] **Step 8: Commit**

```bash
git add .playwright-cli/
git commit -m "test: verify transcript accordion on video view page"
```

---

## Summary of Commits

1. `feat: add transcript column to video_meta`
2. `refactor: extract extractYouTubeId to shared lib/youtube.ts`
3. `feat: add YouTube transcript extraction utility`
4. `feat: add /api/transcript route for background extraction`
5. `feat: trigger transcript extraction on content publish`
6. `feat: add extractTranscript action, remove dead publishVideo/unpublishVideo`
7. `feat: add TranscriptPanel accordion component`
8. `feat: integrate TranscriptPanel into video view page`
9. `feat: add re-extract transcript button to video edit form`
10. `test: verify transcript accordion on video view page`
