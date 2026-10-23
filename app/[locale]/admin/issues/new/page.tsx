import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { loadPickerArticles } from '@/lib/data/issue-picker'
import { dateToMonth } from '@/lib/issues'
import { IssueForm } from '@/components/admin/IssueForm'

export default async function NewIssuePage({ searchParams }: { searchParams: Promise<{ editorial?: string }> }) {
  await requireEditor()
  const { editorial } = await searchParams
  // coming from an article's edit page: that article is the editorial (and part of the issue)
  const editorialId = editorial && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editorial) ? editorial : null
  const supabase = await createClient()
  const [articles, { data: last }] = await Promise.all([
    loadPickerArticles(supabase),
    // drafts (for example a December issue prepared in advance) do not push the suggested month forward
    (supabase as any).from('issues').select('number, issue_date').eq('status', 'published').order('issue_date', { ascending: false }).limit(1),
  ])
  // the month after the last published issue (or this month for the first one)
  const base = last?.[0] ? new Date(`${last[0].issue_date}T00:00:00Z`) : new Date()
  if (last?.[0]) base.setUTCMonth(base.getUTCMonth() + 1)
  const month = dateToMonth(base.toISOString())

  return <IssueForm initial={{ id: null, month, published: false, editorialId, articleIds: editorialId ? [editorialId] : [] }} articles={articles} />
}
