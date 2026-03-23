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
