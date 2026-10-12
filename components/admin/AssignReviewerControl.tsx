'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignFeatureRequest } from '@/lib/actions/feature-requests'
import { Button } from '@/components/ui/button'

export interface Reviewer {
  id: string
  name: string
  role: string
}

/** Admin: pick an editor from the list, add instructions, and assign — the editor gets an email. */
export function AssignReviewerControl({
  contentId,
  reviewers,
  assignedTo,
}: {
  contentId: string
  reviewers: Reviewer[]
  assignedTo: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [reviewerId, setReviewerId] = useState(assignedTo ?? '')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = () => {
    if (!reviewerId) {
      setMessage({ ok: false, text: 'Pick an editor first' })
      return
    }
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await assignFeatureRequest(contentId, reviewerId, note)
        if (!result.ok) {
          setMessage({ ok: false, text: result.error })
          return
        }
        setMessage({
          ok: true,
          text: result.emailed ? 'Assigned — the editor was emailed' : 'Assigned — email not sent (check email settings)',
        })
        setOpen(false)
        router.refresh()
      } catch (err) {
        setMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed' })
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {!open ? (
        <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setOpen(true)}>
          {assignedTo ? 'Reassign' : 'Assign to editor'}
        </Button>
      ) : (
        <div className="flex w-64 flex-col gap-1.5 rounded-lg border border-primary/15 bg-card p-2.5">
          <select
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            aria-label="Editor"
            className="h-8 rounded-md border border-primary/20 bg-white px-2 text-xs"
          >
            <option value="">Choose an editor…</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.role})
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Instructions for the editor (optional)"
            rows={3}
            maxLength={1000}
            className="rounded-md border border-primary/20 bg-white px-2 py-1.5 text-xs"
          />
          <div className="flex gap-1.5">
            <Button type="button" size="sm" className="h-7 px-2.5 text-xs" disabled={isPending} onClick={submit}>
              {isPending ? 'Assigning…' : 'Assign and email'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2.5 text-xs" disabled={isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {message && (
        <span className={`max-w-[16rem] text-xs font-medium ${message.ok ? 'text-green-800' : 'text-[#991b1b]'}`}>{message.text}</span>
      )}
    </div>
  )
}
