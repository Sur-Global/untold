/**
 * Helpers to write an article draft straight into the database, in the same shape the editor saves it:
 * BlockNote blocks (paragraphs, headings, lists, images, tables) and footnotes (a number in the text + a note block at the end).
 *
 * Text is written with a tiny mark-up that only exists in these scripts (the platform itself has no markdown):
 *   **bold**   *italic*   [label](https://link)   {{fn:key}} = a footnote number whose note is registered with note(key, '…')
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

type Inline = Record<string, any>
export type Block = Record<string, any>

const BASE = { textColor: 'default', textAlignment: 'left', backgroundColor: 'default' }

export class Draft {
  private blocks: Block[] = []
  private noteTexts = new Map<string, string>()
  private noteIds = new Map<string, string>()

  /** A footnote: `key` is what {{fn:key}} refers to in the text */
  note(key: string, text: string): void {
    this.noteTexts.set(key, text)
  }

  private idFor(key: string): string {
    if (!this.noteIds.has(key)) this.noteIds.set(key, randomBytes(5).toString('hex'))
    return this.noteIds.get(key)!
  }

  /** Turns the mark-up into BlockNote inline content */
  inline(src: string): Inline[] {
    const out: Inline[] = []
    const token = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)|\{\{fn:([a-z0-9-]+)\}\}/gi
    let last = 0
    const push = (text: string, styles: Record<string, boolean> = {}) => {
      if (text) out.push({ type: 'text', text, styles })
    }
    for (const m of src.matchAll(token)) {
      push(src.slice(last, m.index))
      last = m.index! + m[0].length
      if (m[1] !== undefined) push(m[1], { bold: true })
      else if (m[2] !== undefined) push(m[2], { italic: true })
      else if (m[3] !== undefined) out.push({ type: 'link', href: m[4], content: [{ type: 'text', text: m[3], styles: {} }] })
      else {
        const key = m[5]
        if (!this.noteTexts.has(key)) throw new Error(`footnote "${key}" has no note`)
        out.push({ type: 'footnoteRef', props: { id: this.idFor(key) } })
      }
    }
    push(src.slice(last))
    return out
  }

  /** Same, but the whole text carries these styles (e.g. a bold italic standfirst) */
  styled(src: string, styles: Record<string, boolean>): Inline[] {
    return this.inline(src).map((i) => (i.type === 'text' ? { ...i, styles: { ...i.styles, ...styles } } : i))
  }

  p(src: string | Inline[], opts: { align?: 'left' | 'center' | 'right'; styles?: Record<string, boolean> } = {}): this {
    const content = typeof src === 'string' ? (opts.styles ? this.styled(src, opts.styles) : this.inline(src)) : src
    this.blocks.push({ id: randomUUID(), type: 'paragraph', props: { ...BASE, textAlignment: opts.align ?? 'left' }, content, children: [] })
    return this
  }

  h(level: 1 | 2 | 3, text: string): this {
    this.blocks.push({ id: randomUUID(), type: 'heading', props: { ...BASE, level, isToggleable: false }, content: this.inline(text), children: [] })
    return this
  }

  bullet(src: string): this {
    this.blocks.push({ id: randomUUID(), type: 'bulletListItem', props: { ...BASE }, content: this.inline(src), children: [] })
    return this
  }

  /** An image slot with its caption and no picture yet: whoever edits the draft adds the photo */
  imageSlot(caption: string): this {
    this.blocks.push({
      id: randomUUID(),
      type: 'image',
      props: { url: '', name: '', caption, showPreview: true, textAlignment: 'center', backgroundColor: 'default' },
      children: [],
    })
    return this
  }

  /**
   * A table. Each cell is a string, or { text, span } for a cell that covers several columns.
   * `header` = how many rows at the top are headings; `widths` = column widths in pixels (otherwise they share the space equally).
   */
  table(rows: (string | { text: string; span?: number })[][], header = 1, widths?: number[]): this {
    this.blocks.push({
      id: randomUUID(),
      type: 'table',
      props: { textColor: 'default' },
      content: {
        type: 'tableContent',
        columnWidths:
          widths ?? Array(Math.max(...rows.map((r) => r.reduce((n, c) => n + (typeof c === 'string' ? 1 : c.span ?? 1), 0)))).fill(undefined),
        headerRows: header,
        rows: rows.map((row, ri) => ({
          cells: row.map((cell) => {
            const text = typeof cell === 'string' ? cell : cell.text
            const span = typeof cell === 'string' ? 1 : cell.span ?? 1
            const content = ri < header ? this.styled(text, { bold: true }) : this.inline(text)
            return {
              type: 'tableCell',
              content,
              props: { colspan: span, rowspan: 1, backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
            }
          }),
        })),
      },
      children: [],
    })
    return this
  }

  /** The finished body: the blocks, then one note block per number, in the order the numbers appear in the text */
  build(): Block[] {
    const order: string[] = []
    const seen = (items: any): void => {
      for (const item of Array.isArray(items) ? items : []) {
        if (item?.type === 'footnoteRef') order.push(item.props.id)
        else if (Array.isArray(item?.content)) seen(item.content)
      }
    }
    const walkCells = (content: any): void => {
      if (Array.isArray(content)) return seen(content)
      for (const row of content?.rows ?? []) for (const cell of row.cells ?? []) seen(cell.content)
    }
    for (const block of this.blocks) walkCells(block.content)

    const keyById = new Map([...this.noteIds].map(([key, id]) => [id, key]))
    const unused = [...this.noteTexts.keys()].filter((k) => !this.noteIds.has(k))
    if (unused.length) throw new Error(`notes never used in the text: ${unused.join(', ')}`)

    const notes = order.map((id) => ({
      id: randomUUID(),
      type: 'footnote',
      props: { ref: id },
      content: this.inline(this.noteTexts.get(keyById.get(id)!)!),
      children: [],
    }))
    return [...this.blocks, ...notes]
  }
}

