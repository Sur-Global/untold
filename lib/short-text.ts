/** A text cut to at most `max` characters at the end of a sentence or, failing that, of a word, with "…" when it was cut */
export function shortText(text: string, max = 260): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  if (sentence >= max * 0.5) return cut.slice(0, sentence + 1)
  const space = cut.lastIndexOf(' ')
  return `${cut.slice(0, space > 0 ? space : max).replace(/[,;:\s]+$/, '')}…`
}
