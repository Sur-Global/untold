import { describe, it, expect } from 'vitest'
import { cleanShareUrl, shareLinks } from '@/lib/share'

const url = 'https://untold-six.vercel.app/es/articles/amazofuturismo'
const title = 'Amazofuturismo: ¿qué futuro?'
const byId = (links: ReturnType<typeof shareLinks>) => Object.fromEntries(links.map((l) => [l.id, l.href]))

describe('shareLinks', () => {
  it('has the networks people use most, in order, with email last', () => {
    const links = shareLinks({ url, title, image: 'https://cdn/cover.webp' })
    expect(links.map((l) => l.id)).toEqual(['whatsapp', 'facebook', 'x', 'linkedin', 'telegram', 'reddit', 'pinterest', 'threads', 'bluesky', 'email'])
  })

  it('builds each network’s own address, with the link and title encoded', () => {
    const h = byId(shareLinks({ url, title, image: 'https://cdn/cover.webp' }))
    const u = encodeURIComponent(url)
    const t = encodeURIComponent(title)
    expect(h.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${u}`)
    expect(h.linkedin).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`)
    expect(h.x).toBe(`https://twitter.com/intent/tweet?text=${t}&url=${u}`)
    expect(h.telegram).toBe(`https://t.me/share/url?url=${u}&text=${t}`)
    expect(h.reddit).toBe(`https://www.reddit.com/submit?url=${u}&title=${t}`)
    expect(h.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`)
    expect(h.threads).toContain('threads.net/intent/post?text=')
    expect(h.bluesky).toContain('https://bsky.app/intent/compose?text=')
    expect(h.pinterest).toBe(`https://pinterest.com/pin/create/button/?url=${u}&media=${encodeURIComponent('https://cdn/cover.webp')}&description=${t}`)
    expect(h.email).toBe(`mailto:?subject=${t}&body=${u}`)
  })

  it('leaves Pinterest out when the page has no picture to pin', () => {
    expect(shareLinks({ url, title }).map((l) => l.id)).not.toContain('pinterest')
  })

  it('never lets a title break the address', () => {
    const h = byId(shareLinks({ url, title: 'A & B? #1 "ok"' }))
    expect(h.facebook).not.toContain('"')
    expect(h.x).toContain('text=A%20%26%20B%3F%20%231%20%22ok%22')
  })
})

describe('cleanShareUrl', () => {
  it('drops tracking parameters and the #anchor', () => {
    expect(cleanShareUrl('https://untold-six.vercel.app/es/articles/x?utm_source=a&ref=b#seccion')).toBe('https://untold-six.vercel.app/es/articles/x')
  })
  it('returns anything that is not an address as it is', () => {
    expect(cleanShareUrl('nope')).toBe('nope')
  })
})
