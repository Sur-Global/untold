'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createPodcast } from '@/lib/actions/podcast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FIELD_CLASS } from '@/components/ui/field-styles'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'
import { FeatureRequestField } from '@/components/content/FeatureRequestField'
import { PodcastOriginField } from '@/components/content/PodcastOriginField'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'
import { coverInputProps } from '@/lib/cover-formats'
import type { PodcastOrigin } from '@/lib/podcast-origin'

/** `canChooseOrigin`: admins and editors choose the type of podcast (and must, to publish); everyone else's is third-party */
export function CreatePodcastForm({ canChooseOrigin = false }: { canChooseOrigin?: boolean }) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  // Which submit button was pressed (draft vs publish)
  const publishRef = useRef(false)
  // Mirrors publishRef for rendering (refs can't be read during render)
  const [publishing, setPublishing] = useState(false)
  const [declared, setDeclared] = useState(false)
  const [origin, setOrigin] = useState<PodcastOrigin | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('publish', String(publishRef.current))
    startTransition(() => createPodcast(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <AuthorPicker />
      <ContentLanguageSelect />
      <LanguageAvailabilityFields />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className={FIELD_CLASS} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input id="embed_url" name="embed_url" type="url" placeholder={t('embedUrlPlaceholder')} required className={FIELD_CLASS} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} className={FIELD_CLASS} />
      </div>

      <CoverImageInput name="cover_image_url" label={t('coverPodcastLabel')} sizeHint={t('coverPodcastHint')} {...coverInputProps('podcast')} />

      <div className="space-y-2">
        <Label htmlFor="episode_number">{t('episodeNumberLabel')}</Label>
        <Input id="episode_number" name="episode_number" placeholder={t('episodeNumberPlaceholder')} className={FIELD_CLASS} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">{t('durationLabel')}</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} className={FIELD_CLASS} />
      </div>

      {canChooseOrigin && <PodcastOriginField onChange={setOrigin} />}

      <FeatureRequestField />

      <ResponsibilityDeclaration checked={declared} onChange={setDeclared} />

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          onClick={() => { publishRef.current = false; setPublishing(false) }}
        >
          {isPending && !publishing ? td('saving') : td('saveAsDraft')}
        </Button>
        <Button
          type="submit"
          disabled={isPending || !declared || (canChooseOrigin && !origin)}
          onClick={() => { publishRef.current = true; setPublishing(true) }}
          className="gradient-rust text-white border-0"
        >
          {isPending && publishing ? td('saving') : td('publish')}
        </Button>
      </div>
    </form>
  )
}
