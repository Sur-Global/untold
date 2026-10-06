'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { listAuthors, createAuthor, type AuthorOption } from '@/lib/actions/author'

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
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      try {
        const author = await createAuthor(newName)
        setAuthors((prev) =>
          [...prev, author].sort((a, b) => a.display_name.localeCompare(b.display_name)),
        )
        setValue(author.id)
        setNewName('')
        setCreating(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create author')
      }
    })
  }

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
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
            placeholder={t('authorNewPlaceholder')}
            className={fieldClass}
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="h-[50px] px-4 rounded-[10px] border border-primary/20 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isPending ? t('authorCreating') : t('authorCreateButton')}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setError(null) }}
            className="h-[50px] px-3 rounded-[10px] text-sm text-muted-foreground hover:bg-primary/5"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('authorNewButton')}
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
