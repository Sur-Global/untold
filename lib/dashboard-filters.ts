// Filters and order for "Mi contenido" (/dashboard): by kind of content, by status, by words in the title,
// and by date or title. Everything lives in the address (?type=…&status=…&q=…&sort=…&limit=…).
// The kinds are the content types plus "editorial": an editorial is stored as an article, but it is its own kind here.

export const DASHBOARD_TYPES = ['article', 'editorial', 'video', 'podcast', 'pill', 'course'] as const
export type DashboardType = (typeof DASHBOARD_TYPES)[number]
export type DashboardStatus = 'published' | 'draft'
export type DashboardSort = 'newest' | 'oldest' | 'edited' | 'title'

export const DASHBOARD_PAGE_SIZE = 25
const SORTS: DashboardSort[] = ['newest', 'oldest', 'edited', 'title']

export type DashboardQuery = { type: '' | DashboardType; status: '' | DashboardStatus; q: string; sort: DashboardSort; limit: number }

export type DashboardItem = { type: string; status: string; created_at: string; updated_at?: string | null; is_editorial?: boolean | null }

/** The kind an item counts as: editorials are not "articles" */
export const kindOf = (item: Pick<DashboardItem, 'type' | 'is_editorial'>): string => (item.is_editorial ? 'editorial' : item.type)

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

/** Reads the address parameters, ignoring anything unexpected */
export function parseDashboardQuery(params: Record<string, string | string[] | undefined>): DashboardQuery {
  const type = first(params.type)
  const status = first(params.status)
  const sort = first(params.sort) as DashboardSort
  const limit = Number.parseInt(first(params.limit), 10)
  return {
    type: (DASHBOARD_TYPES as readonly string[]).includes(type) ? (type as DashboardType) : '',
    status: status === 'published' || status === 'draft' ? status : '',
    q: first(params.q).trim().slice(0, 100),
    sort: SORTS.includes(sort) ? sort : 'newest',
    limit: Number.isFinite(limit) && limit >= DASHBOARD_PAGE_SIZE ? Math.min(limit, 1000) : DASHBOARD_PAGE_SIZE,
  }
}

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const time = (iso?: string | null) => (iso ? Date.parse(iso) || 0 : 0)

/** How many items of each kind and status there are (the numbers shown on the filter buttons) */
export function dashboardCounts(items: DashboardItem[]) {
  const types: Record<string, number> = {}
  let published = 0
  let draft = 0
  for (const item of items) {
    const kind = kindOf(item)
    types[kind] = (types[kind] ?? 0) + 1
    if (item.status === 'published') published++
    else draft++
  }
  return { types, published, draft }
}

/** The items that match the filters, in the chosen order. `shown` is what fits in `limit`; `total` is every match. */
export function filterDashboardItems<T extends DashboardItem>(
  items: T[],
  query: DashboardQuery,
  titleOf: (item: T) => string,
): { shown: T[]; total: number } {
  const words = plain(query.q).split(/\s+/).filter(Boolean)
  const matches = items.filter((item) => {
    if (query.type && kindOf(item) !== query.type) return false
    if (query.status && item.status !== query.status) return false
    if (words.length === 0) return true
    const title = plain(titleOf(item))
    return words.every((w) => title.includes(w))
  })
  const sorted = [...matches].sort((a, b) => {
    switch (query.sort) {
      case 'oldest':
        return time(a.created_at) - time(b.created_at)
      case 'edited':
        return time(b.updated_at ?? b.created_at) - time(a.updated_at ?? a.created_at)
      case 'title':
        return titleOf(a).localeCompare(titleOf(b), undefined, { sensitivity: 'base' })
      default:
        return time(b.created_at) - time(a.created_at)
    }
  })
  return { shown: sorted.slice(0, query.limit), total: sorted.length }
}
