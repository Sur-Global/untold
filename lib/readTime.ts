// lib/readTime.ts
// Extracts plain text from BlockNote block array or legacy Tiptap/ProseMirror JSON.

// --- BlockNote format ---
interface BlockNoteInlineContent {
  type: string
  text?: string
  content?: BlockNoteInlineContent[]
}
// A table keeps its text in rows of cells instead of a plain list of inline items
interface BlockNoteTableContent {
  rows?: { cells?: (BlockNoteInlineContent[] | { content?: BlockNoteInlineContent[] })[] }[]
}
interface BlockNoteBlock {
  type?: string
  content?: BlockNoteInlineContent[] | BlockNoteTableContent
  children?: BlockNoteBlock[]
}

const inlineText = (items: BlockNoteInlineContent[]): string => items.map((c) => c.text ?? '').join('')

function contentText(content: BlockNoteBlock['content']): string {
  if (Array.isArray(content)) return inlineText(content)
  const rows = content?.rows
  if (!Array.isArray(rows)) return ''
  return rows
    .flatMap((row) => row.cells ?? [])
    .map((cell) => inlineText(Array.isArray(cell) ? cell : cell?.content ?? []))
    .join(' ')
}

function extractBlockNoteText(blocks: BlockNoteBlock[]): string {
  return blocks
    .map((block) => {
      const inline = contentText(block.content)
      const children = block.children ? extractBlockNoteText(block.children) : ''
      return [inline, children].filter(Boolean).join(' ')
    })
    .join(' ')
}

// --- Legacy Tiptap format ---
interface TipTapNode {
  type?: string
  text?: string
  content?: TipTapNode[]
}

function extractTiptapText(node: TipTapNode): string {
  if (node.text) return node.text
  if (node.content) return node.content.map(extractTiptapText).join(' ')
  return ''
}

/** Returns estimated read time in minutes (minimum 1). */
export function computeReadTime(body: unknown): number {
  if (!body || typeof body !== 'object') return 1

  let text: string
  if (Array.isArray(body)) {
    text = extractBlockNoteText(body as BlockNoteBlock[]).trim()
  } else {
    text = extractTiptapText(body as TipTapNode).trim()
  }

  if (!text) return 1
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}
