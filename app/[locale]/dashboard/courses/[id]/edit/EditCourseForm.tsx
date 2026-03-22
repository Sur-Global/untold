'use client'

import { useRef, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateCourse } from '@/lib/actions/course'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'

interface EditCourseFormProps {
  id: string
  status: string
  initialTitle: string
  initialDescription: string
  initialCoverImageUrl: string
  initialPrice: number
  initialCurrency: string
  initialDuration: string
}

export function EditCourseForm({
  id, status, initialTitle, initialDescription, initialCoverImageUrl,
  initialPrice, initialCurrency, initialDuration,
}: EditCourseFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    startTransition(() => updateCourse(id, new FormData(formRef.current!)))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={initialDescription} placeholder={t('descriptionPlaceholder')} />
      </div>

      <CoverImageInput name="cover_image_url" defaultValue={initialCoverImageUrl} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('priceLabel')}</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={String(initialPrice)} placeholder={t('pricePlaceholder')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t('currencyLabel')}</Label>
          <Input id="currency" name="currency" defaultValue={initialCurrency || 'USD'} maxLength={3} placeholder="USD" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input id="duration" name="duration" defaultValue={initialDuration} placeholder={t('durationPlaceholder')} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => publishContent(id, new FormData()))}>
            {td('publish')}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}>
            {td('unpublish')}
          </Button>
        )}

        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => { if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id)) }}>
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
