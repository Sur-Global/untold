'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toggleAuthorFeatured } from '@/lib/actions/author'

/** Star one of your own published items to feature it first on your author page. */
export function AuthorStarToggle({ contentId, initialStarred }: { contentId: string; initialStarred: boolean }) {
  const t = useTranslations('author')
  const [starred, setStarred] = useState(initialStarred)
  const [pending, startTransition] = useTransition()
  const label = starred ? t('starRemove') : t('starAdd')

  return (
    <button
      type="button"
      disabled={pending}
      title={label}
      aria-label={label}
      aria-pressed={starred}
      onClick={() => {
        setStarred((v) => !v)
        startTransition(async () => {
          try { setStarred(await toggleAuthorFeatured(contentId)) } catch { setStarred((v) => !v) }
        })
      }}
      className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-black/5 disabled:opacity-60"
    >
      <svg width="20" height="20" viewBox="0 0 16 16" fill={starred ? '#F5C518' : 'none'} stroke={starred ? '#D4A90A' : '#6B5F58'} strokeWidth="1.1" strokeLinejoin="round">
        <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z" />
      </svg>
    </button>
  )
}
