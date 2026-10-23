// Tag cloud of a listing page (/videos, /podcasts…): the topics that the published content of that kind has,
// bigger the more content they have. Pure helpers; the data comes from lib/data/tag-cloud.ts.

export type CloudTag = { slug: string; name: string; count: number }

type Row = { tags?: { slug: string; names?: Record<string, string> | null } | null }

/** Counts the tags of a list of content_tags rows, named in the reader's language, most used first */
export function buildTagCloud(rows: Row[], locale: string, limit = 40): CloudTag[] {
  const byTag = new Map<string, CloudTag>()
  for (const row of rows) {
    const tag = row.tags
    if (!tag?.slug) continue
    const found = byTag.get(tag.slug)
    if (found) found.count++
    else byTag.set(tag.slug, { slug: tag.slug, name: tag.names?.[locale] || tag.names?.en || tag.slug, count: 1 })
  }
  return [...byTag.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale))
    .slice(0, limit)
    // shown alphabetically, as a cloud is read: size says how much, order does not
    .sort((a, b) => a.name.localeCompare(b.name, locale))
}

/** 13px for the tag with the least content up to 26px for the one with the most */
export function cloudFontSize(count: number, min: number, max: number): number {
  if (max <= min) return 16
  return Math.round(13 + ((count - min) / (max - min)) * 13)
}
