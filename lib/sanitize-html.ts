import DOMPurify from 'dompurify'
import { isAllowedIframeSrc } from '@/lib/video-embed'

// Anyone with an account can publish, so the HTML built from a body is cleaned before it is
// shown: no scripts, no inline event handlers, no javascript: links. The only iframes kept are
// the YouTube / Vimeo embeds our own video block produces.
let hooked = false

export function sanitizeReaderHtml(html: string): string {
  if (typeof window === 'undefined') return html // the reader only ever runs in the browser
  if (!hooked) {
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
      if (data.tagName === 'iframe' && !isAllowedIframeSrc((node as Element).getAttribute('src'))) {
        node.parentNode?.removeChild(node)
      }
    })
    hooked = true
  }
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'details', 'summary'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'loading', 'target', 'rel', 'open'],
  })
}
