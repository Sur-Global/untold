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
 * Extract the first complete JSON object following `marker` in `html`.
 * Uses brace depth-counting instead of regex so it handles deeply nested objects
 * and multi-line content reliably.
 */
function extractJsonObject(html: string, marker: string): unknown | null {
  const idx = html.indexOf(marker)
  if (idx === -1) return null
  const start = html.indexOf('{', idx + marker.length)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)) } catch { return null }
      }
    }
  }
  return null
}

function parseJson3(data: unknown): TranscriptCue[] {
  const events = (data as any)?.events ?? []
  const cues: TranscriptCue[] = []
  for (const event of events) {
    if (event.tStartMs == null || !event.segs) continue
    const text = event.segs
      .map((s: any) => s.utf8 ?? '')
      .join('')
      .replace(/\n/g, ' ')
      .trim()
    if (!text) continue
    cues.push({ start: formatMs(event.tStartMs), text })
  }
  return cues
}

/**
 * Extract transcript cues from a YouTube video.
 * Fetches the watch page, parses ytInitialPlayerResponse using brace depth-counting,
 * then fetches the caption track in json3 format.
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

    const playerResponse = extractJsonObject(html, 'ytInitialPlayerResponse')
    if (!playerResponse) return null

    const captionTracks: Array<{ baseUrl: string; vssId: string }> =
      (playerResponse as any)?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []

    if (captionTracks.length === 0) return null

    // Prefer English track, fall back to first available
    const track =
      captionTracks.find((t) => t.vssId?.startsWith('.en') || t.vssId?.startsWith('a.en')) ??
      captionTracks[0]

    const captionRes = await fetch(`${track.baseUrl}&fmt=json3`)
    if (!captionRes.ok) return null

    const cues = parseJson3(await captionRes.json())
    return cues.length > 0 ? cues : null
  } catch (err) {
    console.error('[transcript] extraction failed:', err)
    return null
  }
}
