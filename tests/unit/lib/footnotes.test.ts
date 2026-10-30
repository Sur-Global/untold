import { describe, it, expect } from 'vitest'
import {
  footnoteNumbers,
  footnoteSignature,
  findNotes,
  markerIds,
  notePlacement,
  planDuplicates,
  planNotes,
  prepareFootnotes,
  type FnBlock,
} from '@/lib/footnotes'

const text = (t: string) => ({ type: 'text', text: t, styles: {} })
const marker = (id: string) => ({ type: 'footnoteRef', props: { id, n: '', mode: '', label: '' } })
const para = (id: string, ...content: any[]): FnBlock => ({ id, type: 'paragraph', content, children: [] })
const note = (id: string, ref: string, body = ''): FnBlock => ({ id, type: 'footnote', props: { ref }, content: body ? [text(body)] : [], children: [] })
const emptyPara = (id: string): FnBlock => para(id)

describe('numbers', () => {
  const doc = [para('p1', text('uno'), marker('b'), text(' dos'), marker('a')), para('p2', text('tres'), marker('c'))]

  it('are the order in which the numbers appear in the text, not the order the notes were made', () => {
    expect(markerIds(doc)).toEqual(['b', 'a', 'c'])
    expect([...footnoteNumbers(doc)]).toEqual([['b', 1], ['a', 2], ['c', 3]])
  })

  it('count a number used twice once', () => {
    const twice = [para('p1', marker('a'), text(' y '), marker('a'), marker('b'))]
    expect([...footnoteNumbers(twice)]).toEqual([['a', 1], ['b', 2]])
  })

  it('can leave out the numbers that do not count', () => {
    expect([...footnoteNumbers(doc, new Set(['a', 'c']))]).toEqual([['a', 1], ['c', 2]])
  })

  it('are found inside nested blocks, lists and table cells, but not inside the notes', () => {
    const nested: FnBlock[] = [
      { id: 'l', type: 'bulletListItem', content: [text('x')], children: [para('c1', marker('in-child'))] },
      { id: 't', type: 'table', content: { type: 'tableContent', rows: [{ cells: [[text('a'), marker('in-cell')], { type: 'tableCell', content: [marker('in-cell-2')] }] }] } },
      { id: 'n', type: 'footnote', props: { ref: 'x' }, content: [marker('inside-note')] },
    ]
    expect(markerIds(nested)).toEqual(['in-child', 'in-cell', 'in-cell-2'])
  })
})

describe('footnoteSignature', () => {
  it('does not change while a note is being typed, but does when numbers or notes appear or go', () => {
    const a = [para('p', marker('a')), note('n', 'a', 'texto')]
    const typed = [para('p', marker('a')), note('n', 'a', 'texto más largo')]
    expect(footnoteSignature(typed)).toBe(footnoteSignature(a))
    expect(footnoteSignature([para('p', marker('a'), marker('b')), note('n', 'a', 'x')])).not.toBe(footnoteSignature(a))
    expect(footnoteSignature([para('p', text('sin número')), note('n', 'a', 'x')])).not.toBe(footnoteSignature(a))
  })
})

describe('planNotes', () => {
  it('asks for a note for each number that has none', () => {
    const doc = [para('p', marker('a'), marker('b')), note('n1', 'a', 'x')]
    expect(planNotes(doc).create).toEqual(['b'])
  })

  it('removes an empty note whose number was deleted, but keeps one with text', () => {
    const doc = [para('p', marker('a')), note('n1', 'a', 'x'), note('n2', 'gone'), note('n3', 'gone-too', 'texto escrito')]
    expect(planNotes(doc).remove).toEqual(['n2'])
  })

  it('removes a repeated note of the same number (a note block was copied)', () => {
    const doc = [para('p', marker('a')), note('n1', 'a', 'x'), note('n2', 'a', 'x')]
    expect(planNotes(doc).remove).toEqual(['n2'])
  })

  it('puts the notes in the order of the numbers, with the ones without a number last', () => {
    const doc = [para('p', marker('b'), marker('a')), note('n-a', 'a', 'A'), note('n-orphan', 'z', 'Z'), note('n-b', 'b', 'B')]
    expect(planNotes(doc).reorder).toEqual(['n-b', 'n-a', 'n-orphan'])
  })

  it('has nothing to do when everything is in step', () => {
    const doc = [para('p', marker('a'), marker('b')), note('n1', 'a', 'A'), note('n2', 'b', 'B')]
    expect(planNotes(doc)).toEqual({ create: [], remove: [], reorder: null })
  })
})

