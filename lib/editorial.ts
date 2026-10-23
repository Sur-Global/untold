// Small helpers for the homepage "Lo más reciente" section.

interface BlockNoteBlock { type?: string; content?: { type?: string; text?: string; content?: { text?: string }[] }[]; children?: BlockNoteBlock[] }
interface TiptapNode { type?: string; text?: string; content?: TiptapNode[] }

const inlineText = (items: BlockNoteBlock['content']) =>
  (items ?? []).map((i) => (i.type === 'link' ? (i.content ?? []).map((c) => c.text ?? '').join('') : i.text ?? '')).join('')

const tiptapText = (n: TiptapNode): string => (n.text ?? '') + (n.content ?? []).map(tiptapText).join('')

/** The paragraphs of an article body (BlockNote blocks or older Tiptap JSON), as plain text */
function paragraphs(body: unknown): string[] {
  if (Array.isArray(body)) {
    return (body as BlockNoteBlock[])
      .filter((b) => b.type === 'paragraph')
      .map((b) => inlineText(b.content).replace(/\s+/g, ' ').trim())
  }
  if (body && typeof body === 'object') {
    const doc = body as TiptapNode
    return (doc.content ?? []).filter((n) => n.type === 'paragraph').map((n) => tiptapText(n).replace(/\s+/g, ' ').trim())
  }
  return []
}

/**
 * A short opening for an article that has no written summary: its first real paragraph
 * (skipping the "Por …" byline and one-liners), cut at a word.
 */
export function bodyExcerpt(body: unknown, max = 280): string {
  const first = paragraphs(body).find((p) => p.length >= 60 && !/^[-–\s]*por\s/i.test(p))
  if (!first) return ''
  if (first.length <= max) return first
  const cut = first.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…'
}

/** True when a date is within the last `days` days */
export function isRecent(dateIso: string | null | undefined, days = 7, now: number = Date.now()): boolean {
  if (!dateIso) return false
  const t = new Date(dateIso).getTime()
  return Number.isFinite(t) && now - t >= 0 && now - t <= days * 86_400_000
}
