'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { BlockNoteSchema } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { createAuthor, type AuthorOption } from '@/lib/actions/author'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { RichTextEditor, type EditorBlock } from '@/components/editor/RichTextEditorLazy'

// Only used to turn the bio's blocks into HTML on submit (same approach as EditProfileForm)
const htmlConverterSchema = withMultiColumn(BlockNoteSchema.create())

const fieldClass =
  'w-full h-[46px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground'
const labelClass = 'block text-xs font-semibold text-foreground mb-1'

interface Props {
  onCreated: (author: AuthorOption) => void
  onCancel: () => void
}

/**
 * Inline "new author" form shown inside AuthorPicker. It lives inside the content
 * form, so it uses no <form> of its own and swallows Enter in its text fields.
 */
export function NewAuthorForm({ onCreated, onCancel }: Props) {
  const t = useTranslations('editor')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bioBlocks, setBioBlocks] = useState<EditorBlock[] | null>(null)
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [bluesky, setBluesky] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [medium, setMedium] = useState('')
  const [customUrl, setCustomUrl] = useState('')

  const htmlConverter = useCreateBlockNote({ schema: htmlConverterSchema })

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      try {
        const bioHtml = bioBlocks ? htmlConverter.blocksToHTMLLossy(bioBlocks as any) : ''
        const author = await createAuthor({
          displayName: name, bioHtml, avatarUrl, location, website, email,
          bluesky, linkedin, instagram, medium, customUrl,
        })
        onCreated(author)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create author')
      }
    })
  }

  const text = (label: string, value: string, set: (v: string) => void, placeholder = '', type = 'text') => (
    <div>
      <label className={labelClass}>{label}</label>
      <input type={type} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={fieldClass} />
    </div>
  )

  return (
    <div
      className="space-y-4 rounded-[12px] border border-primary/20 bg-muted/20 p-4"
      onKeyDown={(e) => {
        // Enter in a text field must not submit the surrounding content form
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault()
      }}
    >
      <div>
        <label className={labelClass}>{t('authorNewPlaceholder')} *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          autoFocus
        />
      </div>

      <div>
        <label className={labelClass}>{t('authorPhotoLabel')}</label>
        <CoverImageInput name="new_author_avatar_url" uploadType="avatar" defaultValue={avatarUrl} onChange={setAvatarUrl} />
      </div>

      <div>
        <label className={labelClass}>{t('authorBioLabel')}</label>
        <RichTextEditor value={bioBlocks} onChange={setBioBlocks} placeholder={t('authorBioPlaceholder')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {text(t('authorLocationLabel'), location, setLocation, 'City, Country')}
        {text(t('authorWebsiteLabel'), website, setWebsite, 'https://…', 'url')}
      </div>
      {text(t('authorEmailLabel'), email, setEmail, 'name@example.com', 'email')}

      <div className="space-y-3">
        <p className={labelClass}>{t('authorLinksLabel')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {text('BlueSky', bluesky, setBluesky, 'https://bsky.app/profile/…', 'url')}
          {text('LinkedIn', linkedin, setLinkedin, 'https://linkedin.com/in/…', 'url')}
          {text('Instagram', instagram, setInstagram, 'https://instagram.com/…', 'url')}
          {text('Medium', medium, setMedium, 'https://medium.com/@…', 'url')}
        </div>
        {text(t('authorCustomLinkLabel'), customUrl, setCustomUrl, 'https://…', 'url')}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
          className="h-[46px] px-5 rounded-[10px] bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? t('authorCreating') : t('authorCreateButton')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-[46px] px-4 rounded-[10px] border border-primary/20 text-sm text-foreground hover:bg-primary/5"
        >
          {t('authorCancelButton')}
        </button>
      </div>
    </div>
  )
}
