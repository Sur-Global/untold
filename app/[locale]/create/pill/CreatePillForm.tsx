'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createPill } from '@/lib/actions/pill'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreatePillForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => createPill(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label>{t('accentColorLabel')}</Label>
        <div className="flex items-center gap-3">
          <input
            id="accent_color"
            name="accent_color"
            type="color"
            defaultValue="#C45D3A"
            className="w-10 h-10 rounded cursor-pointer border border-[rgba(139,69,19,0.2)]"
          />
          <span className="text-sm text-[#6B5F58]">Pick the pill accent color</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" type="url" placeholder={t('imageUrlPlaceholder')} />
      </div>

      <div className="space-y-2">
        <Label>Body *</Label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('bodyPlaceholder')}
        />
      </div>

      <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
        {isPending ? td('saving') : td('saveAsDraft')}
      </Button>
    </form>
  )
}
