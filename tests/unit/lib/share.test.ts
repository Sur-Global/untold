import { describe, it, expect } from 'vitest'
import { cleanShareUrl, shareLinks } from '@/lib/share'

const url = 'https://untold-six.vercel.app/es/articles/amazofuturismo'
const title = 'Amazofuturismo: ¿qué futuro?'
const byId = (links: ReturnType<typeof shareLinks>) => Object.fromEntries(links.map((l) => [l.id, l.href]))

describe('shareLinks', () => {
  it('lists the networks in the order the team chose, with email last, and Instagram only when asked (content that is pictures)', () => {
    expect(shareLinks({ url, title }).map((l) => l.id)).toEqual(['bluesky', 'linkedin', 'whatsapp', 'facebook', 'telegram', 'reddit', 'threads', 'x', 'email'])
    expect(shareLinks({ url, title, instagram: true }).map((l) => l.id)).toEqual(['bluesky', 'linkedin', 'instagram', 'whatsapp', 'facebook', 'telegram', 'reddit', 'threads', 'x', 'email'])
  })

  it('builds each network’s own address, with the link and title encoded', () => {
    const h = byId(shareLinks({ url, title }))
    const u = encodeURIComponent(url)
    const t = encodeURIComponent(title)
    const text = encodeURIComponent(`${title} ${url}`)
    expect(h.bluesky).toBe(`https://bsky.app/intent/compose?text=${text}`)
    expect(h.linkedin).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`)
    expect(h.whatsapp).toBe(`https://wa.me/?text=${text}`)
    expect(h.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${u}`)
    expect(h.telegram).toBe(`https://t.me/share/url?url=${u}&text=${t}`)
    expect(h.reddit).toBe(`https://www.reddit.com/submit?url=${u}&title=${t}`)
    expect(h.threads).toBe(`https://www.threads.net/intent/post?text=${text}`)
    expect(h.x).toBe(`https://twitter.com/intent/tweet?text=${t}&url=${u}`)
    expect(h.email).toBe(`mailto:?subject=${t}&body=${u}`)
  })

  it('has no web address for Instagram: its button hands the slides over as pictures instead', () => {
    expect(byId(shareLinks({ url, title, instagram: true })).instagram).toBeNull()
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
