import { describe, it, expect } from 'vitest'
import { BlockNoteSchema, BlockNoteEditor } from '@blocknote/core'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { blocksToReaderHtml, normalizeBlockColors } from '@/lib/blocknote-html'

const editor = BlockNoteEditor.create({ schema: withMultiColumn(BlockNoteSchema.create()) })
const text = (t: string) => [{ type: 'text', text: t, styles: {} }]

describe('blocksToReaderHtml', () => {
  it('renders toggles as collapsed <details> with every child inside, bullets included', () => {
    const html = blocksToReaderHtml(editor, [
      { id: 'a', type: 'paragraph', props: {}, content: text('Antes'), children: [] },
      {
        id: 'b', type: 'toggleListItem', props: {}, content: text('Referencias'),
        children: [
          { id: 'c', type: 'bulletListItem', props: {}, content: text('Uno'), children: [] },
          { id: 'd', type: 'bulletListItem', props: {}, content: text('Dos'), children: [] },
        ],
      },
      { id: 'e', type: 'paragraph', props: {}, content: text('Después'), children: [] },
    ] as any)

    expect(html).toContain('<details class="bn-toggle">')
    expect(html).not.toContain('open')
    const body = html.match(/<div class="bn-toggle-body">([\s\S]*)<\/div><\/details>/)![1]
    expect(body).toContain('Uno')
    expect(body).toContain('Dos')
    // the toggle is not wrapped in a bullet list, and surrounding content survives
    expect(html).not.toMatch(/<li><details/)
    expect(html).toContain('Antes')
    expect(html).toContain('Después')
  })

  it('handles toggleable headings and nested toggles', () => {
    const html = blocksToReaderHtml(editor, [
      {
        id: 'a', type: 'heading', props: { level: 2, isToggleable: true }, content: text('Título'),
        children: [
          { id: 'b', type: 'toggleListItem', props: {}, content: text('Interno'),
            children: [{ id: 'c', type: 'paragraph', props: {}, content: text('Hondo'), children: [] }] },
        ],
      },
    ] as any)
    expect((html.match(/<details class="bn-toggle">/g) ?? []).length).toBe(2)
    expect(html).toContain('<h2')
    expect(html).toContain('Hondo')
  })

  it('leaves content without toggles untouched', () => {
    const blocks = [{ id: 'a', type: 'paragraph', props: {}, content: text('Hola'), children: [] }] as any
    expect(blocksToReaderHtml(editor, blocks)).toBe(editor.blocksToHTMLLossy(blocks))
  })
})

describe('color normalization', () => {
  it('drops raw (pasted) colors but keeps named palette colors', () => {
    const blocks = [
      { id: 'a', type: 'paragraph', props: { backgroundColor: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' },
        content: [{ type: 'text', text: 'Hola', styles: { textColor: 'rgb(17, 85, 204)', backgroundColor: 'transparent', bold: true } },
                  { type: 'text', text: 'Rojo', styles: { textColor: 'red' } }],
        children: [{ id: 'b', type: 'paragraph', props: { backgroundColor: 'blue' }, content: [], children: [] }] },
    ] as any
    const [b] = normalizeBlockColors(blocks) as any
    expect(b.props).toEqual({ backgroundColor: 'default', textColor: 'default' })
    expect(b.content[0].styles).toEqual({ bold: true })
    expect(b.content[1].styles).toEqual({ textColor: 'red' })
    expect(b.children[0].props.backgroundColor).toBe('blue')
  })

  it('published HTML no longer carries the black highlight', () => {
    const html = blocksToReaderHtml(editor, [
      { id: 'a', type: 'paragraph', props: { backgroundColor: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' }, content: text('Texto'), children: [] },
    ] as any)
    expect(html).not.toContain('rgb(0, 0, 0)')
    expect(html).toContain('Texto')
  })
})
