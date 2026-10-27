// The tags that the published content of one kind (/videos, /podcasts…) has, with how much content each has.
// Pure helpers; the data comes from lib/data/tag-cloud.ts and the listing pages show the topics among them (lib/topics.ts).

import { tagDisplayName } from '@/lib/tag-name'

export type CloudTag = { slug: string; name: string; count: number; isTopic: boolean }

type Row = { tags?: { slug: string; names?: Record<string, string> | null; is_topic?: boolean | null } | null }

/** Counts the tags of a list of content_tags rows, named in the reader's language, most used first */
export function buildTagCloud(rows: Row[], locale: string, limit = 1000): CloudTag[] {
  const byTag = new Map<string, CloudTag>()
  for (const row of rows) {
    const tag = row.tags
    if (!tag?.slug) continue
    const found = byTag.get(tag.slug)
    if (found) found.count++
    else byTag.set(tag.slug, { slug: tag.slug, name: tagDisplayName(tag.names, locale, tag.slug), count: 1, isTopic: !!tag.is_topic })
  }
  return [...byTag.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale))
    .slice(0, limit)
    .sort((a, b) => a.name.localeCompare(b.name, locale))
}
