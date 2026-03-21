import { describe, it, expect } from 'vitest'
import { getEmbedUrl, getPlatformLabel } from '@/lib/embed'

describe('getEmbedUrl', () => {
  it('converts YouTube watch URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
  it('converts YouTube watch URL with list parameter before v', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?list=PLxxx&v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
  it('converts YouTube Shorts URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/shorts/abc123'))
      .toBe('https://www.youtube.com/embed/abc123')
  })
  it('converts youtu.be short URL', () => {
    expect(getEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
  it('converts Vimeo URL', () => {
    expect(getEmbedUrl('https://vimeo.com/123456789'))
      .toBe('https://player.vimeo.com/video/123456789')
  })
  it('converts Spotify episode URL', () => {
    expect(getEmbedUrl('https://open.spotify.com/episode/abc123'))
      .toBe('https://open.spotify.com/embed/episode/abc123')
  })
  it('returns null for unrecognised URL', () => {
    expect(getEmbedUrl('https://example.com/video')).toBeNull()
  })
})

describe('getPlatformLabel', () => {
  it('returns YouTube for a YouTube URL', () => {
    expect(getPlatformLabel('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('YouTube')
  })
  it('returns Spotify for a Spotify URL', () => {
    expect(getPlatformLabel('https://open.spotify.com/episode/abc123')).toBe('Spotify')
  })
  it('returns External for an unknown URL', () => {
    expect(getPlatformLabel('https://example.com/video')).toBe('External')
  })
})
