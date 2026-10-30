/**
 * Converts BlockNote blocks to reader HTML.
 *
 * BlockNote's own lossy HTML export mangles toggles: a toggleListItem comes out
 * wrapped in a bullet <ul><li>, forced open, with any bullet-list children
 * spilled outside the <details>. So toggles (toggle list items and toggleable
 * headings) are rendered here as proper, collapsed-by-default <details>
 * elements with all their children inside; everything between toggles still
 * goes through BlockNote's converter unchanged.
 *
 * Footnotes: the numbers in the text become superscript links, and the notes (wherever they were typed) are laid out in one
 * section at the very end, in the order of the numbers, each with a link back to its number (see lib/footnotes.ts).
 */
import { FOOTNOTE, FOOTNOTE_REF, inlineItems, prepareFootnotes, type FnBlock, type ReaderNote } from '@/lib/footnotes'

interface HtmlConverter {
  blocksToHTMLLossy: (blocks: any[]) => string
}

function isToggle(block: any): boolean {
  return block?.type === 'toggleListItem' || (block?.type === 'heading' && block?.props?.isToggleable === true)
}

/**
 * An image block with no picture yet (a slot saved with its caption, waiting for the photo) would be drawn as the English
 * words "Add image". Readers should never see that: until the picture is there, the slot is simply left out.
 */
export function dropEmptyImages<T>(blocks: T): T {
  if (!Array.isArray(blocks)) return blocks
  return blocks
    .filter((block: any) => !(block?.type === 'image' && !String(block?.props?.url ?? '').trim()))
    .map((block: any) => (Array.isArray(block?.children) && block.children.length ? { ...block, children: dropEmptyImages(block.children) } : block)) as unknown as T
}

// Colors BlockNote's editor knows how to display (and reset with "Default").
const PALETTE = new Set(['default', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'])
const COLOR_KEYS = ['backgroundColor', 'textColor']

/**
 * Pasted content (Google Docs, web pages…) carries raw colors such as
 * rgb(0, 0, 0) on blocks and text. The editor can't render or reset those, so
 * authors never see them — but the published page applies them, producing
 * black highlights. Anything outside BlockNote's palette is treated as "default".
 */
export function normalizeBlockColors<T>(node: T): T {
  if (Array.isArray(node)) return node.map(normalizeBlockColors) as unknown as T
  if (node && typeof node === 'object') {
    const out: any = {}
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if ((key === 'props' || key === 'styles') && value && typeof value === 'object' && !Array.isArray(value)) {
        const cleaned: any = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (COLOR_KEYS.includes(k) && (typeof v !== 'string' || !PALETTE.has(v))) {
            if (key === 'props') cleaned[k] = 'default' // block props must keep a value
            continue // inline styles: drop the color entirely
          }
          cleaned[k] = v
        }
        out[key] = cleaned
      } else {
        out[key] = normalizeBlockColors(value)
      }
    }
    return out
  }
  return node
}

/**
 * True when the body has blocks or inline items that BlockNote draws with React (the video embed, footnotes). Turning those into
 * HTML renders React inside React, which is not allowed while a component is rendering: the reader waits until it has rendered.
 * Everything else converts instantly.
 */
export function needsReactRender(blocks: FnBlock[]): boolean {
  return blocks.some(
    (block) =>
      block?.type === 'videoEmbed' ||
      block?.type === FOOTNOTE ||
      inlineItems(block).some((item) => item?.type === FOOTNOTE_REF) ||
      (Array.isArray(block?.children) && needsReactRender(block.children)),
  )
}

export interface FootnoteLabels {
  /** heading of the notes section */
  title: string
  /** the link from a note back to its number in the text */
  back: string
  /** the name of a number for screen readers: "Note 3" */
  note: (n: number) => string
}

const DEFAULT_LABELS: FootnoteLabels = { title: 'Notes', back: 'Back to text', note: (n) => `Note ${n}` }

const escapeAttr = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function renderNotes(editor: HtmlConverter, notes: ReaderNote[], labels: FootnoteLabels): string {
  if (notes.length === 0) return ''
  const items = notes.map(({ ref, n, content }) => {
    const back = `<a class="fn-back" href="#fnref-${escapeAttr(ref)}" role="doc-backlink" aria-label="${escapeAttr(labels.back)}">\u21a9\ufe0e</a>`
    const html = editor.blocksToHTMLLossy([{ type: 'paragraph', content }]).trim()
    const inner = /<\/p>$/.test(html) ? html.replace(/<\/p>$/, ` ${back}</p>`) : `<p>${html} ${back}</p>`
    return `<li id="fn-${escapeAttr(ref)}" value="${n}" role="doc-endnote">${inner}</li>`
  })
  return (
    `<section class="fn-section" role="doc-endnotes" aria-labelledby="fn-title">` +
    `<h2 id="fn-title" class="fn-title">${escapeAttr(labels.title)}</h2><ol class="fn-list">${items.join('')}</ol></section>`
  )
}

export function blocksToReaderHtml(editor: HtmlConverter, blocks: any[], labels: FootnoteLabels = DEFAULT_LABELS): string {
  const { body, notes } = prepareFootnotes(normalizeBlockColors(dropEmptyImages(blocks)), labels.note)
  return renderBlocks(editor, body) + renderNotes(editor, notes, labels)
}

function renderBlocks(editor: HtmlConverter, blocks: any[]): string {
  let html = ''
  let batch: any[] = []

  const flush = () => {
    if (batch.length) html += editor.blocksToHTMLLossy(batch)
    batch = []
  }

  for (const block of blocks) {
    if (!isToggle(block)) {
      batch.push(block)
      continue
    }
    flush()

    // Render just the toggle's own line (no children) and lift its <summary>
    const own = editor.blocksToHTMLLossy([{ ...block, children: [] }])
    const summary = own.match(/<summary>[\s\S]*?<\/summary>/)?.[0]
    const children = Array.isArray(block.children) ? block.children : []

    if (!summary) {
      // Unknown markup — fall back to the converter's own output, children included
      html += editor.blocksToHTMLLossy([block])
      continue
    }
    html += `<details class="bn-toggle">${summary}<div class="bn-toggle-body">${renderBlocks(editor, children)}</div></details>`
  }

  flush()
  return html
}
