// lib/readTime.ts
// Extracts plain text from BlockNote block array or legacy Tiptap/ProseMirror JSON.

// --- BlockNote format ---
interface BlockNoteInlineContent {
  type: string
  text?: string
  content?: BlockNoteInlineContent[]
}
interface BlockNoteBlock {
  type?: string
  content?: BlockNoteInlineContent[]
  children?: BlockNoteBlock[]
}

function extractBlockNoteText(blocks: BlockNoteBlock[]): string {
  return blocks
    .map((block) => {
      const inline = (block.content ?? []).map((c) => c.text ?? '').join('')
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
