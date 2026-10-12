import { describe, it, expect } from 'vitest'
import { sanitizeReaderHtml } from '@/lib/sanitize-html'

describe('sanitizeReaderHtml', () => {
  it('removes scripts, inline handlers and javascript: links', () => {
    const out = sanitizeReaderHtml(
      '<p onclick="steal()">hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">',
    )
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i)
    expect(out).toContain('hi')
  })

  it('keeps normal article markup, links, collapsed toggles and video files', () => {
    const html =
      '<h2>Title</h2><p><strong>bold</strong> <a href="https://example.com" target="_blank" rel="noopener">link</a></p>' +
      '<details class="bn-toggle"><summary>More</summary><p>inside</p></details>' +
      '<figure><img src="https://x/y.webp"><figcaption>cap</figcaption></figure>' +
      '<div class="bn-embed"><video src="https://x/clip.mp4" controls></video></div>'
    const out = sanitizeReaderHtml(html)
    expect(out).toContain('<details class="bn-toggle">')
    expect(out).toContain('<figcaption>cap</figcaption>')
    expect(out).toContain('<video')
    expect(out).toContain('target="_blank"')
  })

  it('keeps YouTube and Vimeo embeds but drops any other iframe', () => {
    const out = sanitizeReaderHtml(
      '<div class="bn-embed"><iframe src="https://www.youtube-nocookie.com/embed/abc123" allowfullscreen></iframe></div>' +
        '<div class="bn-embed"><iframe src="https://player.vimeo.com/video/123456"></iframe></div>' +
        '<div><iframe src="https://evil.example.com/phish"></iframe></div>',
    )
    expect(out).toContain('youtube-nocookie.com/embed/abc123')
    expect(out).toContain('player.vimeo.com/video/123456')
    expect(out).not.toContain('evil.example.com')
  })
})
