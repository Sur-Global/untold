// lib/readTime.ts
// Extracts plain text from a TipTap/ProseMirror JSON document tree.

interface TipTapNode {
  type?: string
  text?: string
  content?: TipTapNode[]
}

function extractText(node: TipTapNode): string {
  if (node.text) return node.text
  if (node.content) return node.content.map(extractText).join(' ')
  return ''
}

/** Returns estimated read time in minutes (minimum 1). */
export function computeReadTime(body: unknown): number {
  if (!body || typeof body !== 'object') return 1
  const text = extractText(body as TipTapNode).trim()
  if (!text) return 1
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}
