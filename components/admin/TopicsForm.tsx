'use client'

import { useState, useTransition } from 'react'
import { Tags } from 'lucide-react'
import { setTagTopic } from '@/lib/actions/topics'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

export type TopicRow = { id: string; slug: string; name: string; count: number; isTopic: boolean }

/** A good number of topics: enough to browse by, few enough to fit in one row on the listing pages */
const SUGGESTED_MAX = 16

/** Admin → Topics: which tags are the topics of the site. */
export function TopicsForm({ initial }: { initial: TopicRow[] }) {
  const [rows, setRows] = useState(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [, startTransition] = useTransition()
  const topics = rows.filter((row) => row.isTopic)

  const toggle = (row: TopicRow, isTopic: boolean) => {
    setMessage(null)
    setRows((all) => all.map((r) => (r.id === row.id ? { ...r, isTopic } : r)))
    startTransition(async () => {
      const result = await setTagTopic(row.id, isTopic)
      if (!result.ok) {
        setRows((all) => all.map((r) => (r.id === row.id ? { ...r, isTopic: !isTopic } : r)))
        setMessage({ ok: false, text: result.error })
      }
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Topics"
        description={
          <>
            The topics are the few tags (about a dozen) that are the themes of the site. They are what each listing offers to explore, what is
            shown above every article, video, podcast and pill, and what has its own page (/topics). The other tags stay as plain tags: they
            show small at the end of a piece of content and still work for search. Changes are saved as you tick.
          </>
        }
      />
      <p className="flex items-center gap-2 text-sm text-foreground" role="status">
        <Tags className="h-4 w-4 text-primary" aria-hidden />
        {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
        {topics.length > SUGGESTED_MAX && <span className="text-destructive"> — more than {SUGGESTED_MAX} is too many for one row</span>}
      </p>
      {message && <p className={`text-sm ${message.ok ? 'text-secondary' : 'text-destructive'}`}>{message.text}</p>}

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-6 py-3">Tag</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3 text-right">Published content</th>
                <th className="px-6 py-3 text-center">Topic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={adminTableRow}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">/tag/{row.slug}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">{row.count}</td>
                  <td className="px-6 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.isTopic}
                      onChange={(e) => toggle(row, e.target.checked)}
                      aria-label={`${row.name} is a topic`}
                      className="size-4 rounded border-primary/30"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
