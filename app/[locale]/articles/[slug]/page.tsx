import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { readTime } from '@/lib/utils'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('content')
    .select('content_translations ( title, excerpt, locale )')
    .eq('slug', slug)
    .eq('type', 'article')
    .eq('status', 'published')
    .single()

  const t = getTranslation(data?.content_translations ?? [], locale)
  return {
    title: t?.title ? `${t.title} — UNTOLD` : 'UNTOLD',
    description: t?.excerpt ?? undefined,
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

  const { data: article } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at, cover_image_url, source_locale,
      profiles!author_id ( id, display_name, slug, avatar_url, followers_count, role ),
      content_translations ( title, excerpt, body, locale ),
      content_tags ( tags ( slug, names ) )
    `)
    .eq('slug', slug)
    .eq('type', 'article')
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  const t = getTranslation(article.content_translations ?? [], locale)
  if (!t) notFound()

  const author = article.profiles
  const body = t.body as Record<string, unknown> | null
  const tags = article.content_tags?.map((ct: any) => ct.tags) ?? []

  // Estimate read time from body text
  const bodyText = body
    ? JSON.stringify(body).replace(/"[^"]*":\s*"/g, ' ').replace(/[{}\[\]",]/g, ' ')
    : ''
  const minutes = readTime(bodyText)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <header className="mb-10">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag: any) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded hover:bg-[rgba(160,82,45,0.12)] transition-colors"
                  style={{ background: 'rgba(160,82,45,0.07)', color: '#A0522D' }}
                >
                  #{tag.names?.en ?? tag.slug}
                </Link>
              ))}
            </div>
          )}

          <h1 className="mb-6">{t.title}</h1>

          {t.excerpt && (
            <p className="text-xl text-[#6B5F58] mb-6 leading-relaxed">{t.excerpt}</p>
          )}

          {/* Author + meta bar */}
          <div className="flex items-center gap-4 py-4" style={{ borderTop: '1px solid rgba(139,69,19,0.12)', borderBottom: '1px solid rgba(139,69,19,0.12)' }}>
            {author?.avatar_url && (
              <img src={author.avatar_url} alt={author.display_name} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div className="flex-1 min-w-0">
              {author && (
                <Link href={`/author/${author.slug}`} className="font-mono text-sm font-semibold hover:text-[#A0522D] transition-colors">
                  {author.display_name}
                </Link>
              )}
              <div className="text-xs text-[#6B5F58] font-mono mt-0.5">
                {article.published_at && (
                  <span>{new Date(article.published_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                )}
                <span className="mx-2">·</span>
                <span>{minutes} min read</span>
                {article.likes_count > 0 && (
                  <>
                    <span className="mx-2">·</span>
                    <span>♥ {article.likes_count}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Cover image */}
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={t.title}
            className="w-full rounded-xl mb-10 aspect-video object-cover"
          />
        )}

        {/* Body */}
        {body ? (
          <ArticleBody json={body} />
        ) : (
          <p className="text-[#6B5F58]">No content available.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
