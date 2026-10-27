import type { SupabaseClient } from '@supabase/supabase-js'
import { splitItemTags, type TopicLink } from '@/lib/topics'
import { tagDisplayName } from '@/lib/tag-name'

type RawTag = { slug: string; names?: Record<string, string> | null; is_topic?: boolean | null }

/** How much published content each tag has (by slug) */
export async function loadTagCounts(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await (supabase as any)
    .from('content_tags')
    .select('tags!inner ( slug ), content!inner ( status, is_curated )')
    .eq('content.status', 'published')
    .eq('content.is_curated', true)
    .limit(5000)
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const slug = row.tags?.slug
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return counts
}

/** The topic that appears most often together with a topic, in published content (not one of `exclude`) */
export async function mostRelatedTopic(supabase: SupabaseClient, slug: string, locale: string, exclude: string[] = []): Promise<TopicLink | null> {
  const { data: tag } = await (supabase as any).from('tags').select('id').eq('slug', slug).maybeSingle()
  if (!tag) return null
  const { data: sameContent } = await (supabase as any)
    .from('content_tags')
    .select('content_id, content!inner ( status, is_curated )')
    .eq('tag_id', tag.id)
    .eq('content.status', 'published')
    .eq('content.is_curated', true)
    .limit(5000)
  const ids: string[] = (sameContent ?? []).map((row: any) => row.content_id)
  if (ids.length === 0) return null

  const { data: rows } = await (supabase as any)
    .from('content_tags')
    .select('tags!inner ( slug, names, is_topic )')
    .in('content_id', ids)
    .eq('tags.is_topic', true)
    .limit(5000)
  const skip = new Set([slug, ...exclude])
  const found = new Map<string, { names: Record<string, string> | null | undefined; count: number }>()
  for (const row of rows ?? []) {
    const other = row.tags
    if (!other?.slug || skip.has(other.slug)) continue
    const entry = found.get(other.slug) ?? { names: other.names, count: 0 }
    entry.count++
    found.set(other.slug, entry)
  }
  const best = [...found.entries()]
    .map(([otherSlug, entry]) => ({ slug: otherSlug, name: tagDisplayName(entry.names, locale, otherSlug), count: entry.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0]
  return best ? { slug: best.slug, name: best.name } : null
}

/**
 * The tags of a piece of content as it shows them: its main topic, one to explore also and the other tags.
 * With a single topic, the suggestion is the topic that most often goes with it.
 */
export async function loadContentTopics(supabase: SupabaseClient, tags: RawTag[], locale: string) {
  const counts = await loadTagCounts(supabase)
  const split = splitItemTags(tags, counts, locale)
  if (split.primary && !split.related) {
    split.related = await mostRelatedTopic(supabase, split.primary.slug, locale)
    if (split.related) split.others = split.others.filter((other) => other.slug !== split.related!.slug)
  }
  return split
}

/** Every topic that has published content, with how much (for the page of all topics) */
export async function loadAllTopics(supabase: SupabaseClient, locale: string): Promise<(TopicLink & { count: number })[]> {
  const { data } = await (supabase as any)
    .from('content_tags')
    .select('tags!inner ( slug, names, is_topic ), content!inner ( status, is_curated )')
    .eq('tags.is_topic', true)
    .eq('content.status', 'published')
    .eq('content.is_curated', true)
    .limit(5000)
  const byTopic = new Map<string, TopicLink & { count: number }>()
  for (const row of data ?? []) {
    const tag = row.tags
    if (!tag?.slug) continue
    const found = byTopic.get(tag.slug)
    if (found) found.count++
    else byTopic.set(tag.slug, { slug: tag.slug, name: tagDisplayName(tag.names, locale, tag.slug), count: 1 })
  }
  return [...byTopic.values()].sort((a, b) => a.name.localeCompare(b.name, locale))
}
