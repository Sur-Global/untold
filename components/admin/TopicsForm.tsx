'use client'

import { Fragment, useState, useTransition } from 'react'
import { Tags } from 'lucide-react'
import { saveTopicDetails, setTagTopic } from '@/lib/actions/topics'
import { TOPIC_DESCRIPTION_MAX } from '@/lib/topics'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { adminPrimaryButton, adminTableHead, adminTableRow } from '@/components/admin/admin-ui'
import { CoverImageInput } from '@/components/ui/CoverImageInput'

export type TopicRow = { id: string; slug: string; name: string; count: number; isTopic: boolean; description?: string; imageUrl?: string }

/** A good number of topics: enough to browse by, few enough to fit in one row on the listing pages */
const SUGGESTED_MAX = 16

const fieldClass =
  'w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50'

/** The sentence and the picture of a topic's page */
function TopicDetails({ row, onSaved }: { row: TopicRow; onSaved: (patch: Pick<TopicRow, 'description' | 'imageUrl'>) => void }) {
  const [description, setDescription] = useState(row.description ?? '')
  const [imageUrl, setImageUrl] = useState(row.imageUrl ?? '')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const save = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await saveTopicDetails(row.id, { description, imageUrl })
      if (!result.ok) return setMessage({ ok: false, text: result.error })
      onSaved({ description: description.trim(), imageUrl })
      setMessage({
        ok: result.translated,
        text: result.translated ? 'Saved and translated to the other languages.' : 'Saved in Spanish. The translation was not possible now: the other languages show the Spanish sentence for the moment.',
      })
    })
  }

  return (
    <div className="grid gap-6 bg-muted/30 px-6 py-5 lg:grid-cols-2">
      <div>
        <label htmlFor={`topic-${row.id}-description`} className="mb-1 block text-xs font-medium text-muted-foreground">
          Sentence about the topic (in Spanish — it is translated to the other languages when you save)
        </label>
        <textarea
          id={`topic-${row.id}-description`}
          className={`${fieldClass} min-h-24`}
          maxLength={TOPIC_DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">{TOPIC_DESCRIPTION_MAX - description.length} characters left</p>
      </div>
      <CoverImageInput
        name={`topic-${row.id}-image`}
        label="Picture (optional)"
        uploadType="cover"
        previewAspect="4/3"
        sizeHint="Shown next to the title on the topic's page. Best: 1200 × 900 px (4:3). Without a picture, the sentence sits on the brand's lime."
        defaultValue={imageUrl}
        onChange={setImageUrl}
      />
      <div className="flex items-center gap-4 lg:col-span-2">
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save topic page'}
        </button>
        {message && <p className={`text-sm ${message.ok ? 'text-secondary' : 'text-destructive'}`} role="status">{message.text}</p>}
      </div>
    </div>
  )
}

/** Admin → Topics: which tags are the topics of the site, and the sentence and picture of each topic's page. */
export function TopicsForm({ initial }: { initial: TopicRow[] }) {
  const [rows, setRows] = useState(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
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
            show small at the end of a piece of content and still work for search. Ticking is saved as you go; use “Edit” to write the sentence
            and add the picture of a topic’s page.
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
                <th className="px-6 py-3 text-right">Topic page</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className={adminTableRow}>
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
                    <td className="px-6 py-3 text-right">
                      {row.isTopic && (
                        <button
                          type="button"
                          onClick={() => setOpen(open === row.id ? null : row.id)}
                          aria-expanded={open === row.id}
                          aria-label={`Edit the page of ${row.name}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {open === row.id ? 'Close' : row.description ? 'Edit' : 'Add a sentence'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === row.id && row.isTopic && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <TopicDetails
                          row={row}
                          onSaved={(patch) => setRows((all) => all.map((r) => (r.id === row.id ? { ...r, ...patch } : r)))}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
