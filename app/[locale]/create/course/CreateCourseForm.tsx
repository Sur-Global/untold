'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createCourse } from '@/lib/actions/course'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FIELD_CLASS } from '@/components/ui/field-styles'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'

export function CreateCourseForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  // Which submit button was pressed (draft vs publish)
  const publishRef = useRef(false)
  // Mirrors publishRef for rendering (refs can't be read during render)
  const [publishing, setPublishing] = useState(false)
  const [declared, setDeclared] = useState(false)

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
      <LanguageAvailabilityFields />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className={FIELD_CLASS} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Input id="description" name="description" placeholder={t('descriptionPlaceholder')} className={FIELD_CLASS} />
      </div>

      <CoverImageInput name="cover_image_url" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('priceLabel')}</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue="0" placeholder={t('pricePlaceholder')} className={FIELD_CLASS} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t('currencyLabel')}</Label>
          <Input id="currency" name="currency" defaultValue="USD" maxLength={3} placeholder="USD" className={FIELD_CLASS} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">{t('durationLabel')}</Label>
        <Input id="duration" name="duration" placeholder={t('durationPlaceholder')} className={FIELD_CLASS} />
      </div>

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
          disabled={isPending || !declared}
          onClick={() => { publishRef.current = true; setPublishing(true) }}
          className="gradient-rust text-white border-0"
        >
          {isPending && publishing ? td('saving') : td('publish')}
        </Button>
      </div>
    </form>
  )
}