describe('notePlacement', () => {
  it('the first note goes at the end of the article', () => {
    const doc = [para('p1', marker('a')), para('p2', text('fin'))]
    expect(notePlacement(doc, 'a')).toEqual({ referenceId: 'p2', placement: 'after' })
  })

  it('goes above the empty paragraph BlockNote keeps at the end', () => {
    const doc = [para('p1', marker('a')), emptyPara('tail')]
    expect(notePlacement(doc, 'a')).toEqual({ referenceId: 'tail', placement: 'before' })
  })

  it('a note for a number in the middle goes after the note of the number before it', () => {
    const doc = [para('p', marker('a'), marker('new'), marker('c')), note('n-a', 'a', 'A'), note('n-c', 'c', 'C')]
    expect(notePlacement(doc, 'new')).toEqual({ referenceId: 'n-a', placement: 'after' })
  })

  it('a note for a number before all the others goes before the first note', () => {
    const doc = [para('p', marker('new'), marker('a')), note('n-a', 'a', 'A')]
    expect(notePlacement(doc, 'new')).toEqual({ referenceId: 'n-a', placement: 'before' })
  })
})

describe('planDuplicates', () => {
  it('gives the later copy of a number a new id and asks for a copy of the note', () => {
    const doc = [para('p1', marker('a')), para('p2', text('copia '), marker('a'))]
    const plan = planDuplicates(doc, () => 'fresh')
    expect(plan!.clones).toEqual([{ from: 'a', to: 'fresh' }])
    expect(plan!.updates).toHaveLength(1)
    expect(plan!.updates[0].blockId).toBe('p2')
    expect(plan!.updates[0].content.find((i: any) => i.type === 'footnoteRef').props.id).toBe('fresh')
  })

  it('does nothing when every number is used once', () => {
    expect(planDuplicates([para('p1', marker('a'), marker('b'))])).toBeNull()
  })
})

describe('prepareFootnotes (for the reader)', () => {
  const label = (n: number) => `Nota ${n}`

  it('fills in the numbers, takes the notes out of the body and lists them in order', () => {
    const doc = [para('p', text('x'), marker('b'), text(' y'), marker('a')), note('n-a', 'a', 'Nota A'), note('n-b', 'b', 'Nota B')]
    const { body, notes } = prepareFootnotes(doc, label)
    expect(body.map((b) => b.type)).toEqual(['paragraph'])
    const items = body[0].content.filter((i: any) => i.type === 'footnoteRef')
    expect(items.map((i: any) => [i.props.n, i.props.mode, i.props.label])).toEqual([['1', 'link', 'Nota 1'], ['2', 'link', 'Nota 2']])
    expect(notes.map((n) => [n.n, n.ref])).toEqual([[1, 'b'], [2, 'a']])
  })

  it('a number used twice points to the same note, and only the first one carries the anchor', () => {
    const doc = [para('p', marker('a'), text(' … '), marker('a')), note('n', 'a', 'Nota')]
    const { body, notes } = prepareFootnotes(doc, label)
    const items = body[0].content.filter((i: any) => i.type === 'footnoteRef')
    expect(items.map((i: any) => [i.props.n, i.props.mode])).toEqual([['1', 'link'], ['1', 'repeat']])
    expect(notes).toHaveLength(1)
  })

  it('leaves out a number whose note is empty or missing, and counts the others without it', () => {
    const doc = [para('p', marker('a'), marker('b'), marker('c')), note('n-a', 'a'), note('n-c', 'c', 'Nota C')]
    const { body, notes } = prepareFootnotes(doc, label)
    const items = body[0].content.filter((i: any) => i.type === 'footnoteRef')
    expect(items).toHaveLength(1)
    expect(items[0].props.n).toBe('1')
    expect(notes.map((n) => n.ref)).toEqual(['c'])
  })

  it('does not publish a note that has no number in the text', () => {
    const doc = [para('p', text('sin números')), note('n', 'a', 'Nota huérfana')]
    expect(prepareFootnotes(doc, label).notes).toEqual([])
  })

  it('drops the empty paragraph at the end when there are notes, and leaves the body alone otherwise', () => {
    const withNotes = [para('p', marker('a')), note('n', 'a', 'Nota'), emptyPara('tail')]
    expect(prepareFootnotes(withNotes, label).body.map((b) => b.id)).toEqual(['p', 'tail'].slice(0, 1))
    const plain = [para('p', text('hola')), emptyPara('tail')]
    expect(prepareFootnotes(plain, label).body).toBe(plain)
  })

  it('finds notes however deep they are', () => {
    const doc = [{ id: 'col', type: 'bulletListItem', content: [text('x')], children: [note('n', 'a', 'Nota')] }, para('p', marker('a'))]
    expect(findNotes(doc)).toHaveLength(1)
    expect(prepareFootnotes(doc, label).notes).toHaveLength(1)
  })
})
