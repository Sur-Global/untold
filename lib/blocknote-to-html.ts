// lib/blocknote-to-html.ts
// Converts BlockNote block array to HTML without any runtime dependencies.
// Supports the standard block types BlockNote ships with.

interface InlineStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  textColor?: string
  backgroundColor?: string
}

interface InlineContent {
  type: 'text' | 'link' | string
  text?: string
  styles?: InlineStyle
  href?: string
  content?: InlineContent[]
}

interface Block {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: InlineContent[]
  children?: Block[]
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineToHtml(items: InlineContent[]): string {
  return items
    .map((item) => {
      if (item.type === 'link') {
        const inner = inlineToHtml(item.content ?? [])
        return `<a href="${escapeHtml(item.href ?? '')}" rel="noopener noreferrer">${inner}</a>`
      }
      const text = escapeHtml(item.text ?? '')
      const s = item.styles ?? {}
      let out = text
      if (s.code) out = `<code>${out}</code>`
      if (s.bold) out = `<strong>${out}</strong>`
      if (s.italic) out = `<em>${out}</em>`
      if (s.underline) out = `<u>${out}</u>`
      if (s.strikethrough) out = `<s>${out}</s>`
      return out
    })
    .join('')
}

function blockToHtml(block: Block): string {
  const inner = block.content ? inlineToHtml(block.content) : ''
  const children = block.children ? blocksToHtml(block.children) : ''
  const p = block.props ?? {}

  switch (block.type) {
    case 'paragraph':
      return `<p>${inner || '&nbsp;'}</p>${children}`

    case 'heading': {
      const level = (p.level as number) ?? 1
      return `<h${level}>${inner}</h${level}>${children}`
    }

    case 'bulletListItem':
      return `<li>${inner}${children ? `<ul>${children}</ul>` : ''}</li>`

    case 'numberedListItem':
      return `<li>${inner}${children ? `<ol>${children}</ol>` : ''}</li>`

    case 'checkListItem': {
      const checked = p.checked ? ' checked' : ''
      return `<li><input type="checkbox"${checked} disabled /> ${inner}${children}</li>`
    }

    case 'blockquote':
      return `<blockquote><p>${inner}</p>${children}</blockquote>`

    case 'codeBlock': {
      const lang = p.language ? ` class="language-${escapeHtml(p.language as string)}"` : ''
      return `<pre><code${lang}>${inner}</code></pre>`
    }

    case 'image': {
      const src = escapeHtml((p.url as string) ?? '')
      const alt = escapeHtml((p.caption as string) ?? (p.name as string) ?? '')
      const caption = p.caption ? `<figcaption>${escapeHtml(p.caption as string)}</figcaption>` : ''
      return `<figure class="article-image"><img src="${src}" alt="${alt}" />${caption}</figure>${children}`
    }

    case 'video': {
      const src = escapeHtml((p.url as string) ?? '')
      return `<video controls src="${src}"></video>${children}`
    }

    case 'file': {
      const url = escapeHtml((p.url as string) ?? '')
      const name = escapeHtml((p.name as string) ?? 'Download file')
      return `<p><a href="${url}" rel="noopener noreferrer">${name}</a></p>${children}`
    }

    case 'table': {
      // BlockNote table content is an array of rows in block.content
      const rows = (block.content as unknown as { type: string; cells: InlineContent[][] }[]) ?? []
      const rowsHtml = rows
        .map((row, ri) => {
          const cells = row.cells ?? []
          const tag = ri === 0 ? 'th' : 'td'
          return `<tr>${cells.map((cell) => `<${tag}>${inlineToHtml(cell)}</${tag}>`).join('')}</tr>`
        })
        .join('')
      return `<table><tbody>${rowsHtml}</tbody></table>${children}`
    }

    case 'column':
      return `<div class="bn-column">${children}</div>`

    case 'columnList': {
      const cols = block.children ?? []
      const style = cols.length > 0
        ? `display:grid;grid-template-columns:${cols.map((col) => `${(col.props?.width as number | undefined) ?? 1}fr`).join(' ')};gap:1.5rem`
        : 'display:flex;gap:1.5rem'
      return `<div class="bn-column-list" style="${style}">${children}</div>`
    }

    default:
      // Fallback: wrap in a paragraph
      return inner ? `<p>${inner}</p>${children}` : children
  }
}

function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.type === 'bulletListItem') {
      const items: string[] = []
      while (i < blocks.length && blocks[i].type === 'bulletListItem') {
        items.push(blockToHtml(blocks[i]))
        i++
      }
      parts.push(`<ul>${items.join('')}</ul>`)
    } else if (block.type === 'numberedListItem') {
      const items: string[] = []
      while (i < blocks.length && blocks[i].type === 'numberedListItem') {
        items.push(blockToHtml(blocks[i]))
        i++
      }
      parts.push(`<ol>${items.join('')}</ol>`)
    } else {
      parts.push(blockToHtml(block))
      i++
    }
  }
  return parts.join('\n')
}

export function blockNoteToHtml(blocks: unknown[]): string {
  return blocksToHtml(blocks as Block[])
}
