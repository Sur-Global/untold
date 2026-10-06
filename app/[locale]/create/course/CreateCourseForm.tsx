'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createCourse } from '@/lib/actions/course'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'

export function CreateCourseForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  // Which submit button was pressed (draft vs publish)
  const publishRef = useRef(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('publish', String(publishRef.current))
    startTransition(() => createCourse(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <AuthorPicker />
      <ContentLanguageSelect />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} />
      </div>

      <CoverImageInput name="cover_image_url" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('priceLabel')}</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue="0" placeholder={t('pricePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t('currencyLabel')}</Label>
          <Input id="currency" name="currency" defaultValue="USD" maxLength={3} placeholder="USD" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">{t('durationLabel')}</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          onClick={() => { publishRef.current = false }}
        >
          {isPending && !publishRef.current ? td('saving') : td('saveAsDraft')}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          onClick={() => { publishRef.current = true }}
          className="gradient-rust text-white border-0"
        >
          {isPending && publishRef.current ? td('saving') : td('publish')}
        </Button>
      </div>
    </form>
  )
}
