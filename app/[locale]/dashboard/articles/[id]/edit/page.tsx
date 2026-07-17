import { notFound } from 'next/navigation'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { EditArticleForm } from './EditArticleForm'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { ImageWithCredit } from '@/lib/tiptap/image-with-credit'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

const tiptapExtensions = [
  StarterKit.configure({ link: false }),
  Link,
  ImageWithCredit,
  Table, TableRow, TableCell, TableHeader,
]

function convertBodyToEditable(rawBody: unknown): { body: EditorBlock[] | null; bodyHtml: string | null } {
  if (Array.isArray(rawBody)) {
    return { body: rawBody as EditorBlock[], bodyHtml: null }
  }
  const pm = rawBody as any
  if (pm?.type === 'doc' && Array.isArray(pm?.content)) {
    try {
      return { body: null, bodyHtml: generateHTML(pm, tiptapExtensions) }
    } catch {
      return { body: null, bodyHtml: null }
    }
  }
  return { body: null, bodyHtml: null }
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const isAdmin = profile.role === 'admin'
  const articleQuery = (supabase as any)
    .from('content')
    .select(`
      id, status, source_locale, cover_image_url, image_credits, feature_requested_at,
      profiles!author_id ( display_name, bio ),
      content_translations ( title, excerpt, featured_summary, body, locale, is_auto_translated ),
      content_tags ( tag_id, tags ( id, slug, names ) )
    `)
    .eq('id', id)
    .eq('type', 'article')
  if (!isAdmin) articleQuery.eq('author_id', user.id)
  const articlePromise = articleQuery.single()

  const [{ userId: _userId, ...navProps }, { data: article }] = await Promise.all([
    getNavProps(),
    articlePromise,
  ])

  if (!article) notFound()

  const sourceLocale: string = article.source_locale ?? 'en'

  // Build per-locale translation data, converting ProseMirror bodies to HTML where needed
  const rawTranslations: Array<any> = article.content_translations ?? []
  const translations = rawTranslations.map((tr: any) => {
    const { body: editorBody, bodyHtml } = convertBodyToEditable(tr.body)
    return {
      locale: tr.locale as string,
      title: (tr.title ?? '') as string,
      excerpt: (tr.excerpt ?? '') as string,
      featuredSummary: (tr.featured_summary ?? '') as string,
      body: editorBody,
      bodyHtml,
      isAutoTranslated: tr.is_auto_translated as boolean | null,
    }
  })

  // Ensure source locale is always present
  if (!translations.some(tr => tr.locale === sourceLocale)) {
    translations.unshift({ locale: sourceLocale, title: '', excerpt: '', featuredSummary: '', body: null, bodyHtml: null, isAutoTranslated: null })
  }

  const initialTags = (article.content_tags ?? [])
    .map((ct: any) => ct.tags)
    .filter(Boolean)
    .map((t: any) => ({ id: t.id, slug: t.slug, name: t.names?.en ?? t.slug }))

  const author = Array.isArray(article.profiles) ? article.profiles[0] : article.profiles

  return (
    <>
      <Navigation {...navProps} />
      <EditArticleForm
        id={id}
        status={article.status}
        sourceLocale={sourceLocale}
        translations={translations}
        availableLocales={SUPPORTED_LOCALES as unknown as string[]}
        initialCoverImageUrl={article.cover_image_url ?? ''}
        initialImageCredits={article.image_credits ?? ''}
        initialTags={initialTags}
        initialFeatureRequested={!!article.feature_requested_at}
        authorName={author?.display_name ?? ''}
        authorBio={author?.bio ?? undefined}
      />
      <Footer />
    </>
  )
}
