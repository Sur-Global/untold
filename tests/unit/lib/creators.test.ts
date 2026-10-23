import { describe, it, expect } from 'vitest'
import { availableLetters, filterCreators, fold, initialOf, parseCreatorQuery, plainBio, type Creator } from '@/lib/creators'

const make = (name: string, extra: Partial<Creator> = {}): Creator => ({
  id: name, slug: fold(name).replace(/\s+/g, '-'), name, avatarUrl: null, bio: '', country: null,
  counts: { article: 1, video: 0, podcast: 0, pill: 0, course: 0 }, total: 1, lastPublishedAt: '2026-01-01T00:00:00Z', tags: [], ...extra,
})
const list = [
  make('Álex Hernández', { country: 'PE', total: 2, lastPublishedAt: '2026-02-01T00:00:00Z', tags: ['salud', 'trabajo'] }),
  make('Zoila Ochoa Garay', { country: 'PE', total: 1, lastPublishedAt: '2026-08-13T00:00:00Z', tags: ['lenguas'] }),
  make('Beatriz Ricci', { country: 'AR', total: 5, lastPublishedAt: '2025-09-01T00:00:00Z', tags: ['diseno'] }),
  make('Ángela Agurto', { total: 3, lastPublishedAt: '2026-02-02T00:00:00Z', tags: ['trabajo'] }),
  make('Óscar Bodí Pons', { country: 'ES', total: 1 }),
]
const q = (over: Record<string, string> = {}) => parseCreatorQuery(over)
const names = (cs: Creator[]) => cs.map((c) => c.name)

describe('parseCreatorQuery', () => {
  it('uses A–Z and no filters by default', () => {
    expect(q()).toEqual({ q: '', sort: 'az', country: '', tag: '', letter: '' })
  })
  it('accepts valid values and ignores anything unexpected', () => {
    expect(q({ q: ' Álex ', sort: 'content', country: 'pe', tag: 'trabajo', letter: 'b' })).toEqual({ q: 'Álex', sort: 'content', country: 'PE', tag: 'trabajo', letter: 'B' })
    expect(q({ sort: 'hack', country: 'PERU', tag: 'No Valido!', letter: 'AB' })).toEqual({ q: '', sort: 'az', country: '', tag: '', letter: '' })
  })
  it('takes the first value when a parameter is repeated', () => {
    expect(parseCreatorQuery({ sort: ['recent', 'az'] }).sort).toBe('recent')
  })
})

describe('letters', () => {
  it('files names without accents, and anything odd under #', () => {
    expect(initialOf('Álex Hernández')).toBe('A')
    expect(initialOf('Óscar Bodí')).toBe('O')
    expect(initialOf('  lulo López')).toBe('L')
    expect(initialOf('9 Ríos')).toBe('#')
  })
  it('lists only the letters that exist, # last', () => {
    expect(availableLetters([...list, make('9 Ríos')])).toEqual(['A', 'B', 'O', 'Z', '#'])
  })
})

describe('filterCreators', () => {
  it('sorts A–Z ignoring accents', () => {
    expect(names(filterCreators(list, q(), 'es'))).toEqual(['Álex Hernández', 'Ángela Agurto', 'Beatriz Ricci', 'Óscar Bodí Pons', 'Zoila Ochoa Garay'])
  })
  it('sorts by amount of content, then by name', () => {
    expect(names(filterCreators(list, q({ sort: 'content' }), 'es'))).toEqual(['Beatriz Ricci', 'Ángela Agurto', 'Álex Hernández', 'Óscar Bodí Pons', 'Zoila Ochoa Garay'])
  })
  it('sorts by who published last', () => {
    expect(names(filterCreators(list, q({ sort: 'recent' }), 'es')).slice(0, 3)).toEqual(['Zoila Ochoa Garay', 'Ángela Agurto', 'Álex Hernández'])
  })
  it('searches by name without caring about accents or capitals', () => {
    expect(names(filterCreators(list, q({ q: 'alex' }), 'es'))).toEqual(['Álex Hernández'])
    expect(names(filterCreators(list, q({ q: 'BODI' }), 'es'))).toEqual(['Óscar Bodí Pons'])
  })
  it('filters by country, topic and initial, and combines them', () => {
    expect(names(filterCreators(list, q({ country: 'PE' }), 'es'))).toEqual(['Álex Hernández', 'Zoila Ochoa Garay'])
    expect(names(filterCreators(list, q({ tag: 'trabajo' }), 'es'))).toEqual(['Álex Hernández', 'Ángela Agurto'])
    expect(names(filterCreators(list, q({ letter: 'A' }), 'es'))).toEqual(['Álex Hernández', 'Ángela Agurto'])
    expect(names(filterCreators(list, q({ country: 'PE', tag: 'trabajo' }), 'es'))).toEqual(['Álex Hernández'])
  })
  it('does not change the list it receives', () => {
    const copy = names(list)
    filterCreators(list, q({ sort: 'content' }), 'es')
    expect(names(list)).toEqual(copy)
  })
})

describe('plainBio', () => {
  it('turns a little HTML into plain text', () => {
    expect(plainBio('<p>Aliza  es <b>limeña</b>&nbsp;y vive en Berlín.</p>')).toBe('Aliza es limeña y vive en Berlín.')
    expect(plainBio(null)).toBe('')
  })
})
