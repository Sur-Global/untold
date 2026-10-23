'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updatePodcast } from '@/lib/actions/podcast'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ViewContentLink } from '@/components/content/ViewContentLink'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'
import { coverInputProps } from '@/lib/cover-formats'

interface EditPodcastFormProps {
  id: string
  status: string
  initialAuthorId: string
  slug: string
  initialSingleLanguage?: boolean
  initialDeclared?: boolean
  initialTitle: string
  initialDescription: string
  initialEmbedUrl: string
  initialCoverImageUrl: string
  initialDuration: string
  initialEpisodeNumber: string
}

export function EditPodcastForm({
  id,
  status, initialAuthorId, slug, initialSingleLanguage = false, initialDeclared = false,
  initialTitle,
  initialDescription,
  initialEmbedUrl,
  initialCoverImageUrl,
  initialDuration,
  initialEpisodeNumber,
}: EditPodcastFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [declared, setDeclared] = useState(initialDeclared)
  const publishNow = () =>
    startTransition(async () => {
      const fd = new FormData()
      fd.set('responsibility_confirmed', String(declared))
      await publishContent(id, fd)
    })
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => updatePodcast(id, new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <AuthorPicker defaultValue={initialAuthorId} />
      <LanguageAvailabilityFields defaultSingle={initialSingleLanguage} />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialTitle}
          placeholder={t('titlePlaceholder')}
          required
          className="text-xl font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input
          id="embed_url"
          name="embed_url"
          type="url"
          defaultValue={initialEmbedUrl}
          placeholder={t('embedUrlPlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Input
          id="description"
          name="description"
          defaultValue={initialDescription}
          placeholder={t('descriptionPlaceholder')}
        />
      </div>

      <CoverImageInput name="cover_image_url" defaultValue={initialCoverImageUrl} label={t('coverPodcastLabel')} sizeHint={t('coverPodcastHint')} {...coverInputProps('podcast')} />

      <div className="space-y-2">
        <Label htmlFor="episode_number">{t('episodeNumberLabel')}</Label>
        <Input
          id="episode_number"
          name="episode_number"
          defaultValue={initialEpisodeNumber}
          placeholder={t('episodeNumberPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">{t('durationLabel')}</Label>
        <Input
          id="duration"
          name="duration"
          defaultValue={initialDuration}
          placeholder={t('durationPlaceholder')}
        />
      </div>

      {status === 'draft' && <ResponsibilityDeclaration checked={declared} onChange={setDeclared} />}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'published' && <ViewContentLink type="podcast" slug={slug} />}
        {status === 'draft' ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !declared}
            onClick={publishNow}
          >
            {td('publish')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}
          >
            {td('unpublish')}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => {
            if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id))
          }}
        >
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
