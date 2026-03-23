import { describe, it, expect } from 'vitest'
import { blockNoteToHtml } from '@/lib/blocknote-to-html'

describe('blockNoteToHtml — columnList', () => {
  it('renders two columns side-by-side with equal 1fr widths when no width props set', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Left' }] }],
          },
          {
            type: 'column',
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Right' }] }],
          },
        ],
      },
    ])
    expect(html).toContain('class="bn-column-list"')
    expect(html).toContain('grid-template-columns:1fr 1fr')
    expect(html).toContain('class="bn-column"')
    expect(html).toContain('<p>Left</p>')
    expect(html).toContain('<p>Right</p>')
  })

  it('respects column width props to produce asymmetric fr values', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            props: { width: 1.4 },
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Wide' }] }],
          },
          {
            type: 'column',
            props: { width: 0.8 },
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Narrow' }] }],
          },
        ],
      },
    ])
    expect(html).toContain('grid-template-columns:1.4fr 0.8fr')
  })

  it('falls back to 1fr for individual columns missing a width prop', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            children: [{ type: 'paragraph' }],
          },
          {
            type: 'column',
            props: { width: 1.5 },
            children: [{ type: 'paragraph' }],
          },
        ],
      },
    ])
    expect(html).toContain('grid-template-columns:1fr 1.5fr')
  })

  it('renders three columns', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          { type: 'column', children: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
          { type: 'column', children: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
          { type: 'column', children: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }] },
        ],
      },
    ])
    expect(html).toContain('grid-template-columns:1fr 1fr 1fr')
    expect(html).toContain('<p>A</p>')
    expect(html).toContain('<p>B</p>')
    expect(html).toContain('<p>C</p>')
  })

  it('falls back to display:flex when columnList has no children', () => {
    const html = blockNoteToHtml([
      { type: 'columnList', children: [] },
    ])
    expect(html).toContain('display:flex')
    expect(html).not.toContain('grid-template-columns')
  })
})
