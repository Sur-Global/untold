/**
 * Footnotes, as pure functions over BlockNote block JSON (no React, no editor).
 *
 * The model: a number in the text is an inline item `footnoteRef` ({ id }); the note itself is a `footnote` block ({ ref } = that id,
 * with its own rich text) that lives at the end of the article. Numbers are never stored: they are the order in which the numbers
 * appear in the text. The editor keeps the two halves in step (`planDuplicates`, `planNotes`) and the reader builds the notes
 * section from them (`prepareFootnotes`).
 */

export const FOOTNOTE_REF = 'footnoteRef'
export const FOOTNOTE = 'footnote'

export interface FnBlock {
  id?: string
  type?: string
  props?: Record<string, any>
  content?: any
  children?: FnBlock[]
}

/** A short id that is safe to use in an HTML id attribute. */
export function newFootnoteId(): string {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function cellItems(cell: any): any[] {
  return Array.isArray(cell) ? cell : Array.isArray(cell?.content) ? cell.content : []
}

/** Every inline item of a block, table cells included. */
export function inlineItems(block: FnBlock): any[] {
  const c = block.content
  if (Array.isArray(c)) return c
  if (c && Array.isArray(c.rows)) return c.rows.flatMap((row: any) => (row.cells ?? []).flatMap(cellItems))
  return []
}

function walk(blocks: FnBlock[], fn: (block: FnBlock) => void): void {
  for (const block of blocks ?? []) {
    fn(block)
    if (Array.isArray(block.children)) walk(block.children, fn)
  }
}

const refOf = (note: FnBlock): string => String(note.props?.ref ?? '')

/** The ids of the numbers in the text, in reading order (repeated when the same number is used twice). */
export function markerIds(blocks: FnBlock[]): string[] {
  const ids: string[] = []
  walk(blocks, (block) => {
    if (block.type === FOOTNOTE) return
    for (const item of inlineItems(block)) {
      if (item?.type === FOOTNOTE_REF && item.props?.id) ids.push(String(item.props.id))
    }
  })
  return ids
}

/** The note blocks, at any depth, in document order. */
export function findNotes(blocks: FnBlock[]): FnBlock[] {
  const notes: FnBlock[] = []
  walk(blocks, (block) => {
    if (block.type === FOOTNOTE) notes.push(block)
  })
  return notes
}

export function noteText(note: FnBlock): string {
  const text = (items: any[]): string =>
    items.map((item) => (typeof item?.text === 'string' ? item.text : Array.isArray(item?.content) ? text(item.content) : '')).join('')
  return text(inlineItems(note))
}

export const isEmptyNote = (note: FnBlock): boolean => noteText(note).trim() === ''

/** 1-based number of each id, by first appearance in the text. `only` limits it to the ids that count. */
export function footnoteNumbers(blocks: FnBlock[], only?: Set<string>): Map<string, number> {
  const numbers = new Map<string, number>()
  for (const id of markerIds(blocks)) {
    if (only && !only.has(id)) continue
    if (!numbers.has(id)) numbers.set(id, numbers.size + 1)
  }
  return numbers
}

/** A string that changes only when the structure changes (the numbers, the notes, which orphans are empty), not when a note is typed. */
export function footnoteSignature(blocks: FnBlock[]): string {
  const markers = markerIds(blocks)
  const known = new Set(markers)
  const notes = findNotes(blocks).map((n) => `${refOf(n)}${known.has(refOf(n)) ? '' : isEmptyNote(n) ? '!' : '?'}`)
  return `${markers.join(',')}|${notes.join(',')}`
}

// ─── Keeping the editor's two halves in step ────────────────────────────────────

/**
 * The same number used twice (a paragraph with a number was copied): the later ones get a new id, and each new id gets a copy of the
 * note. Returns null when there is nothing to do.
 */
export function planDuplicates(
  blocks: FnBlock[],
  makeId: () => string = newFootnoteId,
): { updates: { blockId: string; content: any[] }[]; clones: { from: string; to: string }[] } | null {
  const seen = new Set<string>()
  const updates: { blockId: string; content: any[] }[] = []
  const clones: { from: string; to: string }[] = []

  walk(blocks, (block) => {
    if (block.type === FOOTNOTE || !Array.isArray(block.content) || !block.id) return
    let changed = false
    const content = block.content.map((item: any) => {
      if (item?.type !== FOOTNOTE_REF || !item.props?.id) return item
      const id = String(item.props.id)
      if (!seen.has(id)) {
        seen.add(id)
        return item
      }
      const to = makeId()
      clones.push({ from: id, to })
      seen.add(to)
      changed = true
      return { ...item, props: { ...item.props, id: to } }
    })
    if (changed) updates.push({ blockId: block.id, content })
  })

  return updates.length ? { updates, clones } : null
}

export interface NotesPlan {
  /** numbers in the text that have no note yet */
  create: string[]
  /** notes to delete: empty ones whose number is gone, and repeated notes of the same number */
  remove: string[]
  /** the top-level notes in the order they should have, when they are not already */
  reorder: string[] | null
}

export function planNotes(blocks: FnBlock[]): NotesPlan {
  const markers = [...new Set(markerIds(blocks))]
  const inText = new Set(markers)
  const notes = findNotes(blocks)

  const seenRefs = new Set<string>()
  const remove: string[] = []
  for (const note of notes) {
    const ref = refOf(note)
    const repeated = seenRefs.has(ref)
    seenRefs.add(ref)
    if (note.id && (repeated || (!inText.has(ref) && isEmptyNote(note)))) remove.push(note.id)
  }

  const create = markers.filter((id) => !seenRefs.has(id))

  const top = blocks.filter((b) => b.type === FOOTNOTE && !remove.includes(b.id ?? ''))
  const rank = (note: FnBlock) => (inText.has(refOf(note)) ? markers.indexOf(refOf(note)) : Number.POSITIVE_INFINITY)
  const sorted = [...top].sort((a, b) => rank(a) - rank(b))
  const reorder = sorted.some((note, i) => note !== top[i]) ? sorted.map((n) => n.id!) : null

  return { create, remove, reorder }
}

function isEmptyParagraph(block: FnBlock): boolean {
  return block.type === 'paragraph' && inlineItems(block).every((i) => i?.type === 'text' && !String(i.text ?? '').trim()) && !(block.children?.length)
}

/** Where the note of `ref` goes so that the notes stay in the order of the numbers: next to its neighbours, or at the end of the article. */
export function notePlacement(blocks: FnBlock[], ref: string): { referenceId: string; placement: 'before' | 'after' } | null {
  const markers = [...new Set(markerIds(blocks))]
  const at = markers.indexOf(ref)
  const notes = blocks.filter((b) => b.type === FOOTNOTE && b.id)
  const noteOf = (id: string) => notes.find((n) => refOf(n) === id)

  for (let i = at - 1; i >= 0; i--) {
    const before = noteOf(markers[i])
    if (before) return { referenceId: before.id!, placement: 'after' }
  }
  for (let i = at + 1; i < markers.length; i++) {
    const after = noteOf(markers[i])
    if (after) return { referenceId: after.id!, placement: 'before' }
  }
  if (notes.length) return { referenceId: notes[notes.length - 1].id!, placement: 'after' }

  const last = blocks[blocks.length - 1]
  if (!last?.id) return null
  // BlockNote keeps an empty paragraph at the very end: the notes go above it, not below
  return { referenceId: last.id, placement: isEmptyParagraph(last) && blocks.length > 1 ? 'before' : 'after' }
}

// ─── Reading ────────────────────────────────────────────────────────────────────

export interface ReaderNote {
  ref: string
  n: number
  content: any[]
}

/**
 * What the reader needs: the body without the notes, with every number filled in (n, mode, label), and the notes in order.
 * A number whose note is empty or missing is left out, and the numbers are counted without it.
 */
export function prepareFootnotes(blocks: FnBlock[], noteLabel: (n: number) => string): { body: FnBlock[]; notes: ReaderNote[] } {
  const allNotes = findNotes(blocks)
  if (allNotes.length === 0 && markerIds(blocks).length === 0) return { body: blocks, notes: [] }

  const usable = new Map<string, FnBlock>()
  for (const note of allNotes) {
    if (!usable.has(refOf(note)) && !isEmptyNote(note)) usable.set(refOf(note), note)
  }
  const numbers = footnoteNumbers(blocks, new Set(usable.keys()))
  const firstSeen = new Set<string>()

  const strip = (list: FnBlock[]): FnBlock[] =>
    list
      .filter((block) => block.type !== FOOTNOTE)
      .map((block) => {
        const next: FnBlock = { ...block }
        if (Array.isArray(block.content)) next.content = mapItems(block.content)
        else if (block.content && Array.isArray(block.content.rows)) {
          next.content = {
            ...block.content,
            rows: block.content.rows.map((row: any) => ({
              ...row,
              cells: (row.cells ?? []).map((cell: any) =>
                Array.isArray(cell) ? mapItems(cell) : Array.isArray(cell?.content) ? { ...cell, content: mapItems(cell.content) } : cell,
              ),
            })),
          }
        }
        if (Array.isArray(block.children)) next.children = strip(block.children)
        return next
      })

  const mapItems = (items: any[]): any[] =>
    items.flatMap((item) => {
      if (item?.type !== FOOTNOTE_REF) return [item]
      const id = String(item.props?.id ?? '')
      const n = numbers.get(id)
      if (n === undefined) return [] // no note to point to: the number is not shown
      const mode = firstSeen.has(id) ? 'repeat' : 'link'
      firstSeen.add(id)
      return [{ ...item, props: { ...item.props, n: String(n), mode, label: noteLabel(n) } }]
    })

  let body = strip(blocks)
  const notes: ReaderNote[] = [...numbers.entries()]
    .map(([ref, n]) => ({ ref, n, content: inlineItems(usable.get(ref)!) }))
    .sort((a, b) => a.n - b.n)

  // the empty paragraph BlockNote leaves at the very end would sit between the text and the notes
  if (notes.length) {
    while (body.length > 1 && isEmptyParagraph(body[body.length - 1])) body = body.slice(0, -1)
  }
  return { body, notes }
}