// ─── Saving ───────────────────────────────────────────────────────────────────────────────────

export const slugOf = (title: string): string =>
  title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

/** Same count the editor uses to estimate reading time (200 words a minute) */
function readTime(blocks: Block[]): number {
  const words: string[] = []
  const grab = (items: any): void => {
    for (const i of Array.isArray(items) ? items : []) {
      if (typeof i?.text === 'string') words.push(i.text)
      else if (Array.isArray(i?.content)) grab(i.content)
    }
  }
  for (const b of blocks) {
    if (Array.isArray(b.content)) grab(b.content)
    else for (const row of b.content?.rows ?? []) for (const cell of row.cells ?? []) grab(cell.content)
  }
  const count = words.join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(count / 200))
}

export interface DraftInput {
  title: string
  /** shown as the subtitle under the title */
  excerpt: string | null
  authorId: string
  sourceLocale: string
  imageCredits?: string | null
  body: Block[]
}

/** Creates the article as a draft, the way the "new article" form does. Refuses if one with that title already exists. */
export async function saveDraft(input: DraftInput): Promise<{ id: string; slug: string; readMinutes: number }> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: same } = await sb
    .from('content_translations')
    .select('content_id, content!inner(type, status)')
    .eq('locale', input.sourceLocale)
    .eq('title', input.title)
    .eq('content.type', 'article')
    .limit(1)
  if (same && same.length) throw new Error(`An article titled "${input.title}" already exists (${same[0].content_id}); not creating a second one.`)

  const slug = `${slugOf(input.title)}-${Date.now().toString(36)}`
  const { data: content, error } = await sb
    .from('content')
    .insert({
      type: 'article',
      author_id: input.authorId,
      slug,
      source_locale: input.sourceLocale,
      status: 'draft',
      // The editor's database trigger sets this for content created by an admin/editor/author, but it leaves service-role inserts
      // alone, so without it the article would be left out of /articles, search and the tag pages once published.
      is_curated: true,
      cover_image_url: null,
      image_credits: input.imageCredits ?? null,
      declaration_accepted_at: null,
    })
    .select('id')
    .single()
  if (error || !content) throw new Error(error?.message ?? 'Could not create the article')

  const { error: trError } = await sb.from('content_translations').insert({
    content_id: content.id,
    locale: input.sourceLocale,
    title: input.title,
    excerpt: input.excerpt,
    featured_summary: null,
    body: input.body,
  })
  if (trError) {
    await sb.from('content').delete().eq('id', content.id) // do not leave an empty article behind
    throw new Error(trError.message)
  }

  const readMinutes = readTime(input.body)
  await sb.from('content').update({ read_time_minutes: readMinutes }).eq('id', content.id)

  return { id: content.id, slug, readMinutes }
}
