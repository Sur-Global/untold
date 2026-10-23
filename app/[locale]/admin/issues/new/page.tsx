import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { loadPickerArticles } from '@/lib/data/issue-picker'
import { dateToMonth } from '@/lib/issues'
import { IssueForm } from '@/components/admin/IssueForm'

export default async function NewIssuePage() {
  await requireEditor()
  const supabase = await createClient()
  const [articles, { data: last }] = await Promise.all([
    loadPickerArticles(supabase),
    (supabase as any).from('issues').select('number, issue_date').order('issue_date', { ascending: false }).order('number', { ascending: false }).limit(1),
  ])
  // the month after the last issue (or this month for the first one)
  const base = last?.[0] ? new Date(`${last[0].issue_date}T00:00:00Z`) : new Date()
  if (last?.[0]) base.setUTCMonth(base.getUTCMonth() + 1)
  const month = dateToMonth(base.toISOString())

  return <IssueForm initial={{ id: null, month, published: false, editorialId: null, articleIds: [] }} articles={articles} />
}
