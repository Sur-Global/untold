import { describe, it, expect } from 'vitest'
import { bodyExcerpt, isRecent } from '@/lib/editorial'

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] })
const long = 'Las noticias influyen en nuestra manera de ver y percibir el mundo y en las decisiones que tomamos cada día.'

describe('bodyExcerpt', () => {
  it('opens with the first real paragraph of a BlockNote body, skipping the byline and short lines', () => {
    const body = [para('Por Mercedes Baltazar'), para('Corto'), para(long), para('Segundo párrafo que no entra en el resumen.')]
    expect(bodyExcerpt(body)).toBe(long)
  })

  it('reads links as part of the text', () => {
    const body = [{ type: 'paragraph', content: [{ type: 'text', text: 'Según ', styles: {} }, { type: 'link', href: 'https://x', content: [{ type: 'text', text: 'este informe de la organización', styles: {} }] }, { type: 'text', text: ' la crisis de los medios se agrava cada año.', styles: {} }] }]
    expect(bodyExcerpt(body)).toBe('Según este informe de la organización la crisis de los medios se agrava cada año.')
  })

  it('works with the older Tiptap format too', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '-Por Cristian Situ-' }] }, { type: 'paragraph', content: [{ type: 'text', text: long }] }] }
    expect(bodyExcerpt(doc)).toBe(long)
  })

  it('cuts a long paragraph at a word and adds an ellipsis', () => {
    const out = bodyExcerpt([para(`${long} ${long} ${long}`)], 150)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(151)
    expect(out).not.toMatch(/\s…$/)
  })

  it('gives an empty text when there is nothing usable', () => {
    expect(bodyExcerpt(null)).toBe('')
    expect(bodyExcerpt([para('Corto')])).toBe('')
  })
})

describe('isRecent', () => {
  const now = new Date('2026-10-23T12:00:00Z').getTime()
  it('is true within the last 7 days and false after', () => {
    expect(isRecent('2026-10-20T10:00:00Z', 7, now)).toBe(true)
    expect(isRecent('2026-10-10T10:00:00Z', 7, now)).toBe(false)
  })
  it('is false for missing or future dates', () => {
    expect(isRecent(null, 7, now)).toBe(false)
    expect(isRecent('2026-11-01T00:00:00Z', 7, now)).toBe(false)
  })
})
