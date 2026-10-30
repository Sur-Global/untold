// lib/blocknote-translate.ts
// Extracts and injects translatable text in BlockNote block arrays.
// Only touches inline text; skips code blocks.

interface InlineContent {
  type: string
  text?: string
  styles?: Record<string, unknown>
  href?: string
  content?: InlineContent[]
}

// A table keeps its text in rows of cells; a cell is a list of inline items or an object holding one
interface TableContent {
  rows?: { cells?: (InlineContent[] | { content?: InlineContent[] })[] }[]
}

interface Block {
  id?: string
  type?: string
  props?: Record<string, unknown>
  content?: InlineContent[] | TableContent
  children?: Block[]
}

export interface TextEntry {
  path: string  // dot-separated path, e.g. "0.content.1.text"
  text: string
}

function walkBlocks(blocks: Block[], pathPrefix: string, entries: TextEntry[]): void {
  blocks.forEach((block, bi) => {
    if (block.type === 'codeBlock') return
    if (Array.isArray(block.content)) {
      walkInline(block.content, `${pathPrefix}${bi}.content`, entries)
    } else if (block.content && Array.isArray(block.content.rows)) {
      walkTable(block.content.rows, `${pathPrefix}${bi}.content.rows`, entries)
    }
    if (block.children) {
      walkBlocks(block.children, `${pathPrefix}${bi}.children.`, entries)
    }
  })
}

function walkTable(rows: NonNullable<TableContent['rows']>, pathPrefix: string, entries: TextEntry[]): void {
  rows.forEach((row, ri) => {
    row.cells?.forEach((cell, ci) => {
      const cellPath = `${pathPrefix}.${ri}.cells.${ci}`
      if (Array.isArray(cell)) walkInline(cell, cellPath, entries)
      else if (Array.isArray(cell?.content)) walkInline(cell.content, `${cellPath}.content`, entries)
    })
  })
}

function walkInline(items: InlineContent[], pathPrefix: string, entries: TextEntry[]): void {
  items.forEach((item, ii) => {
    if (item.type === 'text' && item.text) {
      entries.push({ path: `${pathPrefix}.${ii}.text`, text: item.text })
    } else if (item.content) {
      walkInline(item.content, `${pathPrefix}.${ii}.content`, entries)
    }
  })
}

export function extractBlockNoteTextNodes(blocks: Block[]): TextEntry[] {
  const entries: TextEntry[] = []
  walkBlocks(blocks, '', entries)
  return entries
}

function setAtPath(obj: unknown, path: string, value: string): void {
  const parts = path.split('.')
  let current: unknown = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (Array.isArray(current)) {
      current = (current as unknown[])[parseInt(key)]
    } else {
      current = (current as Record<string, unknown>)[key]
    }
  }
  const lastKey = parts[parts.length - 1]
  if (Array.isArray(current)) {
    (current as unknown[])[parseInt(lastKey)] = value
  } else {
    (current as Record<string, unknown>)[lastKey] = value
  }
}

export function injectBlockNoteTextNodes(
  blocks: Block[],
  translations: string[],
  entries: TextEntry[],
): Block[] {
  if (translations.length !== entries.length) {
    throw new Error(`translations length must equal entries length`)
  }
  const result: Block[] = JSON.parse(JSON.stringify(blocks))
  entries.forEach((entry, i) => {
    setAtPath(result, entry.path, translations[i])
  })
  return result
}
