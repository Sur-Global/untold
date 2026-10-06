/**
 * Converts BlockNote blocks to reader HTML.
 *
 * BlockNote's own lossy HTML export mangles toggles: a toggleListItem comes out
 * wrapped in a bullet <ul><li>, forced open, with any bullet-list children
 * spilled outside the <details>. So toggles (toggle list items and toggleable
 * headings) are rendered here as proper, collapsed-by-default <details>
 * elements with all their children inside; everything between toggles still
 * goes through BlockNote's converter unchanged.
 */
interface HtmlConverter {
  blocksToHTMLLossy: (blocks: any[]) => string
}

function isToggle(block: any): boolean {
  return block?.type === 'toggleListItem' || (block?.type === 'heading' && block?.props?.isToggleable === true)
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

export function blocksToReaderHtml(editor: HtmlConverter, blocks: any[]): string {
  return renderBlocks(editor, normalizeBlockColors(blocks))
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
