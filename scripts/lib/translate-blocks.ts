/**
 * Translate an article by hand, block by block, without losing its formatting.
 *
 * `collectUnits` lists every piece of text in a body (paragraphs, headings, list items, table cells, image captions) as a short
 * mark-up string (**bold**, *italic*, [label](url)); you write the translation of each one; `applyUnits` puts them back into a
 * copy of the body with the same blocks, ids, links and styles. Nothing here talks to DeepL.
 */

type Inline = Record<string, any>
type Block = Record<string, any>

export interface Unit {
  /** where it lives, e.g. "3.content" / "12.content.rows.2.cells.1.content" / "5.props.caption" (children: "4.children.1.content") */
  path: string
  kind: 'inline' | 'caption'
  markup: string
  block: string
}

const esc = (s: string) => s

export function inlineToMarkup(items: Inline[]): string {
  let out = ''
  for (const i of items ?? []) {
    if (i.type === 'text') {
      const st = i.styles ?? {}
      // Raw colours and underlines come from text pasted out of Google Docs: the reader ignores them, so they are not carried over
      const extra = Object.keys(st).filter((k) => !['bold', 'italic', 'textColor', 'backgroundColor', 'underline'].includes(k) && st[k])
      if (extra.length) throw new Error(`unsupported style ${extra.join(',')} in "${i.text}"`)
      let t = esc(i.text)
      if (st.italic) t = `*${t}*`
      if (st.bold) t = `**${t}**`
      out += t
    } else if (i.type === 'link') {
      out += `[${inlineToMarkup(i.content)}](${i.href})`
    } else if (i.type === 'footnoteRef') {
      out += `{{fn:${i.props?.id}}}`
    } else throw new Error(`unsupported inline item ${i.type}`)
  }
  return out
}

/** Mark-up → inline content. Bold and italic can nest; a link's label can carry styles. */
export function markupToInline(src: string, styles: Record<string, boolean> = {}): Inline[] {
  const out: Inline[] = []
  // bold / italic may span several lines; a link's label may hold one level of brackets, e.g. a note marker [[2]](#fn2)
  const token = /\*\*([\s\S]+?)\*\*(?!\*)|\*([\s\S]+?)\*|\[((?:[^\[\]]|\[[^\]]*\])+)\]\(([^)\s]+)\)|\{\{fn:([A-Za-z0-9-]+)\}\}/g
  let last = 0
  const text = (t: string) => {
    if (t) out.push({ type: 'text', text: t, styles: { ...styles } })
  }
  for (const m of src.matchAll(token)) {
    text(src.slice(last, m.index))
    last = m.index! + m[0].length
    if (m[1] !== undefined) out.push(...markupToInline(m[1], { ...styles, bold: true }))
    else if (m[2] !== undefined) out.push(...markupToInline(m[2], { ...styles, italic: true }))
    else if (m[3] !== undefined) out.push({ type: 'link', href: m[4], content: markupToInline(m[3], styles) })
    else out.push({ type: 'footnoteRef', props: { id: m[5] } })
  }
  text(src.slice(last))
  return out
}

function tableCells(block: Block): { path: string; items: Inline[] }[] {
  const cells: { path: string; items: Inline[] }[] = []
  ;(block.content?.rows ?? []).forEach((row: any, ri: number) =>
    (row.cells ?? []).forEach((cell: any, ci: number) => {
      if (Array.isArray(cell?.content)) cells.push({ path: `content.rows.${ri}.cells.${ci}.content`, items: cell.content })
    }),
  )
  return cells
}

export function collectUnits(blocks: Block[], prefix = ''): Unit[] {
  const units: Unit[] = []
  blocks.forEach((block, bi) => {
    const base = `${prefix}${bi}`
    if (block.type !== 'codeBlock') {
      if (Array.isArray(block.content) && block.content.length) {
        units.push({ path: `${base}.content`, kind: 'inline', markup: inlineToMarkup(block.content), block: block.type })
      } else if (block.type === 'table') {
        for (const c of tableCells(block)) units.push({ path: `${base}.${c.path}`, kind: 'inline', markup: inlineToMarkup(c.items), block: 'tableCell' })
      }
      const caption = block.props?.caption
      if (typeof caption === 'string' && caption.trim()) units.push({ path: `${base}.props.caption`, kind: 'caption', markup: caption, block: block.type })
    }
    if (Array.isArray(block.children) && block.children.length) units.push(...collectUnits(block.children, `${base}.children.`))
  })
  return units
}

function setAt(root: any, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur = root
  for (let i = 0; i < parts.length - 1; i++) cur = Array.isArray(cur) ? cur[Number(parts[i])] : cur[parts[i]]
  const last = parts[parts.length - 1]
  if (Array.isArray(cur)) cur[Number(last)] = value
  else cur[last] = value
}

export function applyUnits(blocks: Block[], units: Unit[], translations: string[]): Block[] {
  if (units.length !== translations.length) throw new Error(`expected ${units.length} translations, got ${translations.length}`)
  const out = JSON.parse(JSON.stringify(blocks))
  units.forEach((u, i) => setAt(out, u.path, u.kind === 'caption' ? translations[i] : markupToInline(translations[i])))
  return out
}

/** Sanity check used before saving: same links, same number of paragraphs/cells, nothing left untranslated by mistake */
export function linksOf(markup: string): string[] {
  return [...markup.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1])
}

/** Bold/italic/links/footnote marks of an inline list in a comparable form (adjacent pieces with the same marks are merged; colours and underline are ignored) */
export function inlineShape(items: Inline[]): unknown[] {
  const out: any[] = []
  for (const i of items ?? []) {
    if (i.type === 'text') {
      const st = { bold: !!i.styles?.bold, italic: !!i.styles?.italic }
      const last = out[out.length - 1]
      if (last && last.t === 'text' && last.bold === st.bold && last.italic === st.italic) last.text += i.text
      else out.push({ t: 'text', text: i.text, ...st })
    } else if (i.type === 'link') out.push({ t: 'link', href: i.href, content: inlineShape(i.content) })
    else if (i.type === 'footnoteRef') out.push({ t: 'fn', id: i.props?.id })
  }
  return out
}
