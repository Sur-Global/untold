'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { listAuthors, type AuthorOption } from '@/lib/actions/author'
import { NewAuthorForm } from '@/components/content/NewAuthorForm'

interface AuthorPickerProps {
  /** Current author id (edit forms). Leave empty on create forms to default to "me". */
  defaultValue?: string
  onChange?: (authorId: string) => void
}

const fieldClass =
  'w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground'

/**
 * Admin/editor-only: choose who the content is attributed to, or create a new
 * author on the spot. Renders nothing for regular creators. Submits as a hidden
 * `author_id` field, so it works in both FormData-based and state-based forms.
 */
export function AuthorPicker({ defaultValue = '', onChange }: AuthorPickerProps) {
  const t = useTranslations('editor')
  const [canPick, setCanPick] = useState(false)
  const [authors, setAuthors] = useState<AuthorOption[]>([])
  const [value, setValue] = useState(defaultValue)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    listAuthors(defaultValue || undefined).then((res) => {
      if (cancelled) return
      setCanPick(res.canPick)
      setAuthors(res.authors)
      // Create forms: default to the signed-in editor
      setValue((v) => v || res.me || '')
    })
    return () => { cancelled = true }
  }, [])

  // Keep the parent informed once we know the initial value
  useEffect(() => { if (value) onChange?.(value) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!canPick) return null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">{t('authorPickerLabel')}</label>
      <p className="text-xs text-muted-foreground -mt-1">{t('authorPickerHint')}</p>
      <input type="hidden" name="author_id" value={value} />
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={fieldClass}
      >
        {authors.map((a) => (
          <option key={a.id} value={a.id}>{a.display_name}</option>
        ))}
      </select>

      {creating ? (
        <NewAuthorForm
          onCreated={(author) => {
            setAuthors((prev) =>
              [...prev, author].sort((x, y) => x.display_name.localeCompare(y.display_name)),
            )
            setValue(author.id)
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('authorNewButton')}
        </button>
      )}
    </div>
  )
}
