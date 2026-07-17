import { describe, it, expect } from 'vitest'
import { sanitizeBioHtml } from '@/lib/sanitize-bio-html'

describe('sanitizeBioHtml', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(sanitizeBioHtml(null)).toBe('')
    expect(sanitizeBioHtml(undefined)).toBe('')
    expect(sanitizeBioHtml('')).toBe('')
  })

  it('keeps allowed tags as-is', () => {
    expect(sanitizeBioHtml('<p>Hello <strong>world</strong> <em>!</em></p>')).toBe(
      '<p>Hello <strong>world</strong> <em>!</em></p>'
    )
  })

  it('rewrites a valid http(s) link with a safe target/rel, dropping other attrs', () => {
    expect(sanitizeBioHtml('<a href="https://example.com" onclick="evil()">link</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">link</a>'
    )
  })

  it('drops a link with a non-http(s) href, keeping the inner text', () => {
    expect(sanitizeBioHtml('<a href="javascript:alert(1)">click</a>')).toBe('click</a>')
  })

  it('strips disallowed tags but keeps their text content', () => {
    expect(sanitizeBioHtml('<script>alert(1)</script>')).toBe('alert(1)')
    expect(sanitizeBioHtml('<div onclick="evil()">text</div>')).toBe('text')
  })

  it('strips attributes from allowed non-link tags', () => {
    expect(sanitizeBioHtml('<strong onclick="evil()">bold</strong>')).toBe('<strong>bold</strong>')
  })

  it('removes an img tag entirely (self-closing, disallowed)', () => {
    expect(sanitizeBioHtml('before <img src=x onerror="alert(1)"> after')).toBe('before  after')
  })
})
