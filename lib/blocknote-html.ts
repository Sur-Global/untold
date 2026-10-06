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

export function blocksToReaderHtml(editor: HtmlConverter, blocks: any[]): string {
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
    html += `<details class="bn-toggle">${summary}<div class="bn-toggle-body">${blocksToReaderHtml(editor, children)}</div></details>`
  }

  flush()
  return html
}
