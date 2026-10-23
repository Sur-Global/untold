// The topics shown in the "Explorar" menu and the footer: the most trending ones on the site. A topic is as
// trending as the content that has it is recent and liked: this season's content weighs more than old content.

import { tagDisplayName } from '@/lib/tag-name'

export type TopicRow = {
  tags?: { slug: string; names?: Record<string, string> | null } | null
  content?: { published_at?: string | null; likes_count?: number | null } | null
}

export type Topic = { slug: string; names: Record<string, string> }

/** Tags that name a kind of text (not a subject), so they never show as a topic */
export const NOT_TOPICS = new Set(['editorial', 'entrevista'])

const DAY = 24 * 60 * 60 * 1000

/** How much a piece of content counts, by age: 1 for the last 3 months, down to 0.15 for the oldest */
export function recencyWeight(publishedAt: string | null | undefined, now: Date): number {
  const age = publishedAt ? (now.getTime() - Date.parse(publishedAt)) / DAY : Infinity
  if (age <= 90) return 1
  if (age <= 180) return 0.6
  if (age <= 365) return 0.3
  return 0.15
}

/** The `limit` most trending topics: each content adds its recency weight, plus half a point per like */
export function rankTrendingTopics(rows: TopicRow[], now: Date = new Date(), limit = 5): Topic[] {
  const byTag = new Map<string, { topic: Topic; score: number; count: number }>()
  for (const row of rows) {
    const tag = row.tags
    if (!tag?.slug || NOT_TOPICS.has(tag.slug)) continue
    const weight = recencyWeight(row.content?.published_at, now) * (1 + 0.5 * (row.content?.likes_count ?? 0))
    const found = byTag.get(tag.slug)
    if (found) {
      found.score += weight
      found.count++
    } else {
      byTag.set(tag.slug, { topic: { slug: tag.slug, names: tag.names ?? {} }, score: weight, count: 1 })
    }
  }
  return [...byTag.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count || a.topic.slug.localeCompare(b.topic.slug))
    .slice(0, limit)
    .map((t) => t.topic)
}

/** "decolonización" → "Decolonización", in the reader's language, as the menu shows it */
export function topicLabel(topic: Topic, locale: string): string {
  const name = tagDisplayName(topic.names, locale, topic.slug)
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}
