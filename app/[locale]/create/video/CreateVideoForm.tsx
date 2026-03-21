'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createVideo } from '@/lib/actions/video'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateVideoForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => createVideo(new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embed_url">{t('embedUrlLabel')} *</Label>
        <Input id="embed_url" name="embed_url" type="url" placeholder={t('embedUrlPlaceholder')} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
        <Input id="thumbnail_url" name="thumbnail_url" type="url" placeholder={t('thumbnailUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} />
      </div>

      <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
