'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireEditor } from '@/lib/require-editor'
import { logActivity } from '@/lib/actions/activity-log'
import { monthToDate, toRoman } from '@/lib/issues'

export type SaveIssueInput = {
  /** empty when creating a new issue */
  id?: string | null
  number: number
  /** "2026-10" */
  month: string
  published: boolean
  /** an article: written as usual, then chosen here as this issue's editorial */
  editorialId: string | null
  /** the articles that belong to this issue (the editorial is always included) */
  articleIds: string[]
}

export type SaveIssueResult = { ok: true; id: string } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const duplicateMessage = (number: number, date: string) => `Issue ${toRoman(number)} of ${date.slice(0, 4)} already exists.`

// Expected problems are returned, not thrown: in production Next.js replaces the message of a thrown
// server-action error with a generic one.
export async function saveIssue(input: SaveIssueInput): Promise<SaveIssueResult> {
  await requireEditor()

  const number = Number(input.number)
  if (!Number.isInteger(number) || number < 1) return { ok: false, error: 'The issue number must be a whole number, 1 or higher.' }
  const issueDate = monthToDate(input.month ?? '')
  if (!issueDate) return { ok: false, error: 'Choose the month of the issue.' }
  const editorialId = input.editorialId || null
  if (editorialId && !UUID.test(editorialId)) return { ok: false, error: 'The editorial is not valid.' }
  const articleIds = [...new Set([...(input.articleIds ?? []), ...(editorialId ? [editorialId] : [])])]
  if (articleIds.some((id) => !UUID.test(id)) || articleIds.length > 300) return { ok: false, error: 'The list of articles is not valid.' }

  const supabase = await createClient()
  const row = { number, issue_date: issueDate, status: input.published ? 'published' : 'draft', editorial_id: editorialId }

  let id = input.id ?? null
  if (id) {
    const { error } = await (supabase as any).from('issues').update(row).eq('id', id)
    if (error) return { ok: false, error: error.code === '23505' ? duplicateMessage(number, issueDate) : error.message }
  } else {
    const { data, error } = await (supabase as any).from('issues').insert(row).select('id').single()
    if (error) return { ok: false, error: error.code === '23505' ? duplicateMessage(number, issueDate) : error.message }
    id = data.id as string
  }

  // Articles that were in this issue but are not any more
  const release = (supabase as any).from('content').update({ issue_id: null }).eq('issue_id', id)
  const { error: releaseError } = articleIds.length ? await release.not('id', 'in', `(${articleIds.join(',')})`) : await release
  if (releaseError) return { ok: false, error: releaseError.message }

  if (articleIds.length) {
    const { error: assignError } = await (supabase as any).from('content').update({ issue_id: id }).in('id', articleIds)
    if (assignError) return { ok: false, error: assignError.message }
  }
  // The editorial is also marked ✎, so the homepage works with or without the issue
  if (editorialId) await (supabase as any).from('content').update({ is_editorial: true }).eq('id', editorialId)

  await logActivity({ entityType: 'issue', entityId: id, entityLabel: `Issue ${toRoman(number)} · ${issueDate.slice(0, 4)}`, action: input.id ? 'updated' : 'created' })

  revalidatePath('/', 'layout')
  return { ok: true, id: id! }
}

export async function deleteIssue(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireEditor()
  if (!UUID.test(id)) return { ok: false, error: 'The issue is not valid.' }
  const supabase = await createClient()
  // the articles stay; they just no longer belong to an issue
  const { error } = await (supabase as any).from('issues').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  await logActivity({ entityType: 'issue', entityId: id, entityLabel: null, action: 'deleted' })
  revalidatePath('/', 'layout')
  return { ok: true }
}
