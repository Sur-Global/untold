import { describe, it, expect } from 'vitest'
import { DEFAULT_PODCAST_BANNER, PODCAST_NAME, PODCAST_PLATFORMS, normalizePodcastBanner, platformLinks, safeWebUrl } from '@/lib/podcast-banner'

describe('the podcast banner settings', () => {
  it('starts switched off, with no picture and no links (the podcast is not out yet)', () => {
    const banner = normalizePodcastBanner(null)
    expect(banner).toEqual(DEFAULT_PODCAST_BANNER)
    expect(banner.enabled).toBe(false)
    expect(platformLinks(banner)).toEqual([])
  })

  it('names the podcast', () => {
    expect(PODCAST_NAME).toBe('El Lado Incómodo de la Innovación')
  })

  it('has the usual podcast platforms, Spotify, Apple Podcasts and YouTube first', () => {
    expect(PODCAST_PLATFORMS.slice(0, 3)).toEqual(['spotify', 'apple', 'youtube'])
  })

  it('only lets web addresses through — never javascript:, data:, mailto: or a page of this site', () => {
    expect(safeWebUrl(' https://open.spotify.com/show/abc ')).toBe('https://open.spotify.com/show/abc')
    expect(safeWebUrl('http://example.com/feed')).toBe('http://example.com/feed')
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'mailto:a@b.c', '/podcasts', '//evil.com', 'https://a b.com', '', null, 5]) {
      expect(safeWebUrl(bad)).toBe('')
    }
  })

  it('cleans what is saved: bad links and pictures are dropped, texts are trimmed, unknown platforms ignored', () => {
    const banner = normalizePodcastBanner({
      enabled: true,
      imageUrl: 'https://cdn/x.webp',
      mobileImageUrl: 'javascript:alert(1)',
      altText: '  El podcast  ',
      links: { spotify: 'https://open.spotify.com/show/1', apple: 'javascript:alert(1)', tiktok: 'https://tiktok.com/x' },
    })
    expect(banner.enabled).toBe(true)
    expect(banner.imageUrl).toBe('https://cdn/x.webp')
    expect(banner.mobileImageUrl).toBe('')
    expect(banner.altText).toBe('El podcast')
    expect(banner.links.spotify).toBe('https://open.spotify.com/show/1')
    expect(banner.links.apple).toBe('')
    expect(Object.keys(banner.links)).toEqual([...PODCAST_PLATFORMS])
  })

  it('keeps at most two other platforms, and only those with a name and a valid link', () => {
    const banner = normalizePodcastBanner({
      others: [
        { label: 'iVoox', url: 'https://ivoox.com/x' },
        { label: '', url: 'https://nolabel.com' },
        { label: 'Bad', url: 'javascript:1' },
        { label: 'Podcast Addict', url: 'https://podcastaddict.com/x' },
        { label: 'Third', url: 'https://third.com' },
      ],
    })
    expect(banner.others).toEqual([
      { label: 'iVoox', url: 'https://ivoox.com/x' },
      { label: 'Podcast Addict', url: 'https://podcastaddict.com/x' },
    ])
  })

  it('lists only the platforms that have a link, in the usual order, then the others', () => {
    const banner = normalizePodcastBanner({
      links: { youtube: 'https://youtube.com/@x', spotify: 'https://open.spotify.com/show/1' },
      others: [{ label: 'iVoox', url: 'https://ivoox.com/x' }],
    })
    expect(platformLinks(banner).map((l) => [l.label, l.platform])).toEqual([['Spotify', 'spotify'], ['YouTube', 'youtube'], ['iVoox', null]])
  })
})
