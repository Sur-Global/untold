import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { isReservedStaticPageSlug } from '@/lib/static-pages/reserved-slugs'
import { getPublishedStaticPageBySlug } from '@/lib/data/static-pages'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  if (isReservedStaticPageSlug(slug)) return { title: 'UNTOLD' }
  const supabase = await createClient()
  const page = await getPublishedStaticPageBySlug(supabase, slug, locale)
  return {
    title: page?.title ? `${page.title} — UNTOLD` : 'UNTOLD',
  }
}

function bodyHasRenderableContent(
  body: Record<string, unknown> | unknown[] | null
): boolean {
  if (body == null) return false
  if (Array.isArray(body)) return body.length > 0
  return Object.keys(body).length > 0
}

export default async function PublicStaticPage({ params }: PageProps) {
  const { locale, slug } = await params
  if (isReservedStaticPageSlug(slug)) notFound()

  const supabase = await createClient()
  const [nav, page] = await Promise.all([
    getNavProps(),
    getPublishedStaticPageBySlug(supabase, slug, locale),
  ])

  if (!page) notFound()

  const showBody = bodyHasRenderableContent(
    page.body as Record<string, unknown> | unknown[] | null,
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation
        isLoggedIn={nav.isLoggedIn}
        userRole={nav.userRole}
        cmsNavItems={nav.cmsNavItems}
        showSearchInHeader={nav.showSearchInHeader}
      />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1
            className="mb-10 font-heading text-4xl tracking-tight text-foreground sm:text-5xl"
          >
            {page.title}
          </h1>
          {showBody && (
            <ArticleBody json={page.body as Record<string, unknown> | unknown[]} />
          )}
        </article>
      </main>
      <Footer />
    </div>
  )
}
