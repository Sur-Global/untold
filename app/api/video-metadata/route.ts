import { NextRequest, NextResponse } from 'next/server'
import { extractYouTubeId } from '@/lib/youtube'
import { extractYouTubeTranscript, type TranscriptCue } from '@/lib/transcript'

export interface VideoChapter {
  timestamp: string
  title: string
}

export interface VideoMetadata {
  title?: string
  description?: string
  thumbnailUrl?: string
  duration?: string
  tags?: string[]
  author?: string
  chapters?: VideoChapter[]
  transcript?: TranscriptCue[]
  platform: 'youtube' | 'vimeo' | 'unknown'
}

// ── URL parsers ────────────────────────────────────────────────────────────

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

// ── Formatters ─────────────────────────────────────────────────────────────

/** "PT1H2M3S" → "1:02:03",  "PT5M30S" → "5:30",  "PT45S" → "0:45" */
function formatIso8601Duration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const sec = parseInt(m[3] ?? '0')
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${min}:${String(sec).padStart(2, '0')}`
}

/** Vimeo gives duration in seconds */
function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600)
  const min = Math.floor((secs % 3600) / 60)
  const sec = secs % 60
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${min}:${String(sec).padStart(2, '0')}`
}

// ── Chapter parser ─────────────────────────────────────────────────────────

/**
 * YouTube chapters are lines in the description that contain a timestamp.
 * Must start with 0:00. Handles common formats:
 *   "0:00 Title"
 *   "0:00 - Title"
 *   "(0:00) Title"
 *   "⌨️ (0:00) Title"   ← emoji/symbol prefix
 */
function parseChapters(description: string): VideoChapter[] {
  const chapters: VideoChapter[] = []
  // Allow up to ~10 chars of decorators (emoji, symbols) before the timestamp
  const re = /^.{0,10}[\(\[]?(\d{1,2}(?::\d{2}){1,2})[\)\]]?\s*[-–—]?\s*(.+)/

  for (const line of description.split('\n')) {
    const m = line.trim().match(re)
    if (m) {
      chapters.push({ timestamp: m[1], title: m[2].trim() })
    }
  }

  // YouTube requires 0:00 as the first chapter entry
  if (chapters.length < 2 || chapters[0].timestamp !== '0:00') return []
  return chapters
}

/**
 * Scrape the YouTube watch page for chapters stored in ytInitialData
 * (covers Studio-added chapters that are not in the description text).
 */
async function scrapeYouTubeChapters(videoId: string): Promise<VideoChapter[]> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) return []
    const html = await res.text()

    const match = html.match(/ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/)
    if (!match) return []

    const data = JSON.parse(match[1])
    const chapters = extractChapterRenderers(data)
    if (chapters.length < 2) return []
    return chapters
  } catch {
    return []
  }
}

/** Recursively walk the ytInitialData object and collect chapterRenderer entries */
function extractChapterRenderers(obj: unknown, depth = 0): VideoChapter[] {
  if (depth > 25 || obj === null || typeof obj !== 'object') return []
  if (Array.isArray(obj)) {
    return obj.flatMap((item) => extractChapterRenderers(item, depth + 1))
  }
  const record = obj as Record<string, unknown>
  if ('chapterRenderer' in record) {
    const r = record.chapterRenderer as Record<string, unknown>
    const ms = (r.timeRangeStartMillis as number) ?? 0
    const title = (r.title as Record<string, string>)?.simpleText ?? ''
    const secs = Math.floor(ms / 1000)
    const min = Math.floor(secs / 60)
    const sec = secs % 60
    return [{ timestamp: `${min}:${String(sec).padStart(2, '0')}`, title }]
  }
  return Object.values(record).flatMap((v) => extractChapterRenderers(v, depth + 1))
}

// ── Platform handlers ──────────────────────────────────────────────────────

async function fetchYouTube(videoId: string, rawUrl: string): Promise<VideoMetadata> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (apiKey) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    if (res.ok) {
      const data = await res.json()
      const item = data.items?.[0]
      if (item) {
        const { snippet, contentDetails } = item
        const t = snippet.thumbnails
        // Prefer highest-res thumbnail available
        const thumbnailUrl =
          t?.maxres?.url ?? t?.standard?.url ?? t?.high?.url ?? t?.medium?.url ?? t?.default?.url
        const description: string = snippet.description ?? ''
        const chaptersFromDesc = parseChapters(description)
        const chapters =
          chaptersFromDesc.length > 0
            ? chaptersFromDesc
            : await scrapeYouTubeChapters(videoId)
        return {
          platform: 'youtube',
          title: snippet.title,
          description,
          thumbnailUrl,
          duration: formatIso8601Duration(contentDetails.duration),
          tags: (snippet.tags as string[] | undefined)?.slice(0, 8) ?? [],
          author: snippet.channelTitle,
          chapters,
        }
      }
    }
  }

  // Fallback: oEmbed (no API key required, but limited data)
  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`
  )
  if (oembed.ok) {
    const d = await oembed.json()
    return {
      platform: 'youtube',
      title: d.title,
      // oEmbed thumbnail is low-res; try to construct a higher-res one
      thumbnailUrl:
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      author: d.author_name,
    }
  }

  return { platform: 'youtube' }
}

async function fetchVimeo(rawUrl: string): Promise<VideoMetadata> {
  const res = await fetch(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(rawUrl)}&width=1280`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return { platform: 'vimeo' }
  const d = await res.json()
  return {
    platform: 'vimeo',
    title: d.title,
    description: d.description ?? undefined,
    thumbnailUrl: d.thumbnail_url,
    duration: d.duration ? formatSeconds(d.duration) : undefined,
    author: d.author_name,
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  try {
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) {
      const [meta, transcript] = await Promise.all([
        fetchYouTube(youtubeId, url),
        extractYouTubeTranscript(youtubeId),
      ])
      return NextResponse.json({ ...meta, transcript: transcript ?? undefined })
    }

    const vimeoId = extractVimeoId(url)
    if (vimeoId) {
      const meta = await fetchVimeo(url)
      return NextResponse.json(meta)
    }

    return NextResponse.json({ platform: 'unknown' } satisfies VideoMetadata)
  } catch (err) {
    console.error('[video-metadata]', err)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 502 })
  }
}
