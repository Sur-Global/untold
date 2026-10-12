import { describe, it, expect } from 'vitest'
import { toEmbedSource, isAllowedIframeSrc } from '@/lib/video-embed'

describe('toEmbedSource', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=10', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/abcDEF12345', 'abcDEF12345'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('embeds YouTube link %s privacy-friendly', (input, id) => {
    expect(toEmbedSource(input)).toEqual({
      kind: 'iframe',
      provider: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${id}`,
    })
  })

  it('embeds Vimeo links, keeping the unlisted hash', () => {
    expect(toEmbedSource('https://vimeo.com/123456789')).toEqual({
      kind: 'iframe', provider: 'vimeo', src: 'https://player.vimeo.com/video/123456789',
    })
    expect(toEmbedSource('https://vimeo.com/123456789/abcdef1234')).toMatchObject({
      src: 'https://player.vimeo.com/video/123456789?h=abcdef1234',
    })
    expect(toEmbedSource('https://player.vimeo.com/video/123456789?h=abc')).toMatchObject({
      src: 'https://player.vimeo.com/video/123456789?h=abc',
    })
  })

  it('accepts direct video files', () => {
    expect(toEmbedSource('https://cdn.example.com/clip.mp4?x=1')).toEqual({
      kind: 'file', src: 'https://cdn.example.com/clip.mp4?x=1',
    })
  })

  it.each([
    'not a url',
    'javascript:alert(1)',
    'https://evil.example.com/page',
    'https://www.youtube.com/channel/UC123',
    'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/channels/staffpicks',
  ])('refuses %s', (input) => {
    expect(toEmbedSource(input)).toBeNull()
  })
})

describe('isAllowedIframeSrc', () => {
  it('only allows our embed hosts over https', () => {
    expect(isAllowedIframeSrc('https://www.youtube-nocookie.com/embed/abc')).toBe(true)
    expect(isAllowedIframeSrc('https://player.vimeo.com/video/123456')).toBe(true)
    expect(isAllowedIframeSrc('http://player.vimeo.com/video/123456')).toBe(false)
    expect(isAllowedIframeSrc('https://evil.example.com/x')).toBe(false)
    expect(isAllowedIframeSrc(null)).toBe(false)
  })
})
