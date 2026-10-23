import { describe, it, expect } from 'vitest'
import en from '@/messages/en.json'
import es from '@/messages/es.json'
import pt from '@/messages/pt.json'
import fr from '@/messages/fr.json'
import de from '@/messages/de.json'
import da from '@/messages/da.json'

const flat = (o: any, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)] as [string, string]]))

const locales = { es, pt, fr, de, da }
const base = new Map(flat(en))
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join(',')

describe('interface translations', () => {
  for (const [code, messages] of Object.entries(locales)) {
    const own = new Map(flat(messages))

    it(`${code} has every text English has, and nothing extra`, () => {
      expect([...base.keys()].filter((k) => !own.has(k))).toEqual([])
      expect([...own.keys()].filter((k) => !base.has(k))).toEqual([])
    })

    it(`${code} has no empty text and keeps the same {placeholders} as English`, () => {
      const empty = [...own].filter(([, v]) => v.trim() === '').map(([k]) => k)
      expect(empty).toEqual([])
      const different = [...own].filter(([k, v]) => base.has(k) && placeholders(v) !== placeholders(base.get(k)!)).map(([k]) => k)
      expect(different).toEqual([])
    })
  }

  it('the page title of the articles listing is translated where the word differs from English', () => {
    expect(es.nav.articles).toBe('Artículos')
    expect(pt.nav.articles).toBe('Artigos')
    expect(de.nav.articles).toBe('Artikel')
    expect(da.nav.articles).toBe('Artikler')
  })
})
