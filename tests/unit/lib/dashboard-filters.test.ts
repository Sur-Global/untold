import { describe, it, expect } from 'vitest'
import { dashboardCounts, filterDashboardItems, kindOf, parseDashboardQuery, DASHBOARD_PAGE_SIZE, DASHBOARD_TYPES, type DashboardQuery } from '@/lib/dashboard-filters'

const item = (id: string, type: string, status: string, created: string, extra: Record<string, any> = {}) => ({ id, type, status, created_at: created, updated_at: created, ...extra })
const items = [
  item('a', 'article', 'published', '2026-01-10T00:00:00Z', { title: 'Zapatos y futuros' }),
  item('b', 'video', 'draft', '2026-03-05T00:00:00Z', { title: 'Álgebra del desvío' }),
  item('c', 'article', 'draft', '2025-11-20T00:00:00Z', { title: 'Cartografías', updated_at: '2026-09-01T00:00:00Z' }),
  item('d', 'pill', 'published', '2026-02-01T00:00:00Z', { title: 'Píldora de futuros' }),
]
const titleOf = (i: any) => i.title
const base: DashboardQuery = { type: '', status: '', q: '', sort: 'newest', limit: DASHBOARD_PAGE_SIZE }
const ids = (r: { shown: any[] }) => r.shown.map((i) => i.id)

describe('parseDashboardQuery', () => {
  it('has sensible defaults', () => {
    expect(parseDashboardQuery({})).toEqual({ type: '', status: '', q: '', sort: 'newest', limit: DASHBOARD_PAGE_SIZE })
  })
  it('reads valid values and ignores anything unexpected', () => {
    expect(parseDashboardQuery({ type: 'video', status: 'draft', q: '  hola  ', sort: 'title', limit: '50' })).toEqual({ type: 'video', status: 'draft', q: 'hola', sort: 'title', limit: 50 })
    expect(parseDashboardQuery({ type: 'x', status: 'y', sort: 'z', limit: 'abc' })).toEqual({ type: '', status: '', q: '', sort: 'newest', limit: DASHBOARD_PAGE_SIZE })
    expect(parseDashboardQuery({ limit: '5' }).limit).toBe(DASHBOARD_PAGE_SIZE)
    expect(parseDashboardQuery({ limit: '999999' }).limit).toBe(1000)
  })
})

describe('filterDashboardItems', () => {
  it('shows everything, newest first, by default', () => {
    expect(ids(filterDashboardItems(items, base, titleOf))).toEqual(['b', 'd', 'a', 'c'])
  })
  it('filters by kind and by status, together', () => {
    expect(ids(filterDashboardItems(items, { ...base, type: 'article' }, titleOf))).toEqual(['a', 'c'])
    expect(ids(filterDashboardItems(items, { ...base, status: 'draft' }, titleOf))).toEqual(['b', 'c'])
    expect(ids(filterDashboardItems(items, { ...base, type: 'article', status: 'draft' }, titleOf))).toEqual(['c'])
  })
  it('searches the title ignoring accents and capitals, all words required', () => {
    expect(ids(filterDashboardItems(items, { ...base, q: 'algebra' }, titleOf))).toEqual(['b'])
    expect(ids(filterDashboardItems(items, { ...base, q: 'FUTUROS' }, titleOf))).toEqual(['d', 'a'])
    expect(ids(filterDashboardItems(items, { ...base, q: 'futuros pildora' }, titleOf))).toEqual(['d'])
    expect(ids(filterDashboardItems(items, { ...base, q: 'nada' }, titleOf))).toEqual([])
  })
  it('orders by oldest, last edited or title', () => {
    expect(ids(filterDashboardItems(items, { ...base, sort: 'oldest' }, titleOf))).toEqual(['c', 'a', 'd', 'b'])
    expect(ids(filterDashboardItems(items, { ...base, sort: 'edited' }, titleOf))).toEqual(['c', 'b', 'd', 'a'])
    expect(ids(filterDashboardItems(items, { ...base, sort: 'title' }, titleOf))).toEqual(['b', 'c', 'd', 'a'])
  })
  it('shows only what fits in the limit but says how many match', () => {
    const many = Array.from({ length: 60 }, (_, n) => item(String(n), 'article', 'draft', `2026-01-${String((n % 28) + 1).padStart(2, '0')}T00:00:00Z`, { title: `T${n}` }))
    const r = filterDashboardItems(many, base, titleOf)
    expect(r.shown).toHaveLength(DASHBOARD_PAGE_SIZE)
    expect(r.total).toBe(60)
    expect(filterDashboardItems(many, { ...base, limit: 50 }, titleOf).shown).toHaveLength(50)
  })
})

describe('dashboardCounts', () => {
  it('counts each kind and status', () => {
    expect(dashboardCounts(items)).toEqual({ types: { article: 2, video: 1, pill: 1 }, published: 2, draft: 2 })
  })
})

describe('editorials are their own kind, not articles', () => {
  const withEditorial = [
    ...items,
    item('e', 'article', 'published', '2026-04-01T00:00:00Z', { title: 'Editorial de abril', is_editorial: true }),
    item('f', 'article', 'draft', '2026-05-01T00:00:00Z', { title: 'Editorial de mayo', is_editorial: true }),
  ]
  it('an editorial counts as "editorial" and no longer as an article', () => {
    expect(kindOf({ type: 'article', is_editorial: true })).toBe('editorial')
    expect(kindOf({ type: 'article', is_editorial: false })).toBe('article')
    expect(kindOf({ type: 'video' })).toBe('video')
    expect(dashboardCounts(withEditorial).types).toEqual({ article: 2, editorial: 2, video: 1, pill: 1 })
  })
  it('the editorials filter shows only editorials, and the articles filter no longer shows them', () => {
    expect(ids(filterDashboardItems(withEditorial, { ...base, type: 'editorial' }, titleOf))).toEqual(['f', 'e'])
    expect(ids(filterDashboardItems(withEditorial, { ...base, type: 'article' }, titleOf))).toEqual(['a', 'c'])
    expect(ids(filterDashboardItems(withEditorial, { ...base, type: 'editorial', status: 'published' }, titleOf))).toEqual(['e'])
  })
  it('is a kind the address can ask for, right after articles', () => {
    expect(parseDashboardQuery({ type: 'editorial' }).type).toBe('editorial')
    expect(DASHBOARD_TYPES.slice(0, 2)).toEqual(['article', 'editorial'])
  })
})
