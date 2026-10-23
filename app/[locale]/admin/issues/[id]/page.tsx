import { notFound } from 'next/navigation'
import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { loadPickerArticles } from '@/lib/data/issue-picker'
import { dateToMonth } from '@/lib/issues'
import { IssueForm } from '@/components/admin/IssueForm'

export default async function EditIssuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireEditor()
  const { id } = await params
  const supabase = await createClient()
  const { data: issue } = await (supabase as any).from('issues').select('id, number, issue_date, status, editorial_id').eq('id', id).maybeSingle()
  if (!issue) notFound()

  const [articles, { data: members }] = await Promise.all([
    loadPickerArticles(supabase),
    (supabase as any).from('content').select('id').eq('issue_id', id),
  ])

  return (
    <IssueForm
      initial={{
        id: issue.id,
        number: issue.number,
        month: dateToMonth(issue.issue_date),
        published: issue.status === 'published',
        editorialId: issue.editorial_id ?? null,
        articleIds: (members ?? []).map((m: any) => m.id),
      }}
      articles={articles}
    />
  )
}
