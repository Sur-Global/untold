export function getEmbedUrl(url: string): string | null {
  // YouTube watch URL — use URL.searchParams to handle any parameter order
  if (url.includes('youtube.com/watch')) {
    try {
      const videoId = new URL(url).searchParams.get('v')
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    } catch { /* malformed URL */ }
  }

  // YouTube short links (youtu.be) and Shorts
  const ytShortMatch = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/)
  if (ytShortMatch) return `https://www.youtube.com/embed/${ytShortMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  // Spotify (episode, show, track)
  const spotifyMatch = url.match(/open\.spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/)
  if (spotifyMatch) return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`

  // Apple Podcasts — use as-is (no reliable transform)
  if (url.includes('podcasts.apple.com')) return url

  // Amazon Music — use as-is
  if (url.includes('music.amazon.com')) return url

  // Overcast — use as-is
  if (url.includes('overcast.fm')) return url

  // Podbean — use as-is
  if (url.includes('podbean.com')) return url

  return null
}

export function getPlatformLabel(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('vimeo.com')) return 'Vimeo'
  if (url.includes('spotify.com')) return 'Spotify'
  if (url.includes('podcasts.apple.com')) return 'Apple Podcasts'
  if (url.includes('music.amazon.com')) return 'Amazon Music'
  if (url.includes('overcast.fm')) return 'Overcast'
  if (url.includes('podbean.com')) return 'Podbean'
  return 'External'
}
