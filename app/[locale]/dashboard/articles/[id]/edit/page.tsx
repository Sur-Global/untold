import { notFound } from 'next/navigation'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
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
import { getEnabledLocales } from '@/lib/data/enabled-locales'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { getTranslations } from 'next-intl/server'
import { IssuePanel } from '@/components/content/IssuePanel'
import { issueLabel } from '@/lib/issues'
import { tagDisplayName } from '@/lib/tag-name'

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
  const { id, locale } = await params
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const isAdmin = isEditorRole(profile.role)
  const articleQuery = (supabase as any)
    .from('content')
    .select(`
      id, slug, author_id, status, is_editorial, source_locale, single_language, subtitle_locales, cover_image_url, image_credits, feature_requested_at, declaration_accepted_at,
      issue:issues!content_issue_id_fkey ( id, issue_date ),
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
  const enabledLocales = await getEnabledLocales()

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
    .map((t: any) => ({ id: t.id, slug: t.slug, name: tagDisplayName(t.names, locale, t.slug) }))

  const author = Array.isArray(article.profiles) ? article.profiles[0] : article.profiles

  // Editors and administrators can link the article to a numbered issue (never plain creators)
  const tIssuePanel = isAdmin ? await getTranslations({ locale, namespace: 'issuePanel' }) : null
  const issue = Array.isArray(article.issue) ? article.issue[0] : article.issue

  return (
    <>
      <Navigation {...navProps} />
      {tIssuePanel && (
        <div className="mx-auto max-w-[900px] px-6 pt-8">
          <IssuePanel
            articleId={id}
            published={article.status === 'published'}
            issue={issue ? { id: issue.id, monthLabel: issueLabel(issue.issue_date, locale).toLowerCase() } : null}
            isEditorial={!!article.is_editorial}
            labels={{
              title: tIssuePanel('title'),
              inIssue: tIssuePanel('inIssue'),
              isEditorial: tIssuePanel('isEditorial'),
              editIssue: tIssuePanel('editIssue'),
              notInIssue: tIssuePanel('notInIssue'),
              createIssue: tIssuePanel('createIssue'),
              addToIssue: tIssuePanel('addToIssue'),
              publishFirst: tIssuePanel('publishFirst'),
            }}
          />
        </div>
      )}
      <EditArticleForm
        id={id}
        status={article.status}
        initialAuthorId={article.author_id}
        slug={article.slug}
        initialSingleLanguage={article.single_language ?? false}
        initialDeclared={!!article.declaration_accepted_at}
        sourceLocale={sourceLocale}
        translations={translations}
        availableLocales={[...new Set([...enabledLocales, sourceLocale])]}
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
