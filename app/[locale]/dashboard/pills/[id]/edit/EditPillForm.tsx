'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updatePill } from '@/lib/actions/pill'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditPillFormProps {
  id: string
  status: string
  initialTitle: string
  initialBody: Record<string, unknown> | null
  initialAccentColor: string
  initialImageUrl: string
}

export function EditPillForm({
  id, status, initialTitle, initialBody, initialAccentColor, initialImageUrl,
}: EditPillFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(initialBody)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => updatePill(id, fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label>{t('accentColorLabel')}</Label>
        <div className="flex items-center gap-3">
          <input
            id="accent_color"
            name="accent_color"
            type="color"
            defaultValue={initialAccentColor || '#C45D3A'}
            className="w-10 h-10 rounded cursor-pointer border border-[rgba(139,69,19,0.2)]"
          />
          <span className="text-sm text-[#6B5F58]">Pick the pill accent color</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" type="url" defaultValue={initialImageUrl} placeholder={t('imageUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} />
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
