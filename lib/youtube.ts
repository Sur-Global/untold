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
