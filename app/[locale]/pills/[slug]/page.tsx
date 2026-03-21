import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PillPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

  const { data: pill } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug ),
      content_translations ( title, body, locale ),
      pill_meta ( accent_color, image_url )
    `)
    .eq('slug', slug)
    .eq('type', 'pill')
    .eq('status', 'published')
    .single()

  if (!pill) notFound()

  const t = getTranslation(pill.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = pill.pill_meta
  const accentColor = meta?.accent_color ?? '#6B8E23'
  const body = t.body as Record<string, unknown> | null

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Pill header with accent color */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{ background: `${accentColor}12`, borderTop: `4px solid ${accentColor}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              Knowledge Pill
            </span>
          </div>
          <h1 className="mb-4" style={{ color: '#2C2420' }}>{t.title}</h1>
          {meta?.image_url && (
            <img src={meta.image_url} alt="" className="w-full rounded-xl object-cover max-h-48" />
          )}
        </div>

        {body ? (
          <ArticleBody json={body} />
        ) : (
          <p className="text-[#6B5F58]">No content.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
