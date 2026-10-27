import { getTranslation } from '@/lib/content'
import { cardTopic } from '@/lib/topics'
import { tagDisplayName } from '@/lib/tag-name'
import type { HeroItem } from '@/components/content/FeaturedHero'

/**
 * The starred pieces of an articles or videos page as the hero shows them: title in the reader's language, picture,
 * main topic, author and how long (reading time of an article, length of a video).
 * `readTime` writes "23 min de lectura" in the reader's language.
 */
export function buildHeroItems(items: any[], type: 'article' | 'video', locale: string, readTime: (minutes: number) => string): HeroItem[] {
  return items.map((item) => {
    const t = getTranslation(item.content_translations ?? [], locale)
    const topic = cardTopic(item.content_tags)
    const video = Array.isArray(item.video_meta) ? item.video_meta[0] : item.video_meta
    return {
      href: `/${type === 'article' ? 'articles' : 'videos'}/${item.slug}`,
      title: t?.title ?? 'Untitled',
      imageUrl: item.cover_image_url ?? (type === 'video' ? video?.thumbnail_url : null) ?? null,
      topic: topic ? { name: tagDisplayName(topic.names, locale, topic.slug), slug: topic.slug } : null,
      authorName: item.profiles?.display_name ?? null,
      meta: type === 'article' ? (item.read_time_minutes ? readTime(item.read_time_minutes) : null) : (video?.duration ?? null),
    }
  })
}
