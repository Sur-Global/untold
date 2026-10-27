// Topics: the few tags (about a dozen) that the editors choose as the themes of the site (Admin → Topics).
// Pure helpers; the data comes from lib/data/topics.ts.

import type { CloudTag } from '@/lib/tag-cloud'
import { tagDisplayName } from '@/lib/tag-name'

/** How many topics the listing pages offer in their one row */
export const TOPIC_STRIP_SIZE = 8

export type TopicLink = { slug: string; name: string }

/**
 * The topics a listing page offers to explore: the ones with the most content of that kind first. A tag that is
 * not a topic but is the one being filtered stays in the row (highlighted), so the filter can be seen and cleared.
 */
export function pickTopicStrip(tags: CloudTag[], activeSlug?: string, limit = TOPIC_STRIP_SIZE): CloudTag[] {
  const topics = tags
    .filter((tag) => tag.isTopic)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
  const active = activeSlug ? tags.find((tag) => tag.slug === activeSlug) : undefined
  if (active && !topics.some((tag) => tag.slug === active.slug)) topics.push(active)
  return topics
}

type ItemTag = { slug: string; names?: Record<string, string> | null; is_topic?: boolean | null }

/**
 * What a piece of content shows of its tags: its main topic (the most specific one: the one with the least content),
 * the next one as a suggestion ("explore also"), and the rest as plain tags at the end.
 * `counts` = how much published content each tag has.
 */
export function splitItemTags(tags: ItemTag[], counts: Map<string, number>, locale: string): { primary: TopicLink | null; related: TopicLink | null; others: TopicLink[] } {
  const link = (tag: ItemTag): TopicLink => ({ slug: tag.slug, name: tagDisplayName(tag.names, locale, tag.slug) })
  // each tag once (the first time it appears)
  const unique = tags.filter((tag, index) => tag?.slug && tags.findIndex((other) => other?.slug === tag.slug) === index)
  const topics = unique
    .filter((tag) => tag.is_topic)
    .sort((a, b) => (counts.get(a.slug) ?? 0) - (counts.get(b.slug) ?? 0) || link(a).name.localeCompare(link(b).name))
  const used = new Set(topics.slice(0, 2).map((tag) => tag.slug))
  return {
    primary: topics[0] ? link(topics[0]) : null,
    related: topics[1] ? link(topics[1]) : null,
    others: unique.filter((tag) => !used.has(tag.slug)).map(link).sort((a, b) => a.name.localeCompare(b.name)),
  }
}

type CardTag = { slug: string; names?: Record<string, string> | null; is_topic?: boolean | null }

/** The tag a card shows as its category: the first topic of the content (a tag that is not a topic is not shown as one) */
export function cardTopic(contentTags: { tags?: CardTag | null }[] | null | undefined): CardTag | undefined {
  return (contentTags ?? []).map((row) => row.tags).find((tag): tag is CardTag => !!tag && !!tag.is_topic)
}
