import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { loadRelatedContent, type RelatedItem } from '@/lib/data/related-content'
import { ContentCard } from '@/components/content/ContentCard'

/** The heading and the (up to three) cards. Nothing at all when there is nothing to suggest. */
export function RelatedSection({ title, items, isLoggedIn }: { title: string; items: RelatedItem[]; isLoggedIn: boolean }) {
  if (items.length === 0) return null
  return (
    <section className="bg-background" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      <div className="mx-auto max-w-[1280px] px-6 py-14">
        <h2
          className="mb-8 text-foreground"
          style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, fontSize: 'clamp(26px, 4vw, 34px)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.contentId} {...item} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** "También te puede interesar": goes under the author card of every content page */
export async function RelatedContent({
  contentId, type, locale, userId,
}: { contentId: string; type: string; locale: string; userId?: string | null }) {
  const [t, supabase] = await Promise.all([getTranslations({ locale, namespace: 'content' }), createClient()])
  const items = await loadRelatedContent(supabase, { contentId, type, locale, userId })
  return <RelatedSection title={t('relatedTitle')} items={items} isLoggedIn={!!userId} />
}
