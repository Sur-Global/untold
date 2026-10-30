import { describe, it, expect, vi } from 'vitest'
import { BlockNoteEditor } from '@blocknote/core'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import { contentSchema } from '@/lib/blocknote-schema'
import { blocksToReaderHtml } from '@/lib/blocknote-html'
import { sanitizeReaderHtml } from '@/lib/sanitize-html'
import { computeReadTime } from '@/lib/readTime'
import { extractBlockNoteTextNodes, injectBlockNoteTextNodes } from '@/lib/blocknote-translate'
import { blocksPlainText } from '@/lib/translation-editor'

// Articles can hold tables (the editor offers one); nothing that reads a body may break on them.
const text = (t: string, styles: Record<string, unknown> = {}) => ({ type: 'text', text: t, styles })
const cell = (content: any[], props: Record<string, unknown> = {}) => ({
  type: 'tableCell',
  content,
  props: { colspan: 1, rowspan: 1, backgroundColor: 'default', textColor: 'default', textAlignment: 'left', ...props },
})

const table = {
  id: 't1',
  type: 'table',
  props: { textColor: 'default' },
  content: {
    type: 'tableContent',
    columnWidths: [undefined, undefined, undefined],
    headerRows: 1,
    rows: [
      { cells: [cell([text('Afectaciones', { bold: true })]), cell([text('Consecuencias climáticas')], { colspan: 2 })] },
      { cells: [cell([text('Calor')]), cell([text('Muros reciclados')]), cell([text('Aire acondicionado')])] },
    ],
  },
  children: [],
}
const para = { id: 'p1', type: 'paragraph', props: {}, content: [text('Antes de la tabla')], children: [] }

describe('tables in an article body', () => {
  it('counts the words of a table when working out the reading time', () => {
    const words = Array.from({ length: 400 }, () => 'palabra').join(' ')
    const big = { ...table, content: { ...table.content, rows: [{ cells: [cell([text(words)])] }] } }
    expect(() => computeReadTime([para, table])).not.toThrow()
    expect(computeReadTime([big])).toBe(2)
  })

  it('offers the text of every cell for translation, and puts each translation back in its own cell', () => {
    const entries = extractBlockNoteTextNodes([para, table] as any)
    expect(entries.map((e) => e.text)).toEqual(['Antes de la tabla', 'Afectaciones', 'Consecuencias climáticas', 'Calor', 'Muros reciclados', 'Aire acondicionado'])

    const out: any = injectBlockNoteTextNodes([para, table] as any, entries.map((e) => `EN ${e.text}`), entries)
    const rows = out[1].content.rows
    expect(rows[0].cells[1].content[0].text).toBe('EN Consecuencias climáticas')
    expect(rows[1].cells[2].content[0].text).toBe('EN Aire acondicionado')
    expect(rows[0].cells[1].props.colspan).toBe(2)
    expect(out[0].content[0].text).toBe('EN Antes de la tabla')
  })

  it('includes the cells in the plain text used to compare translations', () => {
    expect(blocksPlainText([para, table])).toBe('Antes de la tabla\nAfectaciones Consecuencias climáticas Calor Muros reciclados Aire acondicionado')
  })

  it('reaches the reader as a real table, keeping the merged cell and the header', () => {
    const editor = BlockNoteEditor.create({ schema: contentSchema })
    const html = sanitizeReaderHtml(blocksToReaderHtml(editor as any, [para, table] as any))
    expect(html).toContain('<table')
    expect(html).toMatch(/<th[^>]*colspan="2"[^>]*>/)
    expect(html).toContain('Muros reciclados')
  })
})

describe('an image slot with no picture yet', () => {
  it('is left out of what readers see instead of showing "Add image"', () => {
    const editor = BlockNoteEditor.create({ schema: contentSchema })
    const slot = { id: 'i1', type: 'image', props: { url: '', name: '', caption: 'Pie de foto', showPreview: true, textAlignment: 'center', backgroundColor: 'default' }, children: [] }
    const withPicture = { ...slot, id: 'i2', props: { ...slot.props, url: 'https://example.org/foto.jpg' } }
    const html = blocksToReaderHtml(editor as any, [para, slot, withPicture] as any)
    expect(html).not.toContain('Add image')
    expect(html).toContain('https://example.org/foto.jpg')
    expect(html).toContain('Antes de la tabla')
  })
})
