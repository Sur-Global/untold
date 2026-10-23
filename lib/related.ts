// "También te puede interesar": which content to suggest under a content page. Pure ranking; the data
// comes from lib/data/related-content.ts.

export type RelatedCandidate = {
  id: string
  type: string
  /** slugs of the topics (tags) of the content */
  tagSlugs: string[]
  /** pinned somewhere (listing, homepage or hero) */
  isFeatured: boolean
  publishedAt: string | null
}

type Current = { id: string; type: string; tagSlugs: string[] }

const time = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0)

/**
 * The best `limit` suggestions for `current`:
 * 1. content on the same topic comes first (at least one tag in common), then the closest we have;
 * 2. within each of those, featured content goes before everything else;
 * 3. then the one sharing the most topics (or, with no topic in common, the same kind of content);
 * 4. then the most recent.
 * The content itself is never suggested.
 */
export function rankRelated<T extends RelatedCandidate>(current: Current, candidates: T[], limit = 3): T[] {
  const own = new Set(current.tagSlugs)
  const shared = (c: T) => c.tagSlugs.filter((slug) => own.has(slug)).length
  const scored = candidates
    .filter((c) => c.id !== current.id)
    .map((c) => ({ c, shared: shared(c) }))
  scored.sort((a, b) => {
    if (a.shared > 0 !== b.shared > 0) return a.shared > 0 ? -1 : 1
    if (a.c.isFeatured !== b.c.isFeatured) return a.c.isFeatured ? -1 : 1
    if (a.shared > 0) {
      if (a.shared !== b.shared) return b.shared - a.shared
    } else {
      const sameA = a.c.type === current.type
      const sameB = b.c.type === current.type
      if (sameA !== sameB) return sameA ? -1 : 1
    }
    return time(b.c.publishedAt) - time(a.c.publishedAt)
  })
  return scored.slice(0, limit).map((s) => s.c)
}
