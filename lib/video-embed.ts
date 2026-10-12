// Turns a video link pasted by a creator into something safe to embed.
// Supported: YouTube, Vimeo, and direct links to video files. Anything else is refused,
// so no arbitrary page can be iframed into an article.
export type EmbedSource =
  | { kind: 'iframe'; src: string; provider: 'youtube' | 'vimeo' }
  | { kind: 'file'; src: string }

export const ALLOWED_IFRAME_HOSTS = ['www.youtube-nocookie.com', 'player.vimeo.com']

const FILE_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i

export function toEmbedSource(input: string): EmbedSource | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
  let youtubeId: string | null = null
  if (host === 'youtu.be') youtubeId = url.pathname.slice(1).split('/')[0] || null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') youtubeId = url.searchParams.get('v')
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)
      youtubeId = m ? m[1] : null
    }
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    return { kind: 'iframe', provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${youtubeId}` }
  }

  // Vimeo: vimeo.com/ID or player.vimeo.com/video/ID (optionally with an unlisted-video hash)
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/^\/(?:video\/)?(\d{5,12})(?:\/([a-z0-9]+))?/i)
    if (m) {
      const hash = m[2] ?? url.searchParams.get('h')
      return {
        kind: 'iframe',
        provider: 'vimeo',
        src: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ''}`,
      }
    }
  }

  if (FILE_EXT.test(url.pathname + url.search)) return { kind: 'file', src: url.toString() }

  return null
}

/** True when an iframe src (e.g. in stored HTML) points at one of the hosts we embed. */
export function isAllowedIframeSrc(src: string | null | undefined): boolean {
  if (!src) return false
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}
