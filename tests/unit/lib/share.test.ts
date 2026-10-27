import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanShareUrl, copyText, emailShareHref } from '@/lib/share'

describe('emailShareHref', () => {
  it('opens the mail with the title as the subject and the link inside, both encoded', () => {
    const url = 'https://untold-six.vercel.app/es/articles/amazofuturismo'
    expect(emailShareHref({ url, title: 'Amazofuturismo: ¿qué futuro?' })).toBe(`mailto:?subject=${encodeURIComponent('Amazofuturismo: ¿qué futuro?')}&body=${encodeURIComponent(url)}`)
  })

  it('never lets a title break the address', () => {
    const href = emailShareHref({ url: 'https://x.org/a?b=1', title: 'A & B? #1 "ok"' })
    expect(href).toContain('subject=A%20%26%20B%3F%20%231%20%22ok%22')
    expect(href).not.toContain('"')
    expect(href.split('&body=')).toHaveLength(2)
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

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, { clipboard: undefined })
    delete (document as any).execCommand
    document.body.innerHTML = ''
  })

  it('uses the clipboard of the browser', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    expect(await copyText('https://x.org/a')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://x.org/a')
  })

  it('tries the old way when the browser does not allow the clipboard', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } })
    const execCommand = vi.fn().mockReturnValue(true)
    ;(document as any).execCommand = execCommand
    expect(await copyText('https://x.org/a')).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull() // the temporary box is removed
  })

  it('says it could not copy when nothing worked, so the link can be shown to copy by hand', async () => {
    Object.assign(navigator, { clipboard: undefined })
    expect(await copyText('https://x.org/a')).toBe(false)
    ;(document as any).execCommand = vi.fn().mockReturnValue(false)
    expect(await copyText('https://x.org/a')).toBe(false)
  })
})
