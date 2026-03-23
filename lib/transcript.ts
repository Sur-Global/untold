import { YoutubeTranscript } from 'youtube-transcript'

export interface TranscriptCue {
  start: string  // "M:SS" or "H:MM:SS"
  text: string
}

/** Format seconds to "M:SS" or "H:MM:SS" */
function formatSecs(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600)
  const min = Math.floor((totalSecs % 3600) / 60)
  const sec = totalSecs % 60
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${min}:${String(sec).padStart(2, '0')}`
}

/**
 * Extract transcript cues from a YouTube video using youtube-transcript.
 * Returns null on any failure — extraction is best-effort.
 */
export async function extractYouTubeTranscript(videoId: string): Promise<TranscriptCue[] | null> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
    const cues: TranscriptCue[] = items
      .map((item) => ({
        start: formatSecs(Math.floor((item.offset ?? 0) / 1000)),
        text: item.text.replace(/\s+/g, ' ').trim(),
      }))
      .filter((c) => c.text)
    return cues.length > 0 ? cues : null
  } catch {
    // Fallback: try without language preference
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId)
      const cues: TranscriptCue[] = items
        .map((item) => ({
          start: formatSecs(Math.floor((item.offset ?? 0) / 1000)),
          text: item.text.replace(/\s+/g, ' ').trim(),
        }))
        .filter((c) => c.text)
      return cues.length > 0 ? cues : null
    } catch (err) {
      console.error('[transcript] extraction failed:', err)
      return null
    }
  }
}
