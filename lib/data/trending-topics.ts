import { createClient } from '@supabase/supabase-js'
import { rankTrendingTopics, topicLabel, type Topic } from '@/lib/trending-topics'

const TEN_MINUTES = 10 * 60 * 1000
let cached: { at: number; topics: Topic[] } | null = null

/** The most trending topics of the site (public data), remembered for ten minutes so every page does not ask again */
async function trendingTopics(limit: number): Promise<Topic[]> {
  if (cached && Date.now() - cached.at < TEN_MINUTES) return cached.topics.slice(0, limit)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await supabase
    .from('content_tags')
    .select('tags ( slug, names ), content!inner ( status, is_curated, published_at, likes_count )')
    .eq('content.status', 'published')
    .eq('content.is_curated', true)
    .limit(5000)
  const topics = rankTrendingTopics((data as any[]) ?? [], new Date(), 12)
  // an empty answer (a hiccup of the database) is not remembered
  if (topics.length > 0) cached = { at: Date.now(), topics }
  return topics.slice(0, limit)
}

/** Topics of the menu, the footer and the home page in the reader's language: [{ slug, label, count }] */
export async function getTrendingTopics(locale: string, limit = 5): Promise<{ slug: string; label: string; count: number }[]> {
  return (await trendingTopics(limit)).map((t) => ({ slug: t.slug, label: topicLabel(t, locale), count: t.count }))
}
