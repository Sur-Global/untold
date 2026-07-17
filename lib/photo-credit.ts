// Photo credit fields (cover image credit, inline body-image captions) are stored as
// plain text that may contain a `[label](url)` bracket-link. renderCreditHtml turns
// that into a safe, real <a> tag at render time — no other HTML is ever accepted.

const BRACKET_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderCreditHtml(text: string | null | undefined): string {
  if (!text) return ''

  let html = ''
  let lastIndex = 0
  for (const match of text.matchAll(BRACKET_LINK_RE)) {
    const [full, label, url] = match
    const index = match.index ?? 0
    html += escapeHtml(text.slice(lastIndex, index))
    html += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(label)}</a>`
    lastIndex = index + full.length
  }
  html += escapeHtml(text.slice(lastIndex))
  return html
}

// Wraps `label`/`url` into the bracket syntax and inserts it into `text` at `cursorIndex`
// (or appends with a leading space if there's no cursor position / nothing selected).
export function insertBracketLink(text: string, cursorIndex: number | null, label: string, url: string): string {
  const snippet = `[${label}](${url})`
  if (cursorIndex === null || cursorIndex < 0 || cursorIndex > text.length) {
    return text ? `${text} ${snippet}` : snippet
  }
  return text.slice(0, cursorIndex) + snippet + text.slice(cursorIndex)
}
