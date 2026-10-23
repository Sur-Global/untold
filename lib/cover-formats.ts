// One cover format per kind of content (decided 2026-10-23): videos 16:9 (the picture comes from YouTube or
// Vimeo on its own), podcasts square 1:1, pills any shape and shown whole. A cover is never required: without
// one, the card is designed automatically from the title.

export type CoverFormat = { aspect: string; fit: 'cover' | 'contain' }

export const COVER_FORMATS: Record<'video' | 'podcast' | 'pill', CoverFormat> = {
  video: { aspect: '16/9', fit: 'cover' },
  podcast: { aspect: '1/1', fit: 'cover' },
  pill: { aspect: '4/3', fit: 'contain' },
}

/** Background of an automatically designed card, by kind of content (a pill uses its own accent colour) */
export const AUTO_COVER_COLORS: Record<string, string> = {
  article: '#000000',
  video: '#5d4e37',
  podcast: '#A9A8E9',
  pill: '#D2FE73',
  course: '#8b4513',
}

/** Black or white, whichever reads better on a background colour like #A9A8E9 */
export function readableTextColor(hex: string): '#111111' | '#ffffff' {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.4 ? '#111111' : '#ffffff'
}

/** What a cover input needs for each kind of content: the shape of its preview and how the picture sits in it */
export function coverInputProps(kind: keyof typeof COVER_FORMATS): { previewAspect: string; previewFit: 'cover' | 'contain' } {
  const { aspect, fit } = COVER_FORMATS[kind]
  return { previewAspect: aspect, previewFit: fit }
}
