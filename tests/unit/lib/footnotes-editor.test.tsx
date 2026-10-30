import { describe, it, expect, vi } from 'vitest'
import { BlockNoteEditor } from '@blocknote/core'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import { contentSchema } from '@/lib/blocknote-schema'
import { blocksToReaderHtml } from '@/lib/blocknote-html'
import { sanitizeReaderHtml } from '@/lib/sanitize-html'
import { insertFootnote, syncFootnotes } from '@/components/editor/footnotes'
import { footnoteNumbers, findNotes, markerIds } from '@/lib/footnotes'
import { extractBlockNoteTextNodes } from '@/lib/blocknote-translate'

const text = (t: string, styles: Record<string, unknown> = {}) => ({ type: 'text', text: t, styles })
const marker = (id: string) => ({ type: 'footnoteRef', props: { id } })
const para = (id: string, ...content: any[]) => ({ id, type: 'paragraph', content, children: [] })
const note = (id: string, ref: string, ...content: any[]) => ({ id, type: 'footnote', props: { ref }, content, children: [] })

const labels = { title: 'Notas', back: 'Volver al texto', note: (n: number) => `Nota ${n}` }

describe('the reader, with footnotes', () => {
  const editor = BlockNoteEditor.create({ schema: contentSchema })
  const doc = [
    para('p1', text('El Estado emplea a muchas personas'), marker('b1'), text(', pero formar es otra cosa'), marker('a2'), text('.')),
    para('tail'),
    note('n-a', 'a2', text('Segunda nota con '), { type: 'link', href: 'https://example.org/informe', content: [text('un enlace')] }),
    note('n-b', 'b1', text('Primera nota, '), text('en cursiva', { italic: true })),
  ]
  const html = sanitizeReaderHtml(blocksToReaderHtml(editor as any, doc as any, labels))

  it('turns each number in the text into a superscript link to its note, named for screen readers', () => {
    expect(html).toContain('<sup class="fn-ref"><a id="fnref-b1" href="#fn-b1" role="doc-noteref" aria-label="Nota 1">1</a></sup>')
    expect(html).toContain('href="#fn-a2"')
    expect(html).toContain('aria-label="Nota 2"')
  })

  it('puts all the notes in one section at the very end, in the order of the numbers, each with a link back', () => {
    expect(html.indexOf('class="fn-section"')).toBeGreaterThan(html.indexOf('formar es otra cosa'))
    expect(html).toContain('role="doc-endnotes"')
    expect(html.indexOf('id="fn-b1"')).toBeLessThan(html.indexOf('id="fn-a2"'))
    expect(html).toContain('<li id="fn-b1" value="1" role="doc-endnote">')
    expect(html).toContain('<li id="fn-a2" value="2" role="doc-endnote">')
    expect(html).toContain('href="#fnref-b1"')
    expect(html).toContain('aria-label="Volver al texto"')
    expect(html).toContain('>Notas</h2>')
  })

  it('keeps the rich text of the notes: links and italics', () => {
    expect(html).toMatch(/<a [^>]*href="https:\/\/example\.org\/informe"[^>]*>un enlace<\/a>/)
    expect(html).toContain('<em>en cursiva</em>')
  })

  it('does not leave the empty paragraph BlockNote keeps at the end between the text and the notes', () => {
    expect(html).not.toContain('<p></p>')
    expect(html).not.toMatch(/<p>(&nbsp;)?<\/p><section/)
  })

  it('an article without footnotes comes out exactly as before', () => {
    const plain = blocksToReaderHtml(editor as any, [para('x', text('Hola'))] as any, labels)
    expect(plain).not.toContain('fn-section')
    expect(plain).toContain('Hola')
  })

  it('a note that is empty is not published, and its number does not show', () => {
    const out = blocksToReaderHtml(editor as any, [para('p', text('a'), marker('x')), note('n', 'x')] as any, labels)
    expect(out).not.toContain('fn-section')
    expect(out).not.toContain('fn-ref')
  })
})

describe('the schema', () => {
  it('keeps the footnote number and note when a document is saved and loaded again', () => {
    const editor = BlockNoteEditor.create({ schema: contentSchema })
    editor.replaceBlocks(editor.document, [para('p', text('x'), marker('k1')), note('n', 'k1', text('la nota'))] as any)
    const saved = JSON.parse(JSON.stringify(editor.document))
    expect(markerIds(saved)).toEqual(['k1'])
    expect(findNotes(saved).map((n) => n.props?.ref)).toEqual(['k1'])
  })

  it('the translation pipeline sees the text of the notes, and leaves the numbers alone', () => {
    const entries = extractBlockNoteTextNodes([para('p', text('texto'), marker('k1')), note('n', 'k1', text('la nota'))] as any)
    expect(entries.map((e) => e.text)).toEqual(['texto', 'la nota'])
  })
})

