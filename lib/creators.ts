// Filtering and ordering for the Creators page (/creators). Pure functions: the page loads every creator
// once and these narrow the list down from the address (?q=…&sort=…&country=…&tag=…&letter=…).

export const CONTENT_KINDS = ['article', 'video', 'podcast', 'pill', 'course'] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]

export type Creator = {
  id: string
  slug: string
  name: string
  avatarUrl: string | null
  /** short plain-text biography, already in the reader's language when available */
  bio: string
  /** ISO codes like ["PE", "DE"] (dual nationality): the creator shows under each one; empty when unknown */
  countries: string[]
  counts: Record<ContentKind, number>
  total: number
  /** when the creator last published something */
  lastPublishedAt: string | null
  /** slugs of the topics (tags) they write about */
  tags: string[]
}

export type CreatorSort = 'az' | 'content' | 'recent'
export type CreatorQuery = { q: string; sort: CreatorSort; country: string; tag: string; letter: string }

const SORTS: CreatorSort[] = ['az', 'content', 'recent']

/** Reads the address parameters, ignoring anything unexpected */
export function parseCreatorQuery(params: Record<string, string | string[] | undefined>): CreatorQuery {
  const one = (key: string) => {
    const v = params[key]
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
  }
  const sort = one('sort') as CreatorSort
  const letter = one('letter').toUpperCase()
  const country = one('country').toUpperCase()
  return {
    q: one('q').slice(0, 80),
    sort: SORTS.includes(sort) ? sort : 'az',
    country: /^[A-Z]{2}$/.test(country) ? country : '',
    tag: /^[a-z0-9-]{1,80}$/.test(one('tag')) ? one('tag') : '',
    letter: /^[A-Z#]$/.test(letter) ? letter : '',
  }
}

/** lowercase, no accents: "Álex" → "alex" */
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** The letter a creator is filed under (A–Z without accents, "#" for anything else) */
export function initialOf(name: string): string {
  const first = fold(name.trim()).charAt(0).toUpperCase()
  return /^[A-Z]$/.test(first) ? first : '#'
}

/** Letters that have at least one creator, in order */
export function availableLetters(creators: Creator[]): string[] {
  return [...new Set(creators.map((c) => initialOf(c.name)))].sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
}

export function filterCreators(creators: Creator[], query: CreatorQuery, locale: string): Creator[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' })
  const needle = fold(query.q)
  const out = creators.filter((c) => {
    if (needle && !fold(c.name).includes(needle)) return false
    if (query.country && !c.countries.includes(query.country)) return false
    if (query.tag && !c.tags.includes(query.tag)) return false
    if (query.letter && initialOf(c.name) !== query.letter) return false
    return true
  })
  const byName = (a: Creator, b: Creator) => collator.compare(a.name, b.name)
  if (query.sort === 'content') return out.sort((a, b) => b.total - a.total || byName(a, b))
  if (query.sort === 'recent') return out.sort((a, b) => (b.lastPublishedAt ?? '').localeCompare(a.lastPublishedAt ?? '') || byName(a, b))
  return out.sort(byName)
}

/** Plain text from a biography that may contain a little HTML */
export function plainBio(html: string | null | undefined): string {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}
