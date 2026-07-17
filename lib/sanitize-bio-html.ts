// Defense-in-depth backstop for the bio field. The primary safeguard is that
// components/profile/BioEditor.tsx's Tiptap schema can only ever produce these
// tags in the first place — this exists in case updateProfile() is ever called
// directly, bypassing the client editor.

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'a'])

export function sanitizeBioHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagNameRaw, attrs) => {
    const tag = String(tagNameRaw).toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''

    const isClosing = match.startsWith('</')
    if (isClosing) return `</${tag}>`

    if (tag === 'a') {
      const hrefMatch = /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(attrs)
      const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? ''
      if (!/^https?:\/\//i.test(href)) return ''
      return `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer nofollow">`
    }

    return `<${tag}>`
  })
}