describe('in the editor', () => {
  const makeEditor = (blocks: any[]) => {
    const editor = BlockNoteEditor.create({ schema: contentSchema })
    const host = document.createElement('div')
    document.body.appendChild(host)
    editor.mount(host)
    editor.replaceBlocks(editor.document, blocks)
    return editor
  }

  it('gives a new number a note at the end of the article and puts the cursor in it', () => {
    const editor = makeEditor([para('p1', text('Primer párrafo')), para('p2', text('Segundo párrafo'))])
    editor.setTextCursorPosition('p1', 'end')
    expect(insertFootnote(editor)).toBe(true)

    const doc = editor.document as any[]
    expect(markerIds(doc)).toHaveLength(1)
    const notes = findNotes(doc)
    expect(notes).toHaveLength(1)
    expect(notes[0].props?.ref).toBe(markerIds(doc)[0])
    expect(doc.findIndex((b) => b.type === 'footnote')).toBeGreaterThan(doc.findIndex((b) => b.id === 'p2'))
    expect(editor.getTextCursorPosition().block.id).toBe(notes[0].id)
  })

  it('numbers by order in the text: a note added in the middle becomes number 2 and the later one 3', () => {
    const editor = makeEditor([para('p1', text('uno'), marker('a'), text(' dos '), marker('c')), note('n-a', 'a', text('A')), note('n-c', 'c', text('C'))])
    editor.setTextCursorPosition('p1', 'start')
    editor.transact(() => {})
    // add a number between the two
    editor.updateBlock('p1', { content: [text('uno'), marker('a'), text(' medio '), marker('new'), text(' dos '), marker('c')] } as any)
    syncFootnotes(editor)

    const doc = editor.document as any[]
    const order = findNotes(doc).map((n) => n.props?.ref)
    expect(order).toEqual(['a', 'new', 'c'])
    expect([...footnoteNumbers(doc)].map(([id, n]) => `${id}:${n}`)).toEqual(['a:1', 'new:2', 'c:3'])
  })

  it('drops an empty note when its number is deleted, but keeps one that has text', () => {
    const editor = makeEditor([para('p1', text('solo texto')), note('n-empty', 'gone'), note('n-text', 'gone2', text('escrita'))])
    syncFootnotes(editor)
    expect(findNotes(editor.document as any).map((n) => n.props?.ref)).toEqual(['gone2'])
  })

  it('a paragraph with a number that was copied gets its own number and a copy of the note', () => {
    const editor = makeEditor([para('p1', text('uno'), marker('a')), para('p2', text('copia'), marker('a')), note('n-a', 'a', text('La nota'))])
    syncFootnotes(editor)
    const doc = editor.document as any[]
    const ids = markerIds(doc)
    expect(new Set(ids).size).toBe(2)
    const notes = findNotes(doc)
    expect(notes).toHaveLength(2)
    expect(notes.map((n) => n.content?.[0]?.text)).toEqual(['La nota', 'La nota'])
  })

  it('attaches the number to the word before it: the space typed to open the "/" menu is dropped', () => {
    const editor = makeEditor([para('p1', text('Frase terminada. '))])
    editor.setTextCursorPosition('p1', 'end')
    insertFootnote(editor)
    const first = (editor.document as any[])[0]
    expect(first.content.map((i: any) => (i.type === 'text' ? i.text : `[${i.type}]`)).join('')).toBe('Frase terminada.[footnoteRef]')
  })

  it('puts the number after the selected words, not over them', () => {
    const editor = makeEditor([para('p1', text('Una palabra clave aquí'))])
    editor.setTextCursorPosition('p1', 'start')
    const view = editor.prosemirrorView
    // select "palabra clave": the text starts at position 3 (block container + block content)
    const tip = (editor as any)._tiptapEditor
    tip.commands.setTextSelection({ from: 7, to: 20 })
    expect(view.state.selection.empty).toBe(false)
    insertFootnote(editor)
    const content = (editor.document as any[])[0].content
    expect(content.map((i: any) => (i.type === 'text' ? i.text : `[${i.type}]`)).join('')).toBe('Una palabra clave[footnoteRef] aquí')
  })

  it('does not put a footnote inside a note', () => {
    const editor = makeEditor([para('p1', text('uno'), marker('a')), note('n-a', 'a', text('La nota'))])
    editor.setTextCursorPosition('n-a', 'end')
    expect(insertFootnote(editor)).toBe(false)
    expect(markerIds(editor.document as any)).toEqual(['a'])
  })
})
