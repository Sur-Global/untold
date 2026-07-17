import { describe, it, expect } from 'vitest'
import { renderCreditHtml, insertBracketLink } from '@/lib/photo-credit'

describe('renderCreditHtml', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(renderCreditHtml(null)).toBe('')
    expect(renderCreditHtml(undefined)).toBe('')
    expect(renderCreditHtml('')).toBe('')
  })

  it('passes plain text through escaped', () => {
    expect(renderCreditHtml('Photo by Jane Doe')).toBe('Photo by Jane Doe')
    expect(renderCreditHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('converts a bracket link into a real anchor tag', () => {
    expect(renderCreditHtml('[Unsplash](https://unsplash.com/photos/abc)')).toBe(
      '<a href="https://unsplash.com/photos/abc" target="_blank" rel="noopener noreferrer nofollow">Unsplash</a>'
    )
  })

  it('handles a bracket link surrounded by plain text', () => {
    expect(renderCreditHtml('Photo: [Jane Doe](https://example.com) on Unsplash')).toBe(
      'Photo: <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">Jane Doe</a> on Unsplash'
    )
  })

  it('handles multiple bracket links', () => {
    expect(renderCreditHtml('[A](https://a.com) and [B](https://b.com)')).toBe(
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer nofollow">A</a> and <a href="https://b.com" target="_blank" rel="noopener noreferrer nofollow">B</a>'
    )
  })

  it('rejects non-http(s) schemes, leaving them as escaped plain text', () => {
    expect(renderCreditHtml('[Click me](javascript:alert(1))')).toBe(
      '[Click me](javascript:alert(1))'
    )
    expect(renderCreditHtml('[File](file:///etc/passwd)')).toBe('[File](file:///etc/passwd)')
  })

  it('escapes quotes and angle brackets inside the label and url', () => {
    expect(renderCreditHtml('[<b>Bold</b>](https://example.com/"onmouseover="x)')).toBe(
      '<a href="https://example.com/&quot;onmouseover=&quot;x" target="_blank" rel="noopener noreferrer nofollow">&lt;b&gt;Bold&lt;/b&gt;</a>'
    )
  })
})

describe('insertBracketLink', () => {
  it('inserts the snippet at the cursor position', () => {
    expect(insertBracketLink('Photo:  taken by me', 7, 'Jane', 'https://example.com')).toBe(
      'Photo: [Jane](https://example.com) taken by me'
    )
  })

  it('appends with a leading space when there is no cursor position', () => {
    expect(insertBracketLink('Photo:', null, 'Jane', 'https://example.com')).toBe(
      'Photo: [Jane](https://example.com)'
    )
  })

  it('returns just the snippet when text is empty', () => {
    expect(insertBracketLink('', null, 'Jane', 'https://example.com')).toBe(
      '[Jane](https://example.com)'
    )
  })
})
