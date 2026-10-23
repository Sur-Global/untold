'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { saveIssue, deleteIssue } from '@/lib/actions/issues'
import type { PickerArticle } from '@/lib/data/issue-picker'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { adminPrimaryButton, adminGhostButton } from '@/components/admin/admin-ui'

export type IssueFormInitial = {
  id: string | null
  number: number
  /** "2026-10" */
  month: string
  published: boolean
  editorialId: string | null
  articleIds: string[]
}

interface Props {
  initial: IssueFormInitial
  articles: PickerArticle[]
}

const fieldClass =
  'w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

export function IssueForm({ initial, articles }: Props) {
  const router = useRouter()
  const [number, setNumber] = useState(String(initial.number))
  const [month, setMonth] = useState(initial.month)
  const [published, setPublished] = useState(initial.published)
  const [editorialId, setEditorialId] = useState<string | null>(initial.editorialId)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.articleIds))
  const [query, setQuery] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles.filter((a) => {
      if (onlyFree && a.issueNumber !== null && !selected.has(a.id)) return false
      return !q || a.title.toLowerCase().includes(q) || (a.authorName ?? '').toLowerCase().includes(q)
    })
  }, [articles, query, onlyFree, selected])

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) {
        next.delete(id)
        if (editorialId === id) setEditorialId(null)
      } else next.add(id)
      return next
    })

  const chooseEditorial = (id: string) => {
    setEditorialId(id)
    setSelected((s) => new Set(s).add(id))
  }

  const save = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await saveIssue({
        id: initial.id,
        number: Number(number),
        month,
        published,
        editorialId,
        articleIds: [...selected],
      })
      if (result.ok) router.push('/admin/issues')
      else setMessage(result.error)
    })
  }

  const remove = () => {
    if (!initial.id || !window.confirm('Delete this issue? The articles stay on the site; they just no longer belong to an issue.')) return
    startTransition(async () => {
      const result = await deleteIssue(initial.id!)
      if (result.ok) router.push('/admin/issues')
      else setMessage(result.error)
    })
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={initial.id ? `Edit issue ${initial.number}` : 'New issue'}
        description="Set the number and month, choose which article is the editorial and tick the articles that belong to this issue. The issue appears on the site only when it is published."
      >
        <button type="button" onClick={() => router.push('/admin/issues')} className={adminGhostButton}>
          Cancel
        </button>
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save issue'}
        </button>
      </AdminPageHeader>
      {message && (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      )}

      <AdminPanel bodyClassName="p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="issue-number" className={labelClass}>
              Issue number
            </label>
            <input id="issue-number" type="number" min={1} step={1} className={fieldClass} value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div>
            <label htmlFor="issue-month" className={labelClass}>
              Month of the issue
            </label>
            <input id="issue-month" type="month" className={fieldClass} value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-4 rounded border-primary/30" />
            <span>
              Published
              <span className="block text-xs text-muted-foreground">Unticked = draft, only admins and editors see it</span>
            </span>
          </label>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editorial and articles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tick <strong>In this issue</strong> for each article of the issue, and pick one with <strong>Editorial</strong>: it is
            shown first, signed with its author’s profile. Write the editorial first as a normal article and publish it, then it
            appears in this list. An article can belong to one issue only: ticking one that is in another issue moves it here.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <input
              aria-label="Search articles"
              className={`${fieldClass} max-w-sm`}
              placeholder="Search by title or author"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} className="size-4 rounded border-primary/30" />
              Hide articles that are already in another issue
            </label>
            <span className="text-xs text-muted-foreground">{selected.size} in this issue</span>
          </div>
        </div>

        <ul className="max-h-[32rem] divide-y divide-primary/5 overflow-y-auto">
          {visible.length === 0 && <li className="px-6 py-8 text-center text-sm text-muted-foreground">No articles match.</li>}
          {visible.map((a) => {
            const inThis = selected.has(a.id)
            return (
              <li key={a.id} className={`flex items-center gap-4 px-6 py-3 ${inThis ? 'bg-primary/5' : ''}`}>
                <label className="flex w-28 shrink-0 items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={inThis} onChange={() => toggle(a.id)} aria-label={`In this issue: ${a.title}`} className="size-4 rounded border-primary/30" />
                  In this issue
                </label>
                <label className="flex w-24 shrink-0 items-center gap-2 text-xs text-foreground">
                  <input type="radio" name="editorial" checked={editorialId === a.id} onChange={() => chooseEditorial(a.id)} aria-label={`Editorial: ${a.title}`} className="size-4" />
                  Editorial
                </label>
                <span className="min-w-0 flex-1 text-sm text-foreground">
                  {a.title}
                  <span className="block text-xs text-muted-foreground">
                    {[a.authorName, a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {a.issueNumber !== null && !inThis && (
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">in issue {a.issueNumber}</span>
                )}
              </li>
            )
          })}
        </ul>
      </AdminPanel>

      <div className="flex items-center justify-between">
        {initial.id ? (
          <button type="button" onClick={remove} disabled={isPending} className="text-sm text-destructive hover:underline">
            Delete this issue
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save issue'}
        </button>
      </div>
    </div>
  )
}
