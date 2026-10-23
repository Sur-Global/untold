import { describe, it, expect } from 'vitest'
import { DEFAULT_HOME_BANNERS, normalizeHomeBanners, safeBannerLink, isExternalLink } from '@/lib/home-banners'

describe('safeBannerLink', () => {
  it('accepts other sites, pages of this site and email links', () => {
    expect(safeBannerLink('https://brand.com/campaign?x=1')).toBe('https://brand.com/campaign?x=1')
    expect(safeBannerLink('  /courses ')).toBe('/courses')
    expect(safeBannerLink('mailto:ads@untold.ink')).toBe('mailto:ads@untold.ink')
  })

  it('rejects anything that could run code or leave the site unnoticed', () => {
    expect(safeBannerLink('javascript:alert(1)')).toBe('')
    expect(safeBannerLink('data:text/html;base64,AAAA')).toBe('')
    expect(safeBannerLink('//evil.example/x')).toBe('')
    expect(safeBannerLink('brand.com')).toBe('')
    expect(safeBannerLink('https://a b.com')).toBe('')
    expect(safeBannerLink(42)).toBe('')
  })
})

describe('normalizeHomeBanners', () => {
  it('falls back to UNTOLD’s own promo for both slots when nothing was saved', () => {
    expect(normalizeHomeBanners(null)).toEqual(DEFAULT_HOME_BANNERS)
    expect(normalizeHomeBanners({})).toEqual(DEFAULT_HOME_BANNERS)
    expect(DEFAULT_HOME_BANNERS.top.enabled).toBe(true)
    expect(DEFAULT_HOME_BANNERS.top.imageUrl).toBe('')
  })

  it('keeps good values, trims text and drops unsafe ones', () => {
    const out = normalizeHomeBanners({
      top: {
        enabled: false,
        imageUrl: ' https://x.supabase.co/storage/v1/object/public/content-images/banners/a.webp ',
        mobileImageUrl: 'javascript:alert(1)',
        linkUrl: 'javascript:alert(1)',
        altText: '  Brand X  ',
        sponsor: 'x'.repeat(200),
        showLabel: true,
      },
    })
    expect(out.top.enabled).toBe(false)
    expect(out.top.imageUrl).toBe('https://x.supabase.co/storage/v1/object/public/content-images/banners/a.webp')
    expect(out.top.mobileImageUrl).toBe('')
    expect(out.top.linkUrl).toBe('')
    expect(out.top.altText).toBe('Brand X')
    expect(out.top.sponsor).toHaveLength(80)
    expect(out.top.showLabel).toBe(true)
    expect(out.bottom).toEqual(DEFAULT_HOME_BANNERS.bottom)
  })
})

describe('isExternalLink', () => {
  it('tells other sites from pages of this site', () => {
    expect(isExternalLink('https://brand.com')).toBe(true)
    expect(isExternalLink('/courses')).toBe(false)
  })
})
