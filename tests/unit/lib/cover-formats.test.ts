import { describe, it, expect } from 'vitest'
import { COVER_FORMATS, coverInputProps, readableTextColor, AUTO_COVER_COLORS } from '@/lib/cover-formats'

describe('cover formats (one per kind of content)', () => {
  it('videos are 16:9, podcasts square, pills any shape shown whole', () => {
    expect(coverInputProps('video')).toEqual({ previewAspect: '16/9', previewFit: 'cover' })
    expect(coverInputProps('podcast')).toEqual({ previewAspect: '1/1', previewFit: 'cover' })
    expect(coverInputProps('pill').previewFit).toBe('contain')
    expect(Object.keys(COVER_FORMATS).sort()).toEqual(['pill', 'podcast', 'video'])
  })
  it('has a colour for the automatic card of every kind of content', () => {
    for (const k of ['article', 'video', 'podcast', 'pill', 'course']) expect(AUTO_COVER_COLORS[k]).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('readableTextColor', () => {
  it('uses dark text on light backgrounds and white on dark ones', () => {
    expect(readableTextColor('#D2FE73')).toBe('#111111') // lime
    expect(readableTextColor('#A9A8E9')).toBe('#111111') // lilac
    expect(readableTextColor('#000000')).toBe('#ffffff')
    expect(readableTextColor('#5d4e37')).toBe('#ffffff')
  })
  it('falls back to white for anything that is not a colour', () => {
    expect(readableTextColor('nope')).toBe('#ffffff')
  })
})
